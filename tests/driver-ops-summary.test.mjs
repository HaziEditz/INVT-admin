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

test('cash owes $0; card applies company+driver %; EFTPOS and Account/ACC owe $0 in BW Mark Paid', () => {
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
  const acc = companyOwesDriver(40, 'Account');
  assert.equal(acc.bucket, 'account');
  assert.equal(acc.owed, 0);
  assert.equal(acc.gross, 40);
  const accType = companyOwesDriver(25, 'ACC');
  assert.equal(accType.bucket, 'account');
  assert.equal(accType.owed, 0);
});

test('TM owes full fare; Account tracked but not BW-owed', () => {
  assert.equal(companyOwesDriver(80, 'Total Mobility').owed, 80);
  assert.equal(companyOwesDriver(80, 'Account').owed, 0);
  assert.equal(companyOwesDriver(80, 'Account').gross, 80);
  assert.equal(classifyPaymentMethod('Business Account'), 'account');
});

test('jobPaymentLines adds hoist bucket', () => {
  const lines = jobPaymentLines({
    TotalFare: 40,
    PaymentType: 'Total Mobility',
    tmSubsidyFare: 25,
    tmSubsidyHoist: 15,
    hoistUses: 2,
  });
  assert.equal(lines.length, 2);
  assert.equal(lines[0].bucket, 'tm');
  assert.equal(lines[0].owed, 25);
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
    { jobstatus: 'Completed', PaymentType: 'Account', TotalFare: 60 },
    { jobstatus: 'Completed', PaymentType: 'ACC', TotalFare: 15 },
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
  assert.equal(open.pay.account.gross, 75);
  assert.equal(open.pay.account.count, 2);
  assert.equal(open.pay.account.owed, 0);
  // Card 90 owed only — EFTPOS + Account/ACC must not inflate BW unpaid
  assert.equal(open.owedTotal, 90);
  assert.equal(open.outcomes.completed, 5);
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

test('PLATFORM_OWED_BUCKETS keeps hoist with TM; Account is tracked-not-owed', async () => {
  const {
    PLATFORM_OWED_BUCKETS,
    PLATFORM_CARD_OWED_BUCKETS,
    PLATFORM_TM_OWED_BUCKETS,
    TRACKED_NOT_PLATFORM_OWED,
    isPlatformOwedBucket,
    buildDriverSummaryRow,
  } = await import('../lib/driverOpsSummary.js');
  assert.deepEqual([...PLATFORM_OWED_BUCKETS], ['card', 'tm', 'hoist']);
  assert.deepEqual([...PLATFORM_CARD_OWED_BUCKETS], ['card', 'other']);
  assert.deepEqual([...PLATFORM_TM_OWED_BUCKETS], ['tm', 'hoist']);
  assert.ok(TRACKED_NOT_PLATFORM_OWED.includes('account'));
  assert.equal(isPlatformOwedBucket('hoist'), true);
  assert.equal(isPlatformOwedBucket('account'), false);
  const row = buildDriverSummaryRow({
    driverId: 'd1',
    driverName: 'Sam',
    jobs: [
      {
        jobstatus: 'Completed',
        PaymentType: 'Total Mobility',
        TotalFare: 40,
        tmSubsidyFare: 30,
        tmSubsidyHoist: 10,
        hoistUses: 1,
      },
    ],
  });
  assert.equal(row.pay.tm.owed, 30);
  assert.equal(row.pay.hoist.owed, 10);
  assert.equal(row.pay.hoist.count, 1);
  assert.equal(row.tmOwed, 40);
  assert.equal(row.cardOwed, 0);
  assert.equal(row.owedTotal, 40);
});

test('settlementPath shape', () => {
  assert.equal(
    settlementPath('860869', '2026-08', 'drv1'),
    'driverSettlements/860869/2026-08/drv1',
  );
});

test('platformSettlementPath splits card and tm roots', async () => {
  const { platformSettlementPath, platformSettlementRoot } = await import(
    '../lib/driverOpsSummary.js'
  );
  assert.equal(platformSettlementRoot('card'), 'cardDriverSettlements');
  assert.equal(platformSettlementRoot('tm'), 'tmDriverSettlements');
  assert.equal(
    platformSettlementPath('card', '860869', '2026-08', 'D001'),
    'cardDriverSettlements/860869/2026-08/D001',
  );
  assert.equal(
    platformSettlementPath('tm', '860869', '2026-08', 'D001'),
    'tmDriverSettlements/860869/2026-08/D001',
  );
});

test('Track C: card lock and tm lock are independent; legacy locks both', () => {
  const jobs = [
    { jobstatus: 'Completed', PaymentType: 'Card', TotalFare: 100 },
    {
      jobstatus: 'Completed',
      PaymentType: 'Total Mobility',
      TotalFare: 40,
      tmSubsidyFare: 30,
      tmSubsidyHoist: 10,
      hoistUses: 1,
    },
  ];
  const cs = { companyPercent: 10, driverPercent: 0 };
  const open = buildDriverSummaryRow({
    driverId: 'd1',
    driverName: 'Sam',
    jobs,
    cardSettings: cs,
  });
  assert.equal(open.cardOwedBeforeLock, 90);
  assert.equal(open.tmOwedBeforeLock, 40);
  assert.equal(open.owedTotal, 130);
  assert.equal(open.status, 'open');
  assert.equal(open.cardLocked, false);
  assert.equal(open.tmLocked, false);

  const cardOnly = buildDriverSummaryRow({
    driverId: 'd1',
    driverName: 'Sam',
    jobs,
    cardSettings: cs,
    cardSettlement: { status: 'paid', locked: true, amountPaid: 90 },
  });
  assert.equal(cardOnly.cardLocked, true);
  assert.equal(cardOnly.tmLocked, false);
  assert.equal(cardOnly.cardOwed, 0);
  assert.equal(cardOnly.tmOwed, 40);
  assert.equal(cardOnly.owedTotal, 40);
  assert.equal(cardOnly.status, 'partial');
  assert.equal(cardOnly.tmDetail.owed, 40);
  assert.equal(cardOnly.locked, false);

  const tmOnly = buildDriverSummaryRow({
    driverId: 'd1',
    driverName: 'Sam',
    jobs,
    cardSettings: cs,
    tmSettlement: { status: 'paid', locked: true, amountPaid: 40 },
  });
  assert.equal(tmOnly.cardLocked, false);
  assert.equal(tmOnly.tmLocked, true);
  assert.equal(tmOnly.cardOwed, 90);
  assert.equal(tmOnly.tmOwed, 0);
  assert.equal(tmOnly.owedTotal, 90);
  assert.equal(tmOnly.status, 'partial');
  assert.equal(tmOnly.tmDetail.owed, 0);
  assert.equal(tmOnly.tmDetail.paid, 40);

  const both = buildDriverSummaryRow({
    driverId: 'd1',
    driverName: 'Sam',
    jobs,
    cardSettings: cs,
    cardSettlement: { status: 'paid', locked: true },
    tmSettlement: { status: 'paid', locked: true },
  });
  assert.equal(both.locked, true);
  assert.equal(both.status, 'paid');
  assert.equal(both.owedTotal, 0);

  const legacy = buildDriverSummaryRow({
    driverId: 'd1',
    driverName: 'Sam',
    jobs,
    cardSettings: cs,
    settlement: { status: 'paid', locked: true, amountPaid: 130 },
  });
  assert.equal(legacy.cardLocked, true);
  assert.equal(legacy.tmLocked, true);
  assert.equal(legacy.locked, true);
  assert.equal(legacy.owedTotal, 0);
  assert.equal(legacy.status, 'paid');
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
    tmSubsidyFare: 26,
    tmSubsidyHoist: 10,
    hoistUses: 1,
  });
  assert.equal(lines.some((l) => l.bucket === 'tm' && l.owed === 26), true);
  assert.equal(lines.some((l) => l.bucket === 'hoist' && l.owed === 10), true);
  assert.equal(formatPayWithCount(55, 5), '$55.00 ×5');
  assert.equal(formatPayWithCount(0, 0), '$0.00');
  assert.equal(normalizeJobSource({ source: 'Driver App hail' }), 'hail');
  assert.equal(normalizeJobSource({ source: 'passenger_app' }), 'passenger_app');
  const range = periodBounds('range', Date.now(), '2026-08-01', '2026-08-10');
  assert.equal(range.mode, 'range');
  assert.match(range.key, /^R2026-08-01/);
});

