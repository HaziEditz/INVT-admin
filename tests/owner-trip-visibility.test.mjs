/**
 * Owner panel TM + Account visibility — run twice before push.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const vis = require(join(root, 'lib/ownerTripVisibility.js'));

test('isOwnerTmCompletedJob accepts Cash remainder + TM economics', () => {
  assert.equal(vis.isOwnerTmCompletedJob({ paymentType: 'Cash' }), false);
  assert.equal(
    vis.isOwnerTmCompletedJob({
      paymentType: 'Cash',
      isTotalMobility: true,
      tmCouncilPays: 12.5,
      tmCardNumber: '123456',
    }),
    true,
  );
  assert.equal(vis.isOwnerTmCompletedJob({ paymentType: 'total_mobility' }), true);
  assert.equal(vis.isOwnerTmCompletedJob({ paymentType: 'TM' }), true);
  assert.equal(vis.isOwnerTmCompletedJob({ tmVoucherNo: '99' }), true);
});

test('extractOwnerTmTrips merges tmTripStatus seed when completedJobs sparse', () => {
  const trips = vis.extractOwnerTmTrips(
    {},
    {},
    {
      job_tm_1: {
        status: 'pending',
        submittedAt: 1700000000000,
        isTotalMobility: true,
        tmCouncilPays: 20,
        tmCardNumber: '555',
        councilId: 'cncl_icc',
      },
    },
  );
  assert.equal(trips.length, 1);
  assert.equal(trips[0]._key, 'job_tm_1');
  assert.equal(trips[0].tmCouncilPays, 20);
});

test('extractOwnerTmTrips includes closedJobs when completedJobs missing', () => {
  const trips = vis.extractOwnerTmTrips(
    {},
    {
      pushAbc: {
        jobId: 'hail_9',
        paymentType: 'Cash',
        isTotalMobility: true,
        tmCouncilPays: 15,
        tmCardNumber: '111',
      },
    },
    {},
  );
  assert.equal(trips.length, 1);
  assert.equal(trips[0]._key, 'hail_9');
  assert.equal(trips[0].tmCouncilPays, 15);
});

test('extractOwnerTmTrips prefers completedJobs detail over status stub', () => {
  const trips = vis.extractOwnerTmTrips(
    {
      hail_9: {
        bookingId: 'hail_9',
        paymentType: 'Cash',
        isTotalMobility: true,
        tmCouncilPays: 18,
        passengerName: 'Ada',
        fare: 40,
      },
    },
    {},
    {
      hail_9: { status: 'pending', submittedAt: 1, isTotalMobility: true, tmCouncilPays: 1 },
    },
  );
  assert.equal(trips.length, 1);
  assert.equal(trips[0].tmCouncilPays, 18);
  assert.equal(trips[0].passengerName, 'Ada');
  assert.equal(trips[0].tmStatus, 'pending');
});

test('normalizePaymentMethod falls back to paymentType', () => {
  assert.equal(vis.normalizePaymentMethod({ paymentType: 'Account' }), 'Account');
  assert.equal(vis.normalizePaymentMethod({ paymentMethod: 'Cash', paymentType: 'Account' }), 'Cash');
  assert.equal(vis.isAccountJob({ paymentType: 'Account' }), true);
  assert.equal(vis.isAccountJob({ paymentMethod: 'account' }), true);
  assert.equal(vis.isAccountJob({ paymentType: 'Cash' }), false);
});

test('resolveBusinessAccountKey matches driver accountId aliases', () => {
  const accts = {
    acct_firebase: { name: 'Acme', accountNumber: '001', accountCode: 'ACME' },
  };
  const keyByCode = { ACME: 'acct_firebase' };
  const keyByNum = { '001': 'acct_firebase' };

  assert.equal(
    vis.resolveBusinessAccountKey({ accountId: 'acct_firebase' }, accts, keyByCode, keyByNum),
    'acct_firebase',
  );
  assert.equal(
    vis.resolveBusinessAccountKey({ Account_id: 'acct_firebase' }, accts, keyByCode, keyByNum),
    'acct_firebase',
  );
  assert.equal(
    vis.resolveBusinessAccountKey({ jobAccountId: '001' }, accts, keyByCode, keyByNum),
    'acct_firebase',
  );
  assert.equal(
    vis.resolveBusinessAccountKey({ accountCode: 'acme' }, accts, keyByCode, keyByNum),
    'acct_firebase',
  );
  assert.equal(
    vis.resolveBusinessAccountKey({ accountNumber: '001' }, accts, keyByCode, keyByNum),
    'acct_firebase',
  );
  assert.equal(
    vis.resolveBusinessAccountKey({ accountId: 'unknown' }, accts, keyByCode, keyByNum),
    '__unmatched__',
  );
});

test('currentMonthDateBounds uses full NZ calendar month', () => {
  const bounds = vis.currentMonthDateBounds(new Date('2026-08-07T10:00:00+12:00'), 'Pacific/Auckland');
  assert.equal(bounds.from, '2026-08-01');
  assert.equal(bounds.to, '2026-08-31');
});

test('server.js wires TM merge sources + shared detection', () => {
  const src = readFileSync(join(root, 'server.js'), 'utf8');
  assert.match(src, /function isOwnerTmCompletedJob/);
  assert.match(src, /function mergeOwnerTmJobMap/);
  assert.match(src, /adminRead\('closedJobs\/' \+ cid\)/);
  assert.match(src, /adminRead\('tmTripStatus\/' \+ cid\)/);
  // Dashboard Total TM Trips uses same merge scope as Cardholder Usage
  assert.match(src, /Total TM Trips/);
  assert.match(src, /_dashMergeTm/);
  assert.match(src, /_dashLoadTrees/);
  assert.match(src, /DASH_TREE_TTL_MS/);
  assert.match(src, /pJobStats/);
  assert.match(src, /completed \+ closed \+ status/);
  assert.match(src, /TM_Usage\.aspx/);
  assert.match(src, /function _dashIsTm/);
  // Single shared tree fetch — no parallel double completedJobs in totals
  assert.doesNotMatch(
    src,
    /var pCompleted = window\.adminRead\('completedJobs\/' \+ cid\)[\s\S]{0,800}var pTm = Promise\.all\(\[\s*window\.adminRead\('completedJobs/,
  );
  // Total Mobility Jobs report uses economics markers + JobCompleteTime for _ts
  assert.match(src, /Same detection as TM Trip History/);
  assert.match(src, /JobCompleteTime\|\|j\.jobCompleteTime/);
  assert.match(src, /tmCardName\|\|j\.tmPassengerName/);
});

test('owner TM Trip History has bulk pending submit (pending→submitted only)', () => {
  const src = readFileSync(join(root, 'server.js'), 'utf8');
  assert.match(src, /id="tm-bulk-bar"/);
  assert.match(src, /id="tm-check-all"/);
  assert.match(src, /Select all matching/);
  assert.match(src, /submitSelectedPending/);
  assert.match(src, /submitAllMatchingPending/);
  assert.match(src, /class="tm-row-check"/);
  assert.match(src, /function submitPendingKeys/);
  assert.match(src, /status:\s*'submitted'/);
  // Bulk path reuses approveTrip — no separate status machine
  assert.match(src, /approveTrip\(key\)/);
  assert.match(src, /Submit Selected/);
  assert.match(src, /Submit All Matching Pending/);
});

test('server.js AccReport + BAB account visibility fixes', () => {
  const src = readFileSync(join(root, 'server.js'), 'utf8');
  // flatten paymentType fallback
  assert.match(
    src,
    /paymentMethod\|\|j\.PaymentMethod\|\|j\.payment\|\|j\.Payment\|\|j\.payType\|\|j\.paymentType\|\|j\.PaymentType/,
  );
  // AccReport month default (not today-only)
  assert.match(src, /Default to current calendar month/);
  assert.match(src, /padStart\(2,'0'\)/);
  // BAB resolves accountId / Account_id aliases
  assert.match(src, /j\.accountId,j\.Account_id,j\.AccountId,j\.jobAccountId/);
  // BAB reads closedJobs
  assert.match(src, /adminRead\('closedJobs\/'\+_babCID\)/);
  assert.match(src, /pushJob\(bid,j,'closedJobs'\)/);
});

test('owner clarity review tracks payment-type visibility', () => {
  const doc = readFileSync(join(root, 'OWNER_PANEL_CLARITY.md'), 'utf8');
  assert.match(doc, /payment-type trip visibility/i);
  assert.match(doc, /Account/);
  assert.match(doc, /ACC/);
  assert.match(doc, /TM/);
  assert.match(doc, /Card/);
  assert.match(doc, /EFTPOS/);
  assert.match(doc, /TM admin redesign/i);
});

test('dashboard Card Payments tile is not a dead CardCommission link', () => {
  const src = readFileSync(join(root, 'server.js'), 'utf8');
  assert.match(src, /ClosedJobsReports\.aspx\?pay=card/);
  assert.doesNotMatch(
    src,
    /key:'cardpay'[\s\S]{0,80}href:'CardCommission\.aspx'/,
  );
  assert.match(src, /var _rptPayQ=/);
  assert.match(src, /Payments sidebar \/ dashboard deep-link/);
});

test('sidebar Payments section links Card EFTPOS Cash to Closed Jobs filters', () => {
  const src = readFileSync(join(root, 'server.js'), 'utf8');
  assert.match(src, /title="Payments"/);
  assert.match(src, /menu_title">Payments</);
  assert.match(
    src,
    /ClosedJobsReports\.aspx\?pay=card">Card Payments</,
  );
  assert.match(
    src,
    /ClosedJobsReports\.aspx\?pay=eftpos">EFTPOS Payments</,
  );
  assert.match(
    src,
    /ClosedJobsReports\.aspx\?pay=cash">Cash Payments</,
  );
  // Distinct filters (not lumping card+eftpos via isCardPaymentMethod)
  assert.match(src, /if\(_rptPayQ==='card'\)/);
  assert.match(src, /if\(_rptPayQ==='eftpos'\) return pm\.indexOf\('eftpos'\)/);
  assert.match(src, /if\(_rptPayQ==='cash'\) return pm\.indexOf\('cash'\)/);
  // EFTPOS is not BookaWaka card processing — no commission / net-payout model
  assert.match(src, /if \(s\.indexOf\('eftpos'\) !== -1\) return false;/);
  assert.doesNotMatch(
    src,
    /return s\.indexOf\('card'\) !== -1 \|\| s\.indexOf\('stripe'\) !== -1 \|\| s\.indexOf\('eftpos'\)/,
  );
  // Active nav prefers ?pay= deep-links over bare Closed Jobs
  assert.match(src, /hasPayFilter/);
  assert.match(src, /Bare Closed Jobs link stays inactive/);
});
