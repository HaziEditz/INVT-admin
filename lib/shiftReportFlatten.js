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

  function addSession(rawDriverKey, vehicleId, startTs, endTs, sessionObj) {
    var driverKey = resolveDriverId(rawDriverKey, canonMap, companyId);
    if (!driverKey) return;
    if (validIds && !validIds[driverKey]) return;
    var dur = sessionDurationMin(sessionObj || {}, startTs, endTs);
    ensure(driverKey).sessions.push({
      startTs: startTs || 0,
      endTs: endTs || 0,
      durationMin: dur,
      vehicleId: vehicleId || '—',
      sourceKey: String(rawDriverKey),
    });
    if (dur > 0) ensure(driverKey).totalMinutes += dur;
  }

  function ingestDriverSessions(driverKey, sessions) {
    if (!sessions || typeof sessions !== 'object') return;
    Object.keys(sessions).forEach(function (sk) {
      var s = sessions[sk];
      if (!looksLikeSession(s)) return;
      var start = parseTs(
        s.startTime || s.loginTime || s.start || s.StartTime || s.login || s.shiftStartAt || s.startTs
      );
      var end = parseTs(
        s.endTime || s.logoutTime || s.end || s.EndTime || s.logout || s.finishTime || s.shiftEndAt || s.endTs
      );
      var vid = s.vehicleId || s.VehicleId || s.vehicle || '—';
      addSession(driverKey, vid, start, end, s);
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
        var start = parseTs(v1.startTime || v1.loginTime || v1.start || v1.StartTime || v1.shiftStartAt || v1.startTs);
        var end = parseTs(v1.endTime || v1.logoutTime || v1.end || v1.EndTime || v1.finishTime || v1.shiftEndAt || v1.endTs);
        var vid = v1.vehicleId || v1.VehicleId || '—';
        addSession(did, vid, start, end, v1);
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
      addSession(resolved, '—', 0, endTs, {});
    });
  }

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
  resolveDriverId: resolveDriverId,
  flattenShiftLogNodes: flattenShiftLogNodes,
  summarizeDrivers: summarizeDrivers,
};