test('TM subsidy owed: cash-remainder + hoist uses subsidy not hoist-only', () => {
  const lines = jobPaymentLines({
    jobstatus: 'Completed',
    PaymentType: 'Cash',
    TotalFare: 26.06,
    tmUsed: true,
    tmSubsidyFare: 9.79,
    tmSubsidyHoist: 11,
    tmPassengerPays: 5.27,
    hoistUses: 1,
  });
  const cash = lines.find((l) => l.bucket === 'cash');
  const tm = lines.find((l) => l.bucket === 'tm');
  const hoist = lines.find((l) => l.bucket === 'hoist');
  assert.equal(cash.owed, 0);
  assert.equal(cash.gross, 5.27);
  assert.equal(tm.owed, 9.79);
  assert.equal(hoist.owed, 11);
  const row = buildDriverSummaryRow({
    driverId: 'D001',
    driverName: 'D001',
    jobs: [
      {
        jobstatus: 'Completed',
        PaymentType: 'Cash',
        TotalFare: 26.06,
        tmUsed: true,
        tmSubsidyFare: 9.79,
        tmSubsidyHoist: 11,
        tmPassengerPays: 5.27,
        hoistUses: 1,
      },
    ],
  });
  assert.equal(row.pay.tm.owed, 9.79);
  assert.equal(row.pay.hoist.owed, 11);
  assert.equal(row.tmOwed, 20.79);
  assert.equal(row.tmDetail.subsidy, 9.79);
  assert.equal(row.tmDetail.councilPct, 65);
  assert.equal(row.tmDetail.passengerPct, 35);
});

