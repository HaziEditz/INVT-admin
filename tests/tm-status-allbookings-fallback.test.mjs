/**
 * Regression: status + allbookings, no completedJobs → owner merge shows real data
 * (simulates tonight's dispatch-complete-without-driver-write scenario).
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const vis = require(join(root, 'lib/ownerTripVisibility.js'));
const saRoot = join(root, '..', 'INVT-superadmin');

const BOOKING = '8692699999';
const CID = '860869';

const allbookings = {
  [BOOKING]: {
    bookingId: BOOKING,
    DriverId: 'D001',
    driverId: 'D001',
    VehicleNo: '201',
    vehicleId: '201',
    PickAddress: '1 Dee Street, Invercargill',
    pickup: '1 Dee Street, Invercargill',
    DropAddress: '100 Tay Street, Invercargill',
    dropoff: '100 Tay Street, Invercargill',
    TotalFare: 40,
    totalFare: 40,
    PaymentType: 'Card',
    paymentType: 'Card',
    isTotalMobility: true,
    tmUsed: true,
    tmPassengerPays: 14,
    tmSubsidyFare: 26,
    tmCouncilPays: 26,
    tmCardNumber: '78628348',
    PassengerName: 'Card Remainder Evidence',
  },
};

const statusData = {
  [BOOKING]: {
    status: 'pending',
    councilId: 'cncl_invercargill_city_council_test',
    companyId: CID,
    submittedAt: Date.now(),
    source: 'dispatch_complete',
    isTotalMobility: true,
    tmCardNumber: '78628348',
    tmCouncilPays: 26,
    tmPassengerPays: 14,
  },
};

test('status+allbookings, no completedJobs: owner merge shows real fare/driver (not blank/$0)', () => {
  const trips = vis.extractOwnerTmTrips({}, {}, statusData, allbookings);
  assert.equal(trips.length, 1);
  const t = trips[0];
  assert.equal(String(t._key), BOOKING);
  assert.equal(t.driverId, 'D001');
  assert.ok(String(t.pickup || t.PickAddress).includes('Dee'));
  assert.equal(Number(t.TotalFare || t.totalFare), 40);
  assert.equal(Number(t.tmPassengerPays), 14);
  assert.equal(Number(t.tmSubsidyFare || t.tmCouncilPays), 26);
  assert.notEqual(Number(t.TotalFare || t.totalFare || 0), 0);
});

test('status-only without allbookings still visible as TM stub (economics from status)', () => {
  const trips = vis.extractOwnerTmTrips({}, {}, statusData, {});
  assert.equal(trips.length, 1);
  assert.equal(Number(trips[0].tmPassengerPays), 14);
  assert.equal(trips[0].isTotalMobility, true);
});

test('owner page loadTrips wires allbookings into mergeOwnerTmJobMap', () => {
  const src = readFileSync(join(root, 'server.js'), 'utf8');
  assert.match(src, /adminRead\('allbookings\/' \+ cid\)/);
  assert.match(src, /mergeOwnerTmJobMap\(jobsData, closedData, statusData, allbookingsData\)/);
});

test('SA TM-Trips loadTT unions tmTripStatus + allbookings fill (not completedJobs-only)', () => {
  const src = readFileSync(
    join(saRoot, 'taxitime.co.nz/superadmin360taxi/TM-Trips.aspx'),
    'utf8',
  );
  assert.match(src, /adminRead\('tmTripStatus'\)/);
  assert.match(src, /_needsAbFill|_ttFillFromAb|allbookings\/' \+ cid/);
  assert.match(src, /needAb/);
});

test('council loadCouncilTrips reads allbookings and fills sparse jobs', () => {
  const src = readFileSync(join(saRoot, 'src/routes/council.ts'), 'utf8');
  assert.match(src, /fillCouncilJobFromAllbookings/);
  assert.match(src, /allbookings\/' \+ cid/);
  assert.match(src, /applyCouncilStatusEconomics/);
});
