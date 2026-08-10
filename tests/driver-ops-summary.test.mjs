import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDriverSummaryRow,
  classifyPaymentMethod,
  companyOwesDriver,
  jobPaymentLines,
  normalizeJobOutcome,
  normalizeJobSource,
  periodBounds,
  settlementPath,
} from '../lib/driverOpsSummary.js';

test('cash owes $0; card applies company+driver %', () => {
  assert.equal(companyOwesDriver(100, 'Cash').owed, 0);
  const card = companyOwesDriver(100, 'Card', { companyPercent: 10, driverPercent: 2 });
  assert.equal(card.bucket, 'card');
  assert.equal(card.owed, 88);
  assert.equal(card.commission, 12);
  const eft = companyOwesDriver(50, 'EFTPOS', { companyPercent: 10, driverPercent: 0 });
  assert.equal(eft.bucket, 'eftpos');
  assert.equal(eft.owed, 45);
});

test('TM and Account owe full fare', () => {
  assert.equal(companyOwesDriver(80, 'Total Mobility').owed, 80);
  assert.equal(companyOwesDriver(80, 'Account').owed, 80);
  assert.equal(classifyPaymentMethod('Business Account'), 'account');
});

test('jobPaymentLines adds hoist bucket', () => {
  const lines = jobPaymentLines({
    TotalFare: 40,
    PaymentType: 'Total Mobility',
    tmSubsidyHoist: 15,
    hoistUses: 2,
  });
  assert.equal(lines.length, 2);
  assert.equal(lines[1].bucket, 'hoist');
  assert.equal(lines[1].owed, 15);
  assert.equal(lines[1].uses, 2);
});

test('normalizeJobOutcome covers terminal statuses', () => {
  assert.equal(normalizeJobOutcome('Completed'), 'completed');
  assert.equal(normalizeJobOutcome('Job Cancelled'), 'cancelled');
  assert.equal(normalizeJobOutcome('Rejected'), 'rejected');
  assert.equal(normalizeJobOutcome('No Show'), 'no_show');
});

test('normalizeJobSource maps channels', () => {
  assert.equal(normalizeJobSource({ source: 'Dispatch Console' }), 'dispatch');
  assert.equal(normalizeJobSource({ bookingSource: 'passenger_app' }), 'passenger_app');
  assert.equal(normalizeJobSource({ Source: 'WebBooking' }), 'website');
  assert.equal(normalizeJobSource({ serviceType: 'food' }), 'food');
});

test('periodBounds month/week/day produce stable keys', () => {
  const ref = new Date(2026, 7, 10, 12, 0, 0).getTime(); // 10 Aug 2026
  assert.equal(periodBounds('month', ref).key, '2026-08');
  assert.equal(periodBounds('day', ref).key, '2026-08-10');
  assert.match(periodBounds('week', ref).key, /^W2026-08-/);
});

test('buildDriverSummaryRow totals owed and zeros when locked', () => {
  const jobs = [
    { jobstatus: 'Completed', PaymentType: 'Cash', TotalFare: 20, vehicleId: '201' },
    { jobstatus: 'Completed', PaymentType: 'Card', TotalFare: 100, source: 'dispatch' },
    { jobstatus: 'Cancelled', PaymentType: 'Card', TotalFare: 50 },
  ];
  const open = buildDriverSummaryRow({
    driverId: 'd1',
    driverName: 'Sam',
    jobs,
    workMinutes: 125,
    breakMinutes: 15,
    cardSettings: { companyPercent: 10, driverPercent: 0 },
  });
  assert.equal(open.cashHeld, 20);
  assert.equal(open.owedTotal, 90);
  assert.equal(open.outcomes.completed, 2);
  assert.equal(open.outcomes.cancelled, 1);
  assert.equal(open.workHours, 2.1);
  assert.deepEqual(open.vehicles, ['201']);

  const paid = buildDriverSummaryRow({
    driverId: 'd1',
    driverName: 'Sam',
    jobs,
    cardSettings: { companyPercent: 10, driverPercent: 0 },
    settlement: { status: 'paid', locked: true, amountPaid: 90 },
  });
  assert.equal(paid.status, 'paid');
  assert.equal(paid.owedTotal, 0);
  assert.equal(paid.owedBeforeLock, 90);
});

test('settlementPath shape', () => {
  assert.equal(
    settlementPath('860869', '2026-08', 'drv1'),
    'driverSettlements/860869/2026-08/drv1',
  );
});
