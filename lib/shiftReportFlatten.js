/**
 * Shift Reports flatten helpers — pure Node module for tests.
 * Keep behaviour in sync with the inline copy inside reportsPage() in server.js.
 */
'use strict';

var MAX_SESSION_MIN = 18 * 60; // align with compliance stale-open cap

function parseTs(v) {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') {
    if (!isFinite(v) || v <= 0) return 0;
    return v > 1e12 ? v : v > 1e10 ? v : v * 1000;
  }
  var n = Number(v);
  if (!isNaN(n) && n > 0) return n > 1e12 ? n : n > 1e10 ? n : n * 1000;
  var t = Date.parse(String(v));
  return isNaN(t) ? 0 : t;
}

function looksLikeSession(s) {
  if (!s || typeof s !== 'object' || Array.isArray(s)) return false;
  return !!(
    s.startTime ||
    s.shiftStartAt ||
    s.sessionStartedAt ||
    s.startTs ||
    s.loginTime ||
    s.endTime ||
    s.shiftEndAt ||
    s.endTs ||
    s.logoutTime ||
    s.finishTime ||
    s.workedMinutes != null ||
    s.totalMinutes != null ||
    s.status ||
    s.isActive != null
  );
}

function looksLikeDriverBucket(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  var vals = Object.values(v);
  if (!vals.length) return false;
  return vals.some(looksLikeSession);
}

function looksLikeCompanyBucket(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  var vals = Object.values(v);
  if (!vals.length) return false;
  // Company node: children are driver→session maps (not sessions themselves)
  var driverish = 0;
  var sessionish = 0;
  vals.forEach(function (child) {
    if (!child || typeof child !== 'object') return;
    if (looksLikeSession(child)) sessionish++;
    else if (looksLikeDriverBucket(child)) driverish++;
  });
  return driverish > 0 && sessionish === 0;
}

function isCompanyKey(k, companyId) {
  var s = String(k || '');
  if (!s) return false;
  if (companyId != null && String(companyId) !== '' && s === String(companyId)) return true;
  // Pure numeric keys are company ids in this schema (D001 is not pure numeric)
  return /^\d+$/.test(s);
}

function isLegacyDriverId(id) {
  return /^D\d+/i.test(String(id || '').trim());
}

function preferCanonId(v, fallbackKey, existingCanon) {
  if (!v || typeof v !== 'object') return String(fallbackKey || '');
  var candidates = [v.dispatcherId, v.id, v.driverId, v.DriverId, fallbackKey];
  for (var i = 0; i < candidates.length; i++) {
    var c = candidates[i];
    if (c != null && String(c).trim() !== '' && isLegacyDriverId(c)) {
      return String(c).trim();
    }
  }
  // Reuse a previously discovered D00x mapping for this uid/key
  if (existingCanon) {
    var aliases = [v.uid, v.Uid, fallbackKey, v.fleetKey].filter(Boolean).map(String);
    for (var a = 0; a < aliases.length; a++) {
      var prev = existingCanon[aliases[a]];
      if (prev && isLegacyDriverId(prev)) return prev;
    }
  }
  for (var j = 0; j < candidates.length; j++) {
    var c2 = candidates[j];
    if (c2 != null && String(c2).trim() !== '') return String(c2).trim();
  }
  return String(fallbackKey || '');
}