test('TM % display: all nominal trips keep dollar-effective 65/35', () => {
  const jobs = [
    {
      jobstatus: 'Completed',
      PaymentType: 'Cash',
      tmUsed: true,
      TotalFare: 15.11,
      tmSubsidyFare: 9.82,
      tmPassengerPays: 5.29,
    },
    {
      jobstatus: 'Completed',
      PaymentType: 'Cash',
      tmUsed: true,
      TotalFare: 15.02,
      tmSubsidyFare: 9.76,
      tmPassengerPays: 5.26,
    },
  ];
  const row = buildDriverSummaryRow({ driverId: 'D001', jobs });
  assert.equal(row.tmDetail.subsidy, 19.58);
  assert.equal(row.tmDetail.passengerPays, 10.55);
  assert.equal(row.tmDetail.councilPct, 65);
  assert.equal(row.tmDetail.passengerPct, 35);
  assert.equal(row.tmDetail.councilPct + row.tmDetail.passengerPct, 100);
});

test('TM % display: zero-subsidy trips use dollar-effective, not inflated pax avg', () => {
  const jobs = [
    // Zero subsidy — old unweighted avg would pull Pax toward 100%
    {
      jobstatus: 'Completed',
      PaymentType: 'Cash',
      tmUsed: true,
      TotalFare: 5.55,
      tmSubsidyFare: 0,
      tmPassengerPays: 5.55,
    },
    {
      jobstatus: 'Completed',
      PaymentType: 'Cash',
      tmUsed: true,
      TotalFare: 15.11,
      tmSubsidyFare: 9.82,
      tmPassengerPays: 5.29,
    },
    {
      jobstatus: 'Completed',
      PaymentType: 'Cash',
      tmUsed: true,
      TotalFare: 15.02,
      tmSubsidyFare: 9.76,
      tmPassengerPays: 5.26,
    },
  ];
  const row = buildDriverSummaryRow({ driverId: 'D001', jobs });
  const sub = 0 + 9.82 + 9.76;
  const pax = 5.55 + 5.29 + 5.26;
  const expectedCouncil = Math.round((sub / (sub + pax)) * 1000) / 10;
  const expectedPax = Math.round((100 - expectedCouncil) * 10) / 10;
  assert.equal(row.tmDetail.subsidy, sub);
  assert.equal(row.tmDetail.passengerPays, pax);
  assert.equal(row.tmDetail.councilPct, expectedCouncil);
  assert.equal(row.tmDetail.passengerPct, expectedPax);
  assert.equal(row.tmDetail.councilPct + row.tmDetail.passengerPct, 100);
  // Old bug: unweighted mean of {100, 35, 35} ≈ 56.7 — must not appear
  assert.notEqual(row.tmDetail.passengerPct, 56.7);
  assert.ok(row.tmDetail.passengerPct < 50);
});

