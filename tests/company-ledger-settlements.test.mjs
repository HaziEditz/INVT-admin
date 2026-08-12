import assert from 'node:assert/strict';
import test from 'node:test';
import {
  accountSettlementPath,
  buildAccountDriverSummaryRow,
  companyLedgerSettlementPath,
  companyLedgerSettlementRoot,
  isAccountLedgerPayment,
  isCompanyLedgerPayment,
} from '../lib/companyLedgerSettlements.js';

test('account ledger paths are isolated from driverSettlements', () => {
  assert.equal(companyLedgerSettlementRoot('account'), 'accountDriverSettlements');
  assert.equal(
    accountSettlementPath('860869', '2026-08', 'D001'),
    'accountDriverSettlements/860869/2026-08/D001',
  );
  assert.equal(
    companyLedgerSettlementPath('account', 'c1', 'W2026-08-10', 'D002'),
    'accountDriverSettlements/c1/W2026-08-10/D002',
  );
  assert.equal(
    companyLedgerSettlementRoot('food'),
    'companyLedgerSettlements/food',
  );
});

test('isAccountLedgerPayment matches Account and ACC only', () => {
  assert.equal(isAccountLedgerPayment('Account'), true);
  assert.equal(isAccountLedgerPayment('ACC'), true);
  assert.equal(isAccountLedgerPayment('Business Account'), true);
  assert.equal(isAccountLedgerPayment('Cash'), false);
  assert.equal(isAccountLedgerPayment('Card'), false);
  assert.equal(isAccountLedgerPayment('EFTPOS'), false);
  assert.equal(isAccountLedgerPayment('Total Mobility'), false);
  assert.equal(isCompanyLedgerPayment('account', 'acc'), true);
});

test('buildAccountDriverSummaryRow owes full completed Account/ACC gross until locked', () => {
  const jobs = [
    { jobstatus: 'Completed', PaymentType: 'Account', TotalFare: 60, accountNumber: '001' },
    { jobstatus: 'Completed', PaymentType: 'ACC', TotalFare: 25, AccountCode: 'ACC-001' },
    { jobstatus: 'Completed', PaymentType: 'Cash', TotalFare: 40 },
    { jobstatus: 'Cancelled', PaymentType: 'Account', TotalFare: 99 },
  ];
  const open = buildAccountDriverSummaryRow({
    driverId: 'D001',
    driverName: 'Sam',
    jobs,
    bankName: 'ANZ',
    accountName: 'Sam Driver',
    accountNumber: '12-3456-7890123-00',
  });
  assert.equal(open.kind, 'account');
  assert.equal(open.completedCount, 2);
  assert.equal(open.cancelled, 1);
  assert.equal(open.gross, 85);
  assert.equal(open.owedTotal, 85);
  assert.equal(open.owedBeforeLock, 85);
  assert.equal(open.status, 'open');
  assert.equal(open.locked, false);
  assert.ok(open.accountRefs.includes('001'));
  assert.ok(open.accountRefs.includes('ACC-001'));
  assert.match(open.formatAmount, /\$85\.00/);

  const locked = buildAccountDriverSummaryRow({
    driverId: 'D001',
    driverName: 'Sam',
    jobs,
    settlement: { status: 'paid', locked: true, amountPaid: 85 },
  });
  assert.equal(locked.status, 'paid');
  assert.equal(locked.locked, true);
  assert.equal(locked.owedTotal, 0);
  assert.equal(locked.owedBeforeLock, 85);
});
