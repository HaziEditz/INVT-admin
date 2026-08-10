/**
 * Shift Reports flatten — identity merge, company-id rejection, workedMinutes.
 * Run twice before push: node --test tests/shift-report-flatten.test.cjs
 */
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  looksLikeCompanyBucket,
  isCompanyKey,
  buildDriverCanon,
  flattenShiftLogNodes,
  summarizeDrivers,
  sessionDurationMin,
  extractBreakMin,
  filterSessionsByDateRange,
  groupSessionsByPeriod,
  sumFilteredPeriodTotals,
} = require('../lib/shiftReportFlatten.js');

const TEMP = process.env.TEMP || process.env.TMPDIR || '/tmp';
const CID = '860869';

function loadTemp(name) {
  const p = path.join(TEMP, name);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8')).data;
  } catch {
    return null;
  }
}

describe('company bucket detection', () => {
  it('treats shiftLogs root[860869] as company bucket, not a driver', () => {
    const root = loadTemp('slroot.json');
    assert.ok(root, 'need cached slroot.json from live probe');
    assert.equal(isCompanyKey('860869', CID), true);
    assert.equal(isCompanyKey('D001', CID), false);
    assert.equal(looksLikeCompanyBucket(root['860869']), true);
    assert.equal(looksLikeCompanyBucket(root['860869']['D001']), false);
  });
});

describe('flatten with live 860869 fixtures', () => {
  const root = loadTemp('slroot.json');
  const cidNode = loadTemp('sl860.json');
  const drvRoot = loadTemp('drvroot.json');
  const drvCid = loadTemp('drv860869.json');

  it('builds canon so Firebase UIDs map to D001/D002', () => {
    assert.ok(drvCid && drvRoot, 'need cached driver fixtures');
    const { canon, valid } = buildDriverCanon(drvRoot, drvCid, CID);
    assert.equal(canon['IRknGEQh32WYLz2MTyDFw1lUL052'], 'D001');
    assert.equal(canon['RKUXnwU1cRe1r59qat8fTAWbFzz2'], 'D002');
    assert.equal(canon['D001'], 'D001');
    assert.equal(canon['D002'], 'D002');
    assert.equal(valid['D001'], true);
    assert.equal(valid['D002'], true);
    assert.equal(canon['860869'], undefined);
    assert.equal(valid['860869'], undefined);
  });

  it('never emits company id 860869 as a driver, even when root is included without digit-skip', () => {
    assert.ok(root && cidNode && drvCid, 'need cached shift+driver fixtures');
    const { canon, names, valid } = buildDriverCanon(drvRoot, drvCid, CID);
    const byDriver = flattenShiftLogNodes([root, cidNode], {
      companyId: CID,
      canonMap: canon,
      names,
      validIds: valid,
    });
    const summary = summarizeDrivers(byDriver);
    assert.deepEqual(
      summary.map((s) => s.driverId).sort(),
      ['D001', 'D002']
    );
    assert.equal(byDriver['860869'], undefined);
    assert.equal(byDriver['IRknGEQh32WYLz2MTyDFw1lUL052'], undefined);
    assert.equal(byDriver['RKUXnwU1cRe1r59qat8fTAWbFzz2'], undefined);
  });

  it('uses workedMinutes + window collapse so Abdullah is ~102h not wall-clock', () => {
    assert.ok(cidNode && drvCid, 'need fixtures');
    const { canon, valid } = buildDriverCanon(drvRoot, drvCid, CID);
    const byDriver = flattenShiftLogNodes([cidNode], {
      companyId: CID,
      canonMap: canon,
      validIds: valid,
    });
    const hrs = byDriver['D001'].totalMinutes / 60;
    // Progressive End Shift snapshots share shiftStartAt — collapse to max wm/window.
    // Live post-dedupe ≈102h; must never be wall-clock lifetime (~46773h).
    assert.ok(hrs > 90 && hrs < 130, 'expected ~102h after window collapse, got ' + hrs);
    assert.ok(hrs < 1000, 'must not use inflated wall-clock lifetime (~46773h), got ' + hrs);
  });
});

