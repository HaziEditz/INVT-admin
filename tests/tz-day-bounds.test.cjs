/**
 * TZ day bounds + shift date-filter overlap — includes live today-session regression.
 * Run twice: node --test tests/tz-day-bounds.test.cjs tests/shift-report-flatten.test.cjs
 */
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  tzDayStart,
  tzDayEnd,
  sessionOverlapsRange,
} = require('../lib/tzDayBounds.js');
const {
  buildDriverCanon,
  flattenShiftLogNodes,
} = require('../lib/shiftReportFlatten.js');

const TEMP = process.env.TEMP || process.env.TMPDIR || '/tmp';
const TZ = 'Pacific/Auckland';
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

function nzDate(ts) {
  return new Date(ts).toLocaleDateString('en-CA', { timeZone: TZ });
}
function nzDateTime(ts) {
  return new Date(ts).toLocaleString('en-NZ', { timeZone: TZ });
}

describe('tzDayStart / tzDayEnd (Pacific/Auckland)', () => {
  it('does not use UTC midnight (NZ noon) for date-only strings', () => {
    const ymd = '2026-08-11';
    const brokenUtcMidnight = Date.parse(ymd); // UTC 00:00
    const start = tzDayStart(ymd, TZ);
    const end = tzDayEnd(ymd, TZ);
    assert.equal(nzDate(start), ymd);
    assert.equal(nzDate(end), ymd);
    assert.ok(start < brokenUtcMidnight, 'NZ midnight must be before UTC midnight (= NZ noon)');
    // Early-morning session (12:51 am NZ) is inside NZ day, outside broken UTC-from
    const early = start + 51 * 60 * 1000 + 45 * 1000; // ~12:51
    assert.ok(early >= start && early <= end);
    assert.ok(early < brokenUtcMidnight);
  });
});

describe('sessionOverlapsRange', () => {
  it('includes closed session when only end falls on the selected day (stale start)', () => {
    const start = Date.parse('2026-07-10T02:47:37+12:00');
    const end = Date.parse('2026-08-11T00:51:45+12:00');
    const dayStart = tzDayStart('2026-08-11', TZ);
    const dayEnd = tzDayEnd('2026-08-11', TZ);
    assert.equal(sessionOverlapsRange({ startTs: start, endTs: end }, dayStart, dayEnd), true);
    // Point filter on start alone would miss it
    assert.equal(start >= dayStart && start <= dayEnd, false);
    assert.equal(end >= dayStart && end <= dayEnd, true);
  });
});

describe('live today session appears for NZ today filter', () => {
  it('finds Abdullah D001 close -OzfieDFfbVFNHL8h5qT when filtering to NZ today', () => {
    const cid = loadTemp('sl860_now.json') || loadTemp('sl860.json');
    const drvRoot = loadTemp('drvroot.json');
    const drvCid = loadTemp('drv860869.json');
    assert.ok(cid && drvCid, 'need live shiftLogs fixture');

    const todayNz = new Date().toLocaleDateString('en-CA', { timeZone: TZ });
    const { canon, valid } = buildDriverCanon(drvRoot, drvCid, CID);
    const by = flattenShiftLogNodes([cid], { companyId: CID, canonMap: canon, validIds: valid });

    const rows = [];
    for (const [driverId, d] of Object.entries(by)) {
      for (const s of d.sessions) {
        rows.push({
          driverId,
          _startTs: s.startTs,
          _endTs: s.endTs,
          _activityTs: s.activityTs || s.endTs || s.loggedAt || s.startTs,
          sourceKey: s.sourceKey,
          loggedAt: s.loggedAt,
        });
      }
    }

    const dayStart = tzDayStart(todayNz, TZ);
    const dayEnd = tzDayEnd(todayNz, TZ);
    const hits = rows.filter(
      (r) =>
        r.driverId === 'D001' &&
        sessionOverlapsRange(
          { startTs: r._startTs, endTs: r._endTs, activityTs: r._activityTs },
          dayStart,
          dayEnd
        )
    );

    assert.ok(hits.length >= 1, 'expected at least one D001 session overlapping NZ today, got ' + hits.length);
    const live = hits.find((r) => r._endTs === 1786366305066 || (r.loggedAt && nzDate(r.loggedAt) === todayNz));
    assert.ok(live, 'expected live close session with endTs 1786366305066 or loggedAt today');
    assert.equal(nzDate(live._activityTs || live._endTs), todayNz);

    // Broken UTC-from filter must still fail for early-morning end (documents the bug we fixed)
    const brokenFrom = Date.parse(todayNz);
    const earlyEnd = live._endTs;
    if (earlyEnd < brokenFrom) {
      assert.ok(earlyEnd >= dayStart, 'session end is in NZ day but before UTC midnight/NZ noon');
    }
  });
});