function buildDriverCanon(driversRoot, driversCid, companyId) {
  var canon = {};
  var names = {};
  var valid = {};

  function setCanon(alias, canonId, name) {
    if (alias == null || alias === '') return;
    var a = String(alias);
    if (isCompanyKey(a, companyId)) return;
    var c = String(canonId);
    if (!c || isCompanyKey(c, companyId)) return;
    // Never demote an existing legacy D00x mapping to a Firebase UID
    if (canon[a] && isLegacyDriverId(canon[a]) && !isLegacyDriverId(c)) return;
    canon[a] = c;
    if (name) {
      names[a] = name;
      names[c] = name;
    }
    if (isLegacyDriverId(c)) valid[c] = true;
    else valid[c] = true;
  }

  function ingest(key, d, fromCompanyScoped) {
    if (!d || typeof d !== 'object') return;
    if (isCompanyKey(key, companyId) && looksLikeCompanyBucket(d)) {
      Object.keys(d).forEach(function (childKey) {
        ingest(childKey, d[childKey], true);
      });
      return;
    }
    if (!fromCompanyScoped && d.companyId != null && companyId && String(d.companyId) !== String(companyId)) {
      return;
    }
    var name = [d.firstName || d.first_name || '', d.lastName || d.last_name || d.surname || '', d.name || '']
      .join(' ')
      .trim() || d.email || d.dispatcherId || '';
    if (!name && !d.id && !d.driverId && !d.dispatcherId && !d.uid) return;
    var canonId = preferCanonId(d, key, canon);
    if (!canonId || isCompanyKey(canonId, companyId)) return;
    setCanon(key, canonId, name || canonId);
    setCanon(d.uid, canonId, name || canonId);
    setCanon(d.Uid, canonId, name || canonId);
    setCanon(d.id, canonId, name || canonId);
    setCanon(d.driverId, canonId, name || canonId);
    setCanon(d.DriverId, canonId, name || canonId);
    setCanon(d.dispatcherId, canonId, name || canonId);
    setCanon(canonId, canonId, name || canonId);
  }

  if (driversCid && typeof driversCid === 'object') {
    Object.keys(driversCid).forEach(function (k) {
      ingest(k, driversCid[k], true);
    });
  }
  if (driversRoot && typeof driversRoot === 'object') {
    Object.keys(driversRoot).forEach(function (k) {
      ingest(k, driversRoot[k], false);
    });
  }

  return { canon: canon, names: names, valid: valid };
}

function sessionDurationMin(s, startTs, endTs) {
  // Prefer app-authored work totals. Important: workedMinutes:0 is meaningful
  // (duplicate end-log / zero work) — do NOT fall back to wall clock, which is
  // often inflated by reused shiftStartAt across many end writes.
  if (s && s.workedMinutes != null && s.workedMinutes !== '') {
    var wm = parseFloat(s.workedMinutes);
    return isFinite(wm) && wm > 0 ? Math.round(wm) : 0;
  }
  if (s && s.totalMinutes != null && s.totalMinutes !== '') {
    var tm = parseFloat(s.totalMinutes);
    return isFinite(tm) && tm > 0 ? Math.round(tm) : 0;
  }
  if (startTs && endTs && endTs > startTs) {
    var wall = Math.round((endTs - startTs) / 60000);
    // Absurd walls (stale/ghost closes stamped at the 18h cap) are unusable
    if (wall >= MAX_SESSION_MIN) return 0;
    return wall;
  }
  return 0;
}

/** Sum break minutes from session fields (mirrors Compliance). */
function extractBreakMin(s) {
  if (!s || typeof s !== 'object') return 0;
  var breakMin = 0;
  if (s.breaks && typeof s.breaks === 'object') {
    Object.values(s.breaks).forEach(function (b) {
      if (!b) return;
      var bm = parseFloat(b.breakMinutes || 0);
      if (bm > 0) {
        breakMin += bm;
        return;
      }
      var bs = parseTs(b.breakStart || b.start || b.startTime);
      var be = parseTs(b.breakEnd || b.end || b.endTime);
      if (bs && be && be > bs) breakMin += Math.round((be - bs) / 60000);
    });
  }
  breakMin += parseFloat(s.breakMinutes || s.breakMin || 0) || 0;
  return Math.max(0, Math.round(breakMin));
}

function filterSessionsByDateRange(sessions, fromTs, toTs) {
  return (sessions || []).filter(function (s) {
    var ts = s.startTs || s.endTs || s._ts || 0;
    if (!ts) return false;
    if (fromTs && ts < fromTs) return false;
    if (toTs && ts > toTs) return false;
    return true;
  });
}

function fmtDur(minutes) {
  if (minutes == null || minutes === '' || !isFinite(Number(minutes)) || Number(minutes) <= 0) return '—';
  var total = Math.round(Number(minutes));
  var h = Math.floor(total / 60);
  var m = total % 60;
  return h + 'h ' + (m < 10 ? '0' : '') + m + 'm';
}

/**
 * Calendar-day online/offline timeline from session rows (NOT NZTA 14h window).
 * Online minutes = end − start for each stint (never cumulative window workedMinutes).
 * Gaps show once ≥2 sessionStartedAt-stamped stints exist — legacy siblings no longer block.
 */