describe('sessionDurationMin', () => {
  it('prefers workedMinutes over wall clock', () => {
    const start = 1_000_000;
    const end = start + 10 * 60 * 60 * 1000; // 10h wall
    assert.equal(sessionDurationMin({ workedMinutes: 25 }, start, end), 25);
  });

  it('rejects absurd wall clock instead of inventing 18h credits', () => {
    const start = 1_000_000;
    const end = start + 100 * 60 * 60 * 1000;
    assert.equal(sessionDurationMin({}, start, end), 0);
    // Exact 18h ghost-close stamp
    assert.equal(sessionDurationMin({}, start, start + 18 * 60 * 60 * 1000), 0);
  });

  it('uses short wall clock when workedMinutes absent', () => {
    const start = 1_000_000;
    const end = start + 45 * 60 * 1000;
    assert.equal(sessionDurationMin({}, start, end), 45);
  });

  it('treats explicit workedMinutes:0 as zero (not wall fallback)', () => {
    const start = 1_000_000;
    const end = start + 10 * 60 * 60 * 1000;
    assert.equal(sessionDurationMin({ workedMinutes: 0 }, start, end), 0);
  });
});

describe('unit: phantom company driver without guards', () => {
  it('documents the old bug: root company key becomes a 3-session phantom driver', () => {
    const root = {
      860869: {
        D001: { s1: { startTime: 1, endTime: 2 } },
        UID1: { s1: { shiftStartAt: 1, shiftEndAt: 2, workedMinutes: 5 } },
        UID2: { s1: { shiftStartAt: 1, shiftEndAt: 2, workedMinutes: 5 } },
      },
    };
    // Old behaviour approximated: treat top key as driver, children as sessions
    const oldDrivers = Object.keys(root);
    assert.deepEqual(oldDrivers, ['860869']);
    assert.equal(Object.keys(root['860869']).length, 3);

    const { canon, valid } = buildDriverCanon(
      null,
      {
        D001: { id: 'D001', name: 'A', uid: 'UID1' },
        D002: { id: 'D002', name: 'B', uid: 'UID2' },
      },
      '860869'
    );
    // Map UIDs
    canon.UID1 = 'D001';
    canon.UID2 = 'D002';
    valid.D001 = true;
    valid.D002 = true;

    const byDriver = flattenShiftLogNodes([root], {
      companyId: '860869',
      canonMap: canon,
      validIds: valid,
    });
    assert.equal(byDriver['860869'], undefined);
    assert.ok(byDriver['D001']);
    assert.ok(byDriver['D002']);
  });
});

describe('extractBreakMin', () => {
  it('sums breakMinutes, breakMin, and breaks map', () => {
    assert.equal(extractBreakMin({ breakMinutes: 12 }), 12);
    // top-level breakMinutes/breakMin are OR'd (same as Compliance) — not double-counted
    assert.equal(extractBreakMin({ breakMin: 5, breakMinutes: 10 }), 10);
    assert.equal(extractBreakMin({ breakMin: 5 }), 5);
    assert.equal(
      extractBreakMin({
        breaks: {
          a: { breakMinutes: 8 },
          b: {
            breakStart: 1_700_000_000_000,
            breakEnd: 1_700_000_000_000 + 15 * 60 * 1000,
          },
        },
      }),
      23
    );
  });
});

