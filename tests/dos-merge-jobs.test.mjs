/**
 * DOS merge must key by bookingId — closedJobs push keys must not triple-count.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  dosFlattenMergedJobs,
  dosJobBookingId,
  dosMergeJobSources,
} from '../lib/dosMergeJobs.js';
import { buildDriverSummaryRow } from '../lib/driverOpsSummary.js';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { tzDayEnd, tzDayStart } = require('../lib/tzDayBounds.js');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('dosJobBookingId prefers bookingId over push key', () => {
  assert.equal(
    dosJobBookingId({ bookingId: '8692608131', driverId: 'D001' }, '-OzqAAN-push'),
    '8692608131',
  );
  assert.equal(dosJobBookingId({}, '-OzqAAN-push'), '-OzqAAN-push');
});

test('dosMergeJobSources collapses closedJobs push dupes + completed/allbookings', () => {
  const bid = '8692608131';
  const tripMs = Date.parse('2026-08-12T13:32:33.197Z'); // 13 Aug 1:32am NZ
  const base = {
    bookingId: bid,
    driverId: 'D001',
    completedAt: tripMs,
    totalFare: 15.27,
    tmSubsidyFare: 9.93,
    isTotalMobility: true,
    paymentType: 'Cash',
    status: 'Completed',
    jobstatus: 'Completed',
  };
  const completed = { [bid]: { ...base } };
  const closed = {
    '-OzqAAN-fJEST4PhPoo4': { ...base, completedAt: tripMs - 67 },
    '-OzqAAO3H3paOE6r6Bqb': { ...base },
  };
  const allbookings = { [bid]: { ...base, TotalFare: 15.27, DriverId: 'D001' } };
  const merged = dosMergeJobSources([null, completed, closed, allbookings]);
  const flat = dosFlattenMergedJobs(merged);
  assert.equal(flat.length, 1, 'must count once after merge');
  assert.equal(String(flat[0].bookingId), bid);
  assert.equal(String(flat[0].driverId), 'D001');
  assert.equal(flat[0].tmSubsidyFare, 9.93);

  const from = tzDayStart('2026-08-13', 'Pacific/Auckland');
  const to = tzDayEnd('2026-08-13', 'Pacific/Auckland');
  assert.ok(tripMs >= from && tripMs <= to);

  const row = buildDriverSummaryRow({
    driverId: 'D001',
    driverName: 'Test',
    jobs: flat,
  });
  assert.equal(row.outcomes.total, 1);
  assert.equal(row.outcomes.completed, 1);
  assert.equal(row.tmDetail.trips, 1);
  assert.equal(row.tmDetail.subsidy, 9.93);
});

test('owner wiring + SA DOS + reports merge use bookingId (not push keys alone)', () => {
  const wiring = readFileSync(join(root, 'tmp-dos-owner-wiring.js'), 'utf8');
  assert.match(wiring, /function dosJobBookingId/);
  assert.match(wiring, /dosJobBookingId\(job, key\)/);
  const sa = readFileSync(
    join(root, '..', 'INVT-superadmin', 'taxitime.co.nz', 'superadmin360taxi', 'SA-DriverOpsSummary.aspx'),
    'utf8',
  );
  assert.match(sa, /function dosJobBookingId/);
  const server = readFileSync(join(root, 'server.js'), 'utf8');
  assert.match(server, /job\.bookingId\|\|job\.BookingId\|\|job\.jobId/);
  assert.match(server, /never closedJobs push keys/);
});