function buildDayTimeline(sessions) {
  var collapsed = collapseProgressiveSessions(sessions || []);
  var usable = [];
  collapsed.forEach(function (s) {
    if (!s || typeof s !== 'object') return;
    var start = Number(s._startTs || s.startTs || 0) || 0;
    var end = Number(s._endTs || s.endTs || 0) || 0;
    if (!start || !end || end <= start) return;
    var hasSessionStart = !!(s._hasSessionStart || s.sessionTs || s._sessionTs);
    // Prefer wall of this stint. Do NOT use workedMinutes — that is window-cumulative catch-up.
    var minutes = Math.round((end - start) / 60000);
    if (!isFinite(minutes) || minutes < 0) minutes = 0;
    usable.push({
      startTs: start,
      endTs: end,
      minutes: minutes,
      hasSessionStart: hasSessionStart,
    });
  });
  usable.sort(function (a, b) {
    if (a.startTs !== b.startTs) return a.startTs - b.startTs;
    return a.endTs - b.endTs;
  });

  if (!usable.length) {
    return {
      segments: [],
      spanStart: 0,
      spanEnd: 0,
      spanMin: 0,
      onlineMin: 0,
      offlineMin: 0,
      offlineKnown: false,
      onlinePct: null,
      gapsReliable: false,
    };
  }

  var sessionStamped = 0;
  usable.forEach(function (u) {
    if (u.hasSessionStart) sessionStamped++;
  });
  // ≥2 real session logins → gaps are trustworthy (legacy progressive rows may still sit alongside).
  var gapsReliable = sessionStamped >= 2;

  var segments = [];
  var onlineMin = 0;
  for (var i = 0; i < usable.length; i++) {
    var cur = usable[i];
    if (gapsReliable && i > 0) {
      var prev = usable[i - 1];
      var gapMin = Math.round((cur.startTs - prev.endTs) / 60000);
      if (gapMin > 0) {
        segments.push({
          type: 'offline',
          startTs: prev.endTs,
          endTs: cur.startTs,
          minutes: gapMin,
        });
      }
    }
    segments.push({
      type: 'online',
      startTs: cur.startTs,
      endTs: cur.endTs,
      minutes: cur.minutes,
    });
    onlineMin += cur.minutes;
  }

  var spanStart = usable[0].startTs;
  var spanEnd = 0;
  usable.forEach(function (s) {
    if (s.endTs > spanEnd) spanEnd = s.endTs;
  });
  var spanMin = Math.max(0, Math.round((spanEnd - spanStart) / 60000));
  var multi = usable.length >= 2;
  var offlineMin = 0;
  if (gapsReliable) {
    segments.forEach(function (seg) {
      if (seg.type === 'offline') offlineMin += seg.minutes;
    });
  }
  var onlinePct =
    gapsReliable && spanMin > 0
      ? Math.min(100, Math.round((100 * onlineMin) / spanMin))
      : !multi && spanMin > 0
        ? 100
        : null;
  if (!gapsReliable && !multi && spanMin > 0) onlinePct = 100;

  return {
    segments: segments,
    spanStart: spanStart,
    spanEnd: spanEnd,
    spanMin: spanMin,
    onlineMin: onlineMin,
    offlineMin: offlineMin,
    offlineKnown: gapsReliable && offlineMin > 0,
    onlinePct: onlinePct,
    gapsReliable: gapsReliable,
  };
}

/**
 * Collapse progressive End Shift snapshots that share a window (and optionally a session).
 * workedMinutes is cumulative within the NZTA window — take max, never sum siblings.
 */
