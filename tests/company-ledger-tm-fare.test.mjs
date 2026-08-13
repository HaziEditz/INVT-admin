/**
 * Company ledger Track B — TM jobs use passenger portion, not full fare.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  jobFare,
  buildCompanyLedgerDriverRow,
  buildAccountDriverSummaryRow,
} from '../lib/companyLedgerSettlements.js';

test('jobFare: TM uses passengerPays not TotalFare', () => {
  assert.equal(
    jobFare({
      TotalFare: 15.31,
      isTotalMobility: true,
      tmSubsidyFare: 9.95,
      tmPassengerPays: 5.36,
    }),
    5.36,
  );
  assert.equal(jobFare({ TotalFare: 22.5, PaymentType: 'Account' }), 22.5);
});

test('jobFare: ACC-labeled TM same as Account passenger portion', () => {
  assert.equal(
    jobFare({
      TotalFare: 40,
      PaymentType: 'ACC',
      isTotalMobility: true,
      tmSubsidyFare: 26,
      tmPassengerPays: 14,
    }),
    14,
  );
});

test('Account/ACC company ledger owed is passenger portion for TM jobs', () => {
  const job = {
    jobstatus: 'Completed',
    PaymentType: 'Account',
    TotalFare: 15.31,
    isTotalMobility: true,
    tmSubsidyFare: 9.95,
    tmPassengerPays: 5.36,
  };
  const row = buildCompanyLedgerDriverRow({ driverId: 'D001', jobs: [job] });
  assert.equal(row.gross, 5.36);
  assert.equal(row.owedTotal, 5.36);
  assert.notEqual(row.gross, 15.31);

  const acc = buildAccountDriverSummaryRow({
    driverId: 'D001',
    jobs: [{ ...job, PaymentType: 'ACC' }],
  });
  assert.equal(acc.gross, 5.36);
  assert.equal(acc.owedTotal, 5.36);
});