describe('period totals with date range (Abdullah/Mustafa live fixtures)', () => {
  const cidNode = loadTemp('sl860.json');
  const drvRoot = loadTemp('drvroot.json');
  const drvCid = loadTemp('drv860869.json');

  it('filters sessions to range and sums work+break (not lifetime wall totals)', () => {
    assert.ok(cidNode && drvCid, 'need fixtures');
    const { canon, valid } = buildDriverCanon(drvRoot, drvCid, CID);
    const byDriver = flattenShiftLogNodes([cidNode], {
      companyId: CID,
      canonMap: canon,
      validIds: valid,
    });

    // Flatten to row-like objects
    const allRows = [];
    for (const [driverId, d] of Object.entries(byDriver)) {
      for (const s of d.sessions) {
        allRows.push({
          driverId,
          driverName: driverId === 'D001' ? 'Abdullah Gul' : 'Mustafa Tekinkaya',
          startTs: s.startTs,
          endTs: s.endTs,
          _ts: s.startTs || s.endTs,
          durationMin: s.durationMin,
          _sessionMin: s.durationMin,
          breakMin: s.breakMin || 0,
          _breakMin: s.breakMin || 0,
        });
      }
    }

    assert.ok(allRows.some((r) => r.driverId === 'D001'));
    assert.ok(allRows.some((r) => r.driverId === 'D002'));

    // Inject known breaks for period math (live data currently all 0)
    const withBreaks = allRows.map((r, i) =>
      i < 3 ? { ...r, breakMin: 10, _breakMin: 10 } : r
    );

    const fromTs = Math.min(...withBreaks.map((r) => r._ts).filter(Boolean));
    const toTs = fromTs + 14 * 86400000; // two weeks from earliest
    const filtered = filterSessionsByDateRange(withBreaks, fromTs, toTs);
    assert.ok(filtered.length > 0, 'expected some sessions in first 14 days');
    assert.ok(filtered.length < withBreaks.length || withBreaks.every((r) => r._ts >= fromTs && r._ts <= toTs));

    const totals = sumFilteredPeriodTotals(filtered);
    const naiveLifetime = filtered.reduce((a, r) => a + (r._sessionMin || 0), 0);
    assert.equal(totals.workMin, naiveLifetime);
    assert.equal(totals.breakMin, filtered.reduce((a, r) => a + (r._breakMin || 0), 0));
    // Must not equal the old ~46773h wall-clock lifetime
    assert.ok(totals.workHours < 2000, 'period work hours must be realistic, got ' + totals.workHours);

    const byDay = groupSessionsByPeriod(filtered, 'day');
    const byWeek = groupSessionsByPeriod(filtered, 'week');
    const byMonth = groupSessionsByPeriod(filtered, 'month');
    assert.ok(byDay.length >= 1);
    assert.ok(byWeek.length >= 1);
    assert.ok(byMonth.length >= 1);
    const dayWork = byDay.reduce((a, g) => a + g.workMin, 0);
    const dayBreak = byDay.reduce((a, g) => a + g.breakMin, 0);
    assert.equal(dayWork, totals.workMin);
    assert.equal(dayBreak, totals.breakMin);
    assert.equal(
      byWeek.reduce((a, g) => a + g.workMin, 0),
      totals.workMin
    );
    assert.equal(
      byMonth.reduce((a, g) => a + g.workMin, 0),
      totals.workMin
    );
  });

  it('By Day per-driver sums multi-login sessions into one driver-day total', () => {
    const dayTs = Date.parse('2026-08-11T14:00:00+12:00');
    const rows = [
      { driverId: 'D001', driverName: 'Abdullah Gul', _ts: dayTs, _sessionMin: 4, durationMin: 4, breakMin: 0, _breakMin: 0 },
      { driverId: 'D001', driverName: 'Abdullah Gul', _ts: dayTs + 3600000, _sessionMin: 90, durationMin: 90, breakMin: 15, _breakMin: 15 },
      { driverId: 'D001', driverName: 'Abdullah Gul', _ts: dayTs + 7200000, _sessionMin: 120, durationMin: 120, breakMin: 0, _breakMin: 0 },
      { driverId: 'D002', driverName: 'Mustafa', _ts: dayTs, _sessionMin: 30, durationMin: 30, breakMin: 0, _breakMin: 0 },
    ];
    const byDay = groupSessionsByPeriod(rows, 'day', { perDriver: true, timeZone: 'Pacific/Auckland' });
    assert.equal(byDay.length, 2, 'one row per driver for the day');
    const d001 = byDay.find((g) => g.driverId === 'D001');
    const d002 = byDay.find((g) => g.driverId === 'D002');
    assert.ok(d001);
    assert.ok(d002);
    assert.equal(d001.sessions, 3);
    assert.equal(d001.workMin, 214); // 4+90+120
    assert.equal(d001.breakMin, 15);
    assert.equal(d001.totalHrs, '3h 34m');
    assert.equal(d002.sessions, 1);
    assert.equal(d002.workMin, 30);

    const rangeTotals = sumFilteredPeriodTotals(rows);
    assert.equal(rangeTotals.workMin, 244);
    assert.equal(rangeTotals.workHours, 4.1);
    assert.equal(rangeTotals.sessions, 4);
  });

  it('fmtDur uses zero-padded h/m (not decimal hours)', () => {
    const { fmtDur } = require('../lib/shiftReportFlatten.js');
    assert.equal(fmtDur(4), '0h 04m');
    assert.equal(fmtDur(60), '1h 00m');
    assert.equal(fmtDur(125), '2h 05m');
    assert.equal(fmtDur(0), '—');
    assert.equal(fmtDur(null), '—');
  });

  it('buildDayTimeline: legacy progressive ends (same window) do not invent gaps', () => {
    const { buildDayTimeline, collapseProgressiveSessions, sumCollapsedWorkMin } = require('../lib/shiftReportFlatten.js');
    const windowOpen = Date.parse('2026-08-11T02:12:00+12:00');
    const e1 = Date.parse('2026-08-11T02:16:00+12:00');
    const e2 = Date.parse('2026-08-11T03:27:00+12:00');
    const e3 = Date.parse('2026-08-11T03:31:00+12:00');
    const rows = [
      { driverId: 'D001', _windowTs: windowOpen, _startTs: windowOpen, _endTs: e1, _sessionMin: 4, _hasSessionStart: false },
      { driverId: 'D001', _windowTs: windowOpen, _startTs: windowOpen, _endTs: e2, _sessionMin: 75, _hasSessionStart: false },
      { driverId: 'D001', _windowTs: windowOpen, _startTs: windowOpen, _endTs: e3, _sessionMin: 79, _hasSessionStart: false },
    ];
    assert.equal(collapseProgressiveSessions(rows).length, 1);
    assert.equal(sumCollapsedWorkMin(rows), 79);
    const tl = buildDayTimeline(rows);
    assert.equal(tl.gapsReliable, false);
    assert.equal(tl.offlineKnown, false);
    assert.equal(tl.onlineMin, 79);
    assert.equal(tl.segments.filter((x) => x.type === 'offline').length, 0);
    assert.equal(tl.segments.filter((x) => x.type === 'online').length, 1);
  });

  it('buildDayTimeline: multi-session day with sessionStartedAt shows real gaps', () => {
    const { buildDayTimeline, fmtDur } = require('../lib/shiftReportFlatten.js');
    // 02:12–03:31 (79m), gap, 08:05–10:20 (135m), gap, 12:00–14:31 (151m)
    const s1 = Date.parse('2026-08-11T02:12:00+12:00');
    const e1 = Date.parse('2026-08-11T03:31:00+12:00');
    const s2 = Date.parse('2026-08-11T08:05:00+12:00');
    const e2 = Date.parse('2026-08-11T10:20:00+12:00');
    const s3 = Date.parse('2026-08-11T12:00:00+12:00');
    const e3 = Date.parse('2026-08-11T14:31:00+12:00');
    const tl = buildDayTimeline([
      { _startTs: s1, _endTs: e1, _sessionMin: 79, _sessionTs: s1, _windowTs: s1, _hasSessionStart: true },
      { _startTs: s2, _endTs: e2, _sessionMin: 135, _sessionTs: s2, _windowTs: s1, _hasSessionStart: true },
      { _startTs: s3, _endTs: e3, _sessionMin: 151, _sessionTs: s3, _windowTs: s1, _hasSessionStart: true },
    ]);
    assert.equal(tl.gapsReliable, true);
    assert.equal(tl.spanStart, s1);
    assert.equal(tl.spanEnd, e3);
    assert.equal(tl.onlineMin, 79 + 135 + 151);
    assert.equal(tl.spanMin, Math.round((e3 - s1) / 60000));
    assert.equal(tl.offlineMin, tl.spanMin - tl.onlineMin);
    assert.equal(tl.offlineKnown, true);
    assert.ok(tl.onlinePct >= 0 && tl.onlinePct <= 100);
    assert.equal(tl.segments.filter((x) => x.type === 'online').length, 3);
    assert.equal(tl.segments.filter((x) => x.type === 'offline').length, 2);
    assert.equal(tl.segments[0].type, 'online');
    assert.equal(tl.segments[1].type, 'offline');
    assert.equal(tl.segments[1].minutes, Math.round((s2 - e1) / 60000));
    assert.equal(fmtDur(tl.onlineMin), '6h 05m');
  });

  it('buildDayTimeline: single session → offline unknown, 100% online', () => {
    const { buildDayTimeline } = require('../lib/shiftReportFlatten.js');
    const start = Date.parse('2026-08-11T02:12:00+12:00');
    const end = Date.parse('2026-08-11T02:16:00+12:00');
    const tl = buildDayTimeline([{ _startTs: start, _endTs: end, _sessionMin: 4, _hasSessionStart: true, _sessionTs: start, _windowTs: start }]);
    assert.equal(tl.onlineMin, 4);
    assert.equal(tl.spanMin, 4);
    assert.equal(tl.offlineKnown, false);
    assert.equal(tl.offlineMin, 0);
    assert.equal(tl.onlinePct, 100);
    assert.equal(tl.segments.length, 1);
    assert.equal(tl.segments[0].type, 'online');
  });

  it('buildDayTimeline: overlapping sessions skip negative gaps', () => {
    const { buildDayTimeline } = require('../lib/shiftReportFlatten.js');
    const s1 = 1_000_000;
    const e1 = 1_000_000 + 60 * 60 * 1000;
    const s2 = 1_000_000 + 30 * 60 * 1000; // overlaps
    const e2 = 1_000_000 + 90 * 60 * 1000;
    const tl = buildDayTimeline([
      { startTs: s1, endTs: e1, durationMin: 60, _hasSessionStart: true, _sessionTs: s1, _windowTs: s1 },
      { startTs: s2, endTs: e2, durationMin: 60, _hasSessionStart: true, _sessionTs: s2, _windowTs: s1 },
    ]);
    assert.equal(tl.segments.filter((x) => x.type === 'offline').length, 0);
    assert.equal(tl.segments.filter((x) => x.type === 'online').length, 2);
    assert.equal(tl.spanMin, 90);
    assert.equal(tl.onlineMin, 120);
    assert.equal(tl.offlineMin, 0); // clamped span - online
  });

  it('flatten: Login Time uses sessionStartedAt; progressive window takes max wm', () => {
    const opts = {
      companyId: CID,
      canonMap: { D001: 'D001' },
      validIds: { D001: true },
    };
    const withSession = flattenShiftLogNodes(
      [
        {
          D001: {
            a: {
              shiftStartAt: 1_700_000_000_000,
              sessionStartedAt: 1_700_000_000_000 + 10 * 60_000,
              shiftEndAt: 1_700_000_000_000 + 40 * 60_000,
              workedMinutes: 30,
            },
          },
        },
      ],
      opts
    );
    assert.equal(withSession.D001.sessions[0].hasSessionStart, true);
    assert.equal(withSession.D001.sessions[0].sessionTs, 1_700_000_000_000 + 10 * 60_000);
    assert.equal(withSession.D001.sessions[0].startTs, withSession.D001.sessions[0].sessionTs);

    const legacyProgressive = flattenShiftLogNodes(
      [
        {
          D001: {
            a: {
              shiftStartAt: 1_700_000_000_000,
              shiftEndAt: 1_700_000_000_000 + 40 * 60_000,
              workedMinutes: 30,
            },
            b: {
              shiftStartAt: 1_700_000_000_000,
              shiftEndAt: 1_700_000_000_000 + 50 * 60_000,
              workedMinutes: 50,
            },
          },
        },
      ],
      opts
    );
    assert.equal(legacyProgressive.D001.sessions.length, 2);
    assert.equal(legacyProgressive.D001.sessions.every((s) => !s.hasSessionStart), true);
    assert.equal(legacyProgressive.D001.totalMinutes, 50);

    const sameSessionProgressive = flattenShiftLogNodes(
      [
        {
          D001: {
            a: {
              shiftStartAt: 1_700_000_000_000,
              sessionStartedAt: 1_700_000_000_000 + 5 * 60_000,
              shiftEndAt: 1_700_000_000_000 + 40 * 60_000,
              workedMinutes: 30,
            },
            b: {
              shiftStartAt: 1_700_000_000_000,
              sessionStartedAt: 1_700_000_000_000 + 5 * 60_000,
              shiftEndAt: 1_700_000_000_000 + 50 * 60_000,
              workedMinutes: 50,
            },
          },
        },
      ],
      opts
    );
    assert.equal(sameSessionProgressive.D001.totalMinutes, 50);
  });

  it('attaches breakMin onto flattened sessions from source fields', () => {
    const byDriver = flattenShiftLogNodes(
      [
        {
          D001: {
            s1: {
              shiftStartAt: 1_700_000_000_000,
              shiftEndAt: 1_700_000_000_000 + 60 * 60 * 1000,
              workedMinutes: 50,
              breakMinutes: 10,
            },
          },
        },
      ],
      {
        companyId: CID,
        canonMap: { D001: 'D001' },
        validIds: { D001: true },
      }
    );
    assert.equal(byDriver.D001.sessions[0].breakMin, 10);
    assert.equal(byDriver.D001.sessions[0].durationMin, 50);
  });
});
