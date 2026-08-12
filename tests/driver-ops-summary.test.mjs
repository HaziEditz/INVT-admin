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

test('cash owes $0; card applies company+driver %; EFTPOS owes $0 like cash', () => {
  assert.equal(companyOwesDriver(100, 'Cash').owed, 0);
  const card = companyOwesDriver(100, 'Card', { companyPercent: 10, driverPercent: 2 });
  assert.equal(card.bucket, 'card');
  assert.equal(card.owed, 88);
  assert.equal(card.commission, 12);
  const eft = companyOwesDriver(50, 'EFTPOS', { companyPercent: 10, driverPercent: 0 });
  assert.equal(eft.bucket, 'eftpos');
  assert.equal(eft.owed, 0);
  assert.equal(eft.commission, 0);
  assert.equal(eft.gross, 50);
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
  assert.equal(normalizeJobSource({ source: 'queue' }), 'hail');
  assert.equal(normalizeJobSource({ source: '' }), 'unknown');
  assert.equal(normalizeJobSource({}), 'unknown');
  assert.equal(normalizeJobSource({ source: 'manual_radio' }), 'other');
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
    { jobstatus: 'Completed', PaymentType: 'EFTPOS', TotalFare: 40 },
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
  assert.equal(open.pay.eftpos.gross, 40);
  assert.equal(open.pay.eftpos.count, 1);
  assert.equal(open.pay.eftpos.owed, 0);
  // Card 90 owed only — EFTPOS must not inflate unpaid
  assert.equal(open.owedTotal, 90);
  assert.equal(open.outcomes.completed, 3);
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

test('isTmJob detects economics flags even when PaymentType is Cash', async () => {
  const { isTmJob, jobPaymentLines, formatPayWithCount, normalizeJobSource, periodBounds } =
    await import('../lib/driverOpsSummary.js');
  assert.equal(isTmJob({ isTotalMobility: true, PaymentType: 'Cash' }), true);
  assert.equal(isTmJob({ tmSubsidyFare: 12, PaymentType: 'Card' }), true);
  assert.equal(isTmJob({ PaymentType: 'Cash' }), false);
  const lines = jobPaymentLines({
    TotalFare: 40,
    PaymentType: 'Card',
    isTotalMobility: true,
    tmSubsidyHoist: 10,
    hoistUses: 1,
  });
  assert.equal(lines[0].bucket, 'tm');
  assert.equal(lines[1].bucket, 'hoist');
  assert.equal(formatPayWithCount(55, 5), '$55.00 ×5');
  assert.equal(formatPayWithCount(0, 0), '$0.00');
  assert.equal(normalizeJobSource({ source: 'Driver App hail' }), 'hail');
  assert.equal(normalizeJobSource({ source: 'passenger_app' }), 'passenger_app');
  const range = periodBounds('range', Date.now(), '2026-08-01', '2026-08-10');
  assert.equal(range.mode, 'range');
  assert.match(range.key, /^R2026-08-01/);
});

test('aggregateDriverShiftMinutes prefers workedMinutes and collapses progressive siblings', async () => {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const { aggregateDriverShiftMinutes } = require('../lib/shiftReportFlatten.js');
  const fromMs = Date.parse('2026-08-01T00:00:00+12:00');
  const toMs = Date.parse('2026-08-31T23:59:59+12:00');
  const windowTs = Date.parse('2026-08-05T08:00:00+12:00');
  const end1 = Date.parse('2026-08-05T12:00:00+12:00');
  const end2 = Date.parse('2026-08-05T16:00:00+12:00');
  const shiftLogs = {
    D001: {
      s1: { shiftStartAt: windowTs, endTime: end1, workedMinutes: 120, driverId: 'D001' },
      s2: { shiftStartAt: windowTs, endTime: end2, workedMinutes: 240, driverId: 'D001' },
    },
  };
  const driversCid = {
    D001: { id: 'D001', firstName: 'Test', lastName: 'Driver', dispatcherId: 'D001' },
  };
  const agg = aggregateDriverShiftMinutes({
    companyId: '860869',
    fromMs,
    toMs,
    driversRoot: null,
    driversCid,
    shiftLogs,
  });
  // Progressive siblings: take max 240, never sum 120+240
  assert.equal(agg.byDriver.D001.workMinutes, 240);
});