test('TM % display: matches Sub/(Sub+Pax) example dollars (excludes hoist)', () => {
  const row = buildDriverSummaryRow({
    driverId: 'D001',
    jobs: [
      {
        jobstatus: 'Completed',
        PaymentType: 'Cash',
        tmUsed: true,
        TotalFare: 640.29 + 361.42,
        tmSubsidyFare: 640.29,
        tmPassengerPays: 361.42,
      },
      {
        jobstatus: 'Completed',
        PaymentType: 'Cash',
        tmUsed: true,
        TotalFare: 55,
        tmSubsidyFare: 0,
        tmSubsidyHoist: 55,
        tmPassengerPays: 0,
        hoistUses: 5,
      },
    ],
  });
  assert.equal(row.tmDetail.subsidy, 640.29);
  assert.equal(row.tmDetail.passengerPays, 361.42);
  assert.equal(row.tmDetail.hoist, 55);
  assert.equal(row.tmDetail.councilPct, 63.9);
  assert.equal(row.tmDetail.passengerPct, 36.1);
});

test('TM subsidy owed: cash-remainder no hoist still contributes subsidy', () => {
  const lines = jobPaymentLines({
    PaymentType: 'Cash',
    TotalFare: 15.11,
    tmUsed: true,
    tmSubsidyFare: 9.82,
    tmPassengerPays: 5.29,
  });
  assert.equal(lines.find((l) => l.bucket === 'cash').owed, 0);
  assert.equal(lines.find((l) => l.bucket === 'cash').gross, 5.29);
  assert.equal(lines.find((l) => l.bucket === 'tm').owed, 9.82);
  assert.equal(lines.some((l) => l.bucket === 'hoist'), false);
  const row = buildDriverSummaryRow({
    driverId: 'D001',
    jobs: [
      {
        jobstatus: 'Completed',
        PaymentType: 'Cash',
        TotalFare: 15.11,
        tmUsed: true,
        tmSubsidyFare: 9.82,
        tmPassengerPays: 5.29,
      },
    ],
  });
  assert.equal(row.tmOwed, 9.82);
  assert.equal(row.pay.cash.gross, 5.29);
  assert.equal(row.pay.hoist.owed, 0);
  assert.equal(row.tmDetail.councilPct, 65);
  assert.equal(row.tmDetail.passengerPct, 35);
});

test('TM Cash remainder gross is passengerPays not full fare (live 8692608131)', () => {
  // fare $15.27, subsidy $9.93, passenger $5.34 — Cash bucket must show $5.34 not $15.27
  const job = {
    jobstatus: 'Completed',
    PaymentType: 'Cash',
    TotalFare: 15.27,
    isTotalMobility: true,
    tmSubsidyFare: 9.93,
    tmPassengerPays: 5.34,
    tmCouncilPays: 9.93,
  };
  const lines = jobPaymentLines(job);
  const cash = lines.find((l) => l.bucket === 'cash');
  const tm = lines.find((l) => l.bucket === 'tm');
  assert.equal(cash.gross, 5.34);
  assert.equal(cash.owed, 0);
  assert.equal(tm.gross, 9.93);
  assert.equal(tm.owed, 9.93);
  assert.notEqual(cash.gross, 15.27);
  const row = buildDriverSummaryRow({ driverId: 'D001', jobs: [job] });
  assert.equal(row.pay.cash.gross, 5.34);
  assert.equal(row.cashHeld, 5.34);
  assert.equal(row.tmDetail.passengerPays, 5.34);
  assert.equal(row.tmDetail.subsidy, 9.93);
});

test('TM subsidy owed: PaymentType===TM uses subsidy not full fare', () => {
  const lines = jobPaymentLines({
    PaymentType: 'TM',
    TotalFare: 32.02,
    tmSubsidyFare: 20.81,
    tmPassengerPays: 11.21,
  });
  assert.equal(lines.find((l) => l.bucket === 'tm').owed, 20.81);
  assert.ok(lines.every((l) => l.owed !== 32.02));
  const derived = jobPaymentLines({
    PaymentType: 'Total Mobility',
    TotalFare: 40,
    tmPassengerPays: 14,
  });
  assert.equal(derived.find((l) => l.bucket === 'tm').owed, 26);
  const row = buildDriverSummaryRow({
    driverId: 'd1',
    jobs: [
      {
        jobstatus: 'Completed',
        PaymentType: 'TM',
        TotalFare: 32.02,
        tmSubsidyFare: 20.81,
        tmPassengerPays: 11.21,
      },
    ],
  });
  assert.equal(row.tmOwed, 20.81);
  assert.equal(row.tmDetail.fare, 32.02);
  assert.equal(row.tmDetail.subsidy, 20.81);
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