function collapseProgressiveSessions(sessions) {
  var groups = {};
  (sessions || []).forEach(function (s) {
    if (!s || typeof s !== 'object') return;
    var windowTs =
      Number(s._windowTs || s.windowTs || s.shiftStartAt || 0) ||
      Number(s._startTs || s.startTs || 0) ||
      0;
    var sessionTs = Number(s._sessionTs || s.sessionTs || s.sessionStartedAt || 0) || 0;
    var hasSession = !!(sessionTs || s._hasSessionStart);
    var end = Number(s._endTs || s.endTs || 0) || 0;
    var minutes =
      s._sessionMin != null
        ? Number(s._sessionMin)
        : s.durationMin != null
          ? Number(s.durationMin)
          : 0;
    if (!isFinite(minutes) || minutes < 0) minutes = 0;
    var key =
      String(s.driverId || s._driverId || '') +
      '|' +
      String(windowTs || 'none') +
      '|' +
      (hasSession ? String(sessionTs) : 'legacy');
    if (!groups[key]) {
      groups[key] = {
        windowTs: windowTs,
        sessionTs: sessionTs,
        hasSessionStart: hasSession,
        endTs: end,
        minutes: Math.round(minutes),
        breakMin: Number(s._breakMin || s.breakMin || 0) || 0,
        driverId: s.driverId,
      };
    } else {
      var g = groups[key];
      if (end > g.endTs) g.endTs = end;
      if (Math.round(minutes) > g.minutes) g.minutes = Math.round(minutes);
      var br = Number(s._breakMin || s.breakMin || 0) || 0;
      if (br > g.breakMin) g.breakMin = br;
      if (hasSession && sessionTs && (!g.sessionTs || sessionTs < g.sessionTs)) {
        g.sessionTs = sessionTs;
      }
    }
  });

  return Object.keys(groups).map(function (k) {
    var g = groups[k];
    var startTs = g.hasSessionStart && g.sessionTs ? g.sessionTs : g.windowTs;
    return {
      startTs: startTs,
      endTs: g.endTs,
      durationMin: g.minutes,
      _startTs: startTs,
      _endTs: g.endTs,
      _sessionMin: g.minutes,
      _breakMin: g.breakMin,
      _windowTs: g.windowTs,
      _sessionTs: g.sessionTs,
      _hasSessionStart: g.hasSessionStart,
      driverId: g.driverId,
    };
  });
}

/** Sum work minutes after collapsing progressive window snapshots. */
function sumCollapsedWorkMin(sessions) {
  return collapseProgressiveSessions(sessions).reduce(function (a, s) {
    return a + (s._sessionMin || s.durationMin || 0);
  }, 0);
}

/**
 * Roll up session rows by day | week | month.
 * Week starts Monday (local Date arithmetic; display label uses NZ-friendly formatting from callers).
 * When opts.perDriver is true (default for payroll), each row is one driver × period.
 */
