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

  it('uses workedMinutes so Abdullah total is ~505h not ~46773h wall-clock', () => {
    assert.ok(cidNode && drvCid, 'need fixtures');
    const { canon, valid } = buildDriverCanon(drvRoot, drvCid, CID);
    const byDriver = flattenShiftLogNodes([cidNode], {
      companyId: CID,
      canonMap: canon,
      validIds: valid,
    });
    const hrs = byDriver['D001'].totalMinutes / 60;
    // Legacy D001 short sessions + IRkn workedMinutes (~505.3h); no wall-clock inflation
    assert.ok(hrs > 500 && hrs < 550, 'expected ~505h worked, got ' + hrs);
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
