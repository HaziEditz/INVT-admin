import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  COMPANY_LEDGER_BUCKETS,
  accountSettlementPath,
  buildAccountDriverSummaryRow,
  isAccountLedgerPayment,
} from '../lib/companyLedgerSettlements.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('accountSettlementPath shape', () => {
  assert.equal(
    accountSettlementPath('860869', '2026-08', 'D001'),
    'accountDriverSettlements/860869/2026-08/D001',
  );
});

test('isAccountLedgerPayment for Account, ACC; Card false', () => {
  assert.equal(isAccountLedgerPayment('Account'), true);
  assert.equal(isAccountLedgerPayment('ACC'), true);
  assert.equal(isAccountLedgerPayment('Business Account'), true);
  assert.equal(isAccountLedgerPayment('corporate'), true);
  assert.equal(isAccountLedgerPayment('Card'), false);
  assert.equal(isAccountLedgerPayment('Cash'), false);
  assert.equal(isAccountLedgerPayment('EFTPOS'), false);
});

test('COMPANY_LEDGER_BUCKETS.account includes account', () => {
  assert.ok(COMPANY_LEDGER_BUCKETS.account.includes('account'));
});

test('buildAccountDriverSummaryRow: Account+ACC fares sum; Card ignored; locked zeros owed', () => {
  const jobs = [
    { PaymentType: 'Account', TotalFare: 40, jobstatus: 'Completed', vehicleId: 'T1', accountCode: 'ACC-9' },
    { PaymentType: 'ACC', TotalFare: 25, JobStatus: 'completed', TaxiNumber: 'T2' },
    { PaymentType: 'Card', TotalFare: 100, jobstatus: 'Completed' },
    { PaymentType: 'Account', TotalFare: 10, status: 'Cancelled' },
  ];
  const open = buildAccountDriverSummaryRow({
    driverId: 'D001',
    driverName: 'Ada',
    jobs,
  });
  assert.equal(open.completedCount, 2);
  assert.equal(open.owedTotal, 65);
  assert.equal(open.owedBeforeLock, 65);
  assert.equal(open.gross, 65);
  assert.equal(open.cancelled, 1);
  assert.equal(open.status, 'open');
  assert.ok(open.vehicles.includes('T1'));
  assert.ok(open.accountRefs.includes('ACC-9'));
  // Card job excluded from ledger job list
  assert.equal(open.jobCount, 3);

  const locked = buildAccountDriverSummaryRow({
    driverId: 'D001',
    driverName: 'Ada',
    jobs,
    settlement: { status: 'paid', locked: true, amountPaid: 65 },
  });
  assert.equal(locked.owedTotal, 0);
  assert.equal(locked.owedBeforeLock, 65);
  assert.equal(locked.status, 'paid');
  assert.equal(locked.locked, true);
  assert.equal(locked.completedCount, 2);
});

test('server.js links AccountDriverSettlements and AccReport includes pm===acc', () => {
  const src = readFileSync(join(root, 'server.js'), 'utf8');
  assert.match(src, /AccountDriverSettlements\.aspx/);
  assert.match(src, /Account \/ ACC Driver Pay/);
  assert.match(src, /accountdriversettlements\.aspx/);
  assert.match(src, /accountDriverSettlementsPage/);
  assert.match(src, /pm==='acc'/);
  assert.match(src, /pages\/accountDriverSettlements/);
});

test('owner page module exports and uses accountDriverSettlements path', async () => {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const build = require('../pages/accountDriverSettlements.js');
  const html = build(
    (h, b, s) => h + b + s,
    (title, css) => `<head>${title}${css}</head>`,
    (js) => js,
  );
  assert.match(html, /Account \/ ACC Driver Pay/);
  assert.match(html, /accountDriverSettlements\//);
  assert.doesNotMatch(html, /driverSettlements\//);
  assert.match(html, /ledgerKind:'account'/);
  assert.match(html, /adsLoad\(\)/);
});