function groupSessionsByPeriod(sessions, mode, opts) {
  opts = opts || {};
  var tz = opts.timeZone || 'Pacific/Auckland';
  var perDriver = opts.perDriver !== false;
  var grouped = {};

  function dayLabel(ts) {
    return new Date(ts).toLocaleDateString('en-NZ', {
      timeZone: tz,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
  function weekStartLabel(ts) {
    // Derive Monday in NZ calendar via en-NZ parts then walk back
    var parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
    }).formatToParts(new Date(ts));
    var y, m, d, wd;
    parts.forEach(function (p) {
      if (p.type === 'year') y = +p.value;
      if (p.type === 'month') m = +p.value;
      if (p.type === 'day') d = +p.value;
      if (p.type === 'weekday') wd = p.value;
    });
    var utc = Date.UTC(y, m - 1, d, 12, 0, 0);
    var map = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
    var offset = map[wd] != null ? map[wd] : 0;
    var mon = new Date(utc - offset * 86400000);
    return mon.toLocaleDateString('en-NZ', {
      timeZone: 'UTC',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
  function monthLabel(ts) {
    return new Date(ts).toLocaleDateString('en-NZ', {
      timeZone: tz,
      month: 'short',
      year: 'numeric',
    });
  }

  (sessions || []).forEach(function (r) {
    var ts = r.startTs || r.endTs || r._ts || 0;
    var period =
      mode === 'month'
        ? monthLabel(ts)
        : mode === 'week'
          ? weekStartLabel(ts)
          : dayLabel(ts);
    var did = r.driverId || '—';
    var key = perDriver ? did + '|' + period : period;
    if (!grouped[key]) {
      grouped[key] = {
        groupKey: period,
        driverId: did,
        driverName: r.driverName || did,
        sessions: 0,
        workMin: 0,
        breakMin: 0,
        drivers: [],
        _drvSet: {},
        _ts: 0,
      };
    }
    var g = grouped[key];
    g.sessions++;
    g.workMin += r.durationMin != null ? r.durationMin : r._sessionMin || 0;
    g.breakMin += r.breakMin != null ? r.breakMin : r._breakMin || 0;
    if (did && !g._drvSet[did]) {
      g._drvSet[did] = true;
      g.drivers.push(r.driverName || did);
    }
    if (r.driverName) g.driverName = r.driverName;
    if (ts > g._ts) g._ts = ts;
  });

  return Object.values(grouped)
    .sort(function (a, b) {
      if (b._ts !== a._ts) return b._ts - a._ts;
      return String(a.driverName || '').localeCompare(String(b.driverName || ''));
    })
    .map(function (g) {
      var prefix = mode === 'week' ? 'Week of ' : mode === 'month' ? '' : '';
      return {
        groupKey: prefix + g.groupKey,
        driverId: g.driverId,
        driverName: g.driverName,
        drivers:
          g.drivers.slice(0, 3).join(', ') +
          (g.drivers.length > 3 ? ' +' + (g.drivers.length - 3) + ' more' : ''),
        driverCount: g.drivers.length,
        sessions: g.sessions,
        workMin: g.workMin,
        breakMin: g.breakMin,
        totalHrs: fmtDur(g.workMin),
        totalBreak: fmtDur(g.breakMin),
        _ts: g._ts,
      };
    });
}

/** Period stats from filtered session rows (not lifetime driver totals). */
function sumFilteredPeriodTotals(rows) {
  var workMin = 0;
  var breakMin = 0;
  var drivers = {};
  (rows || []).forEach(function (r) {
    workMin += r.durationMin != null ? r.durationMin : r._sessionMin || 0;
    breakMin += r.breakMin != null ? r.breakMin : r._breakMin || 0;
    if (r.driverId) drivers[r.driverId] = true;
  });
  return {
    sessions: (rows || []).length,
    drivers: Object.keys(drivers).length,
    workMin: workMin,
    breakMin: breakMin,
    workHours: +(workMin / 60).toFixed(1),
    breakHours: +(breakMin / 60).toFixed(1),
  };
}

function resolveDriverId(rawId, canonMap, companyId) {
  if (rawId == null || rawId === '' || rawId === '0') return null;
  var id = String(rawId);
  if (isCompanyKey(id, companyId)) return null;
  if (canonMap && canonMap[id]) return canonMap[id];
  return id;
}

/**
 * Flatten shift log nodes into per-driver session rows (pre-UI).
 * @param {object[]} logsArr raw nodes (shiftLogs root, shiftLogs/cid, attendance, …)
 * @param {object} opts
 * @param {string} [opts.companyId]
 * @param {object} [opts.canonMap] alias → canon driver id
 * @param {object} [opts.names] id → display name
 * @param {object} [opts.validIds] canon ids that belong to the company (if set, drop others)
 * @param {object} [opts.lastShiftData]
 */
function flattenShiftLogNodes(logsArr, opts) {
  opts = opts || {};
  var companyId = opts.companyId != null ? String(opts.companyId) : '';
  var canonMap = opts.canonMap || {};
  var names = opts.names || {};
  var validIds = opts.validIds || null;
  var lastShiftData = opts.lastShiftData || null;

  var byDriver = {};

  function ensure(id) {
    if (!byDriver[id]) byDriver[id] = { sessions: [], totalMinutes: 0 };
    return byDriver[id];
  }

  function addSession(rawDriverKey, vehicleId, windowTs, endTs, sessionObj, sessionTs) {
    var driverKey = resolveDriverId(rawDriverKey, canonMap, companyId);
    if (!driverKey) return;
    if (validIds && !validIds[driverKey]) return;
    var hasSessionStart = !!(sessionTs && sessionTs > 0);
    // Display/timeline start: real session login when present; else window open (legacy).
    var startTs = hasSessionStart ? sessionTs : windowTs || 0;
    var dur = sessionDurationMin(sessionObj || {}, startTs, endTs);
    var brk = extractBreakMin(sessionObj || {});
    var loggedAt = 0;
    if (sessionObj) {
      var la = sessionObj.loggedAt || sessionObj.LoggedAt;
      if (la != null && la !== '') {
        if (typeof la === 'number') loggedAt = la > 1e12 ? la : la > 1e10 ? la : la * 1000;
        else {
          var parsed = Date.parse(String(la));
          loggedAt = isNaN(parsed) ? 0 : parsed;
        }
      }
    }
    ensure(driverKey).sessions.push({
      startTs: startTs || 0,
      endTs: endTs || 0,
      loggedAt: loggedAt || 0,
      durationMin: dur,
      breakMin: brk,
      vehicleId: vehicleId || '—',
      sourceKey: String(rawDriverKey),
      activityTs: endTs || loggedAt || startTs || 0,
      windowTs: windowTs || 0,
      sessionTs: hasSessionStart ? sessionTs : 0,
      hasSessionStart: hasSessionStart,
    });
    if (brk > 0) {
      ensure(driverKey).totalBreakMinutes = (ensure(driverKey).totalBreakMinutes || 0) + brk;
    }
  }

  function ingestDriverSessions(driverKey, sessions) {
    if (!sessions || typeof sessions !== 'object') return;
    Object.keys(sessions).forEach(function (sk) {
      var s = sessions[sk];
      if (!looksLikeSession(s)) return;
      // shiftStartAt = NZTA window open; sessionStartedAt = this online stint.
      var windowTs = parseTs(s.shiftStartAt || s.startTime || s.start || s.StartTime || s.startTs);
      var sessionTs = parseTs(s.sessionStartedAt);
      // Never treat legacy loginTime as session unless sessionStartedAt exists —
      // older rows reused window start as "login".
      var end = parseTs(
        s.endTime || s.logoutTime || s.end || s.EndTime || s.logout || s.finishTime || s.shiftEndAt || s.endTs
      );
      var vid = s.vehicleId || s.VehicleId || s.vehicle || '—';
      addSession(driverKey, vid, windowTs, end, s, sessionTs);
    });
  }

  function ingestNode(logData) {
    if (!logData || typeof logData !== 'object') return;
    Object.keys(logData).forEach(function (k1) {
      var v1 = logData[k1];
      if (!v1 || typeof v1 !== 'object') return;

      // Root (or mistaken) company bucket: recurse into drivers — never treat cid as driverId
      if (isCompanyKey(k1, companyId) || looksLikeCompanyBucket(v1)) {
        if (looksLikeCompanyBucket(v1) || isCompanyKey(k1, companyId)) {
          Object.keys(v1).forEach(function (driverKey) {
            ingestDriverSessions(driverKey, v1[driverKey]);
          });
          return;
        }
      }

      if (looksLikeDriverBucket(v1)) {
        ingestDriverSessions(k1, v1);
        return;
      }

      // Flat session record
      if (looksLikeSession(v1)) {
        var did = v1.driverId || v1.DriverId || v1.driver || k1;
        var windowTs = parseTs(v1.shiftStartAt || v1.startTime || v1.start || v1.StartTime || v1.startTs);
        var sessionTs = parseTs(v1.sessionStartedAt);
        var end = parseTs(v1.endTime || v1.logoutTime || v1.end || v1.EndTime || v1.finishTime || v1.shiftEndAt || v1.endTs);
        var vid = v1.vehicleId || v1.VehicleId || '—';
        addSession(did, vid, windowTs, end, v1, sessionTs);
      }
    });
  }

  (logsArr || []).forEach(ingestNode);

  if (lastShiftData && typeof lastShiftData === 'object') {
    Object.keys(lastShiftData).forEach(function (id) {
      if (isCompanyKey(id, companyId) || id === '0') return;
      var resolved = resolveDriverId(id, canonMap, companyId);
      if (!resolved) return;
      if (validIds && !validIds[resolved]) return;
      if (byDriver[resolved] && byDriver[resolved].sessions.length) return;
      var endTs = parseTs(lastShiftData[id]);
      if (!endTs) return;
      addSession(resolved, '—', 0, endTs, {}, 0);
    });
  }

  // Progressive End Shift rows share a window and cumulative workedMinutes —
  // never sum siblings; take max per window/session.
  Object.keys(byDriver).forEach(function (id) {
    var d = byDriver[id];
    d.totalMinutes = sumCollapsedWorkMin(
      (d.sessions || []).map(function (s) {
        return {
          driverId: id,
          _windowTs: s.windowTs,
          _sessionTs: s.sessionTs,
          _hasSessionStart: s.hasSessionStart,
          _startTs: s.startTs,
          _endTs: s.endTs,
          _sessionMin: s.durationMin,
          _breakMin: s.breakMin,
        };
      })
    );
  });

  return byDriver;
}

function summarizeDrivers(byDriver) {
  return Object.keys(byDriver)
    .sort()
    .map(function (k) {
      return {
        driverId: k,
        sessions: byDriver[k].sessions.length,
        totalHours: +(byDriver[k].totalMinutes / 60).toFixed(1),
      };
    });
}

/**
 * Driver Ops hours — same flatten + workedMinutes + progressive collapse as Shift Reports.
 * Returns { byDriver: { [canonId]: { workMinutes, breakMinutes } }, canon, names }.
 */
function aggregateDriverShiftMinutes(opts) {
  opts = opts || {};
  var companyId = opts.companyId != null ? String(opts.companyId) : '';
  var fromMs = Number(opts.fromMs) || 0;
  var toMs = Number(opts.toMs) || Number.MAX_SAFE_INTEGER;
  var built = buildDriverCanon(opts.driversRoot, opts.driversCid, companyId);
  var logsArr = [];
  if (opts.shiftLogs) logsArr.push(opts.shiftLogs);
  if (opts.attendance) logsArr.push(opts.attendance);
  if (opts.driverSessions) logsArr.push(opts.driverSessions);
  if (Array.isArray(opts.logsArr)) logsArr = logsArr.concat(opts.logsArr);

  var byDriver = flattenShiftLogNodes(logsArr, {
    companyId: companyId,
    canonMap: built.canon,
    validIds: Object.keys(built.valid || {}).length ? built.valid : null,
    names: built.names,
    lastShiftData: opts.lastShiftData || null,
  });

  var out = {};
  Object.keys(byDriver).forEach(function (did) {
    var sessions = byDriver[did].sessions || [];
    var filtered = sessions.filter(function (s) {
      var st = Number(s.startTs) || 0;
      var en = Number(s.endTs) || 0;
      var act = Number(s.activityTs) || en || st || 0;
      if (st && en) return st <= toMs && en >= fromMs;
      if (!act) return false;
      return act >= fromMs && act <= toMs;
    });
    var mapped = filtered.map(function (s) {
      return {
        driverId: did,
        _windowTs: s.windowTs,
        _sessionTs: s.sessionTs,
        _hasSessionStart: s.hasSessionStart,
        _startTs: s.startTs,
        _endTs: s.endTs,
        _sessionMin: s.durationMin,
        _breakMin: s.breakMin,
        durationMin: s.durationMin,
        breakMin: s.breakMin,
      };
    });
    var collapsed = collapseProgressiveSessions(mapped);
    var work = 0;
    var brk = 0;
    collapsed.forEach(function (s) {
      work += Number(s._sessionMin || s.durationMin || 0) || 0;
      brk += Number(s._breakMin || s.breakMin || 0) || 0;
    });
    out[did] = { workMinutes: Math.round(work), breakMinutes: Math.round(brk) };
  });

  return { byDriver: out, canon: built.canon, names: built.names, valid: built.valid };
}

module.exports = {
  MAX_SESSION_MIN: MAX_SESSION_MIN,
  parseTs: parseTs,
  looksLikeSession: looksLikeSession,
  looksLikeDriverBucket: looksLikeDriverBucket,
  looksLikeCompanyBucket: looksLikeCompanyBucket,
  isCompanyKey: isCompanyKey,
  preferCanonId: preferCanonId,
  buildDriverCanon: buildDriverCanon,
  sessionDurationMin: sessionDurationMin,
  extractBreakMin: extractBreakMin,
  filterSessionsByDateRange: filterSessionsByDateRange,
  fmtDur: fmtDur,
  buildDayTimeline: buildDayTimeline,
  collapseProgressiveSessions: collapseProgressiveSessions,
  sumCollapsedWorkMin: sumCollapsedWorkMin,
  groupSessionsByPeriod: groupSessionsByPeriod,
  sumFilteredPeriodTotals: sumFilteredPeriodTotals,
  resolveDriverId: resolveDriverId,
  flattenShiftLogNodes: flattenShiftLogNodes,
  summarizeDrivers: summarizeDrivers,
  aggregateDriverShiftMinutes: aggregateDriverShiftMinutes,
};
