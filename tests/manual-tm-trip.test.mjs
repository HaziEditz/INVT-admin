/**
 * Manual TM trip entry payload builder.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildManualBookingId,
  buildManualTmCompletedJob,
  buildManualTmTripStatus,
  calcManualTmSubsidy,
} from '../lib/manualTmTrip.js';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const serverSrc = readFileSync(join(root, 'server.js'), 'utf8');

test('calcManualTmSubsidy applies percent and cap', () => {
  const split = calcManualTmSubsidy(20, { councilSubsidyPercent: 65, councilCapAmount: 10 });
  assert.equal(split.subsidy, 10);
  assert.equal(split.passengerPays, 10);
  const uncapped = calcManualTmSubsidy(20, { councilSubsidyPercent: 65, councilCapAmount: 0 });
  assert.equal(uncapped.subsidy, 13);
  assert.equal(uncapped.passengerPays, 7);
});

test('buildManualTmCompletedJob marks manual_owner + TM fields', () => {
  const job = buildManualTmCompletedJob(
    {
      fare: 15.27,
      pickupAddress: '1 Test St',
      dropAddress: '2 Dest Ave',
      distanceKm: 4.2,
      driverName: 'Ada Driver',
      driverId: 'drv1',
      vehicleId: 'T101',
      tmCardNumber: '123456',
      tmCardName: 'Pat Passenger',
      paymentType: 'Cash',
      hoistUses: 1,
      completedAtMs: 1_700_000_000_000,
    },
    {
      companyId: '860869',
      councilId: 'invercargill',
      tmConfig: {
        councilSubsidyPercent: 65,
        councilCapAmount: 35,
        hoistCostPerUnit: 10,
      },
      addedBy: 'owner@test',
      nowMs: 1_700_000_000_000,
    },
  );
  assert.equal(job.source, 'manual_owner');
  assert.equal(job.manuallyAddedByCompany, true);
  assert.equal(job.isTotalMobility, true);
  assert.equal(job.tmMeterFare, 15.27);
  assert.equal(job.tmSubsidyFare, 9.93);
  assert.equal(job.tmPassengerPays, 5.34);
  assert.equal(job.tmSubsidyHoist, 10);
  assert.equal(job.hoistCount, 1);
  assert.equal(job.tmTripCategory, 'Manually added by company');
  assert.equal(job.bookingId, 'M1700000000000');
  assert.ok(job.completedAt_ISO);
});

test('buildManualTmTripStatus seeds pending with manual event', () => {
  const job = buildManualTmCompletedJob(
    { fare: 10, tmCardNumber: '99', tmCardName: 'A B', completedAtMs: 1 },
    {
      companyId: '860869',
      councilId: 'inv',
      tmConfig: { councilSubsidyPercent: 50 },
      nowMs: 42,
    },
  );
  const st = buildManualTmTripStatus(job, { nowMs: 42, addedBy: 'owner' });
  assert.equal(st.status, 'pending');
  assert.equal(st.source, 'manual_owner');
  assert.equal(st.manuallyAddedByCompany, true);
  const ev = Object.values(st.events)[0];
  assert.equal(ev.type, 'manual_owner_created');
  assert.match(ev.note, /Manually added by company/);
});

test('owner TM history page wires manual entry UI + markers', () => {
  assert.match(serverSrc, /Add Manual Trip/);
  assert.match(serverSrc, /openManualTmEntry/);
  assert.match(serverSrc, /saveManualTmEntry/);
  assert.match(serverSrc, /source: 'manual_owner'/);
  assert.match(serverSrc, /manuallyAddedByCompany: true/);
  assert.match(serverSrc, /resolveTripCategory/);
  assert.match(serverSrc, /Manually added by company/);
  assert.match(serverSrc, /manual_owner_created/);
});

test('buildManualBookingId prefixes M', () => {
  assert.match(buildManualBookingId(123), /^M123$/);
});
