/**
 * Source wiring: SA + owner DOS emit Card TM remainder; account adsJobFare uses pax.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const saRoot = join(root, '..', 'INVT-superadmin');

test('owner + SA DOS include Card TM remainder branch', () => {
  const owner = readFileSync(join(root, 'pages/driverOpsSummary.js'), 'utf8');
  const sa = readFileSync(
    join(saRoot, 'taxitime.co.nz/superadmin360taxi/SA-DriverOpsSummary.aspx'),
    'utf8',
  );
  for (const [label, src] of [
    ['owner', owner],
    ['sa', sa],
  ]) {
    assert.match(src, /main\.bucket==='card'/, `${label} missing card remainder branch`);
    assert.match(src, /dosCompanyOwesDriver\(paxGross/, `${label} missing card commission on pax`);
  }
});

test('owner + SA account settlements adsJobFare uses TM passenger portion', () => {
  const owner = readFileSync(join(root, 'pages/accountDriverSettlements.js'), 'utf8');
  const sa = readFileSync(
    join(saRoot, 'taxitime.co.nz/superadmin360taxi/SA-AccountDriverSettlements.aspx'),
    'utf8',
  );
  for (const [label, src] of [
    ['owner', owner],
    ['sa', sa],
  ]) {
    assert.match(src, /function adsJobFare\(job\)/, `${label} missing adsJobFare`);
    assert.match(src, /tmPassengerPays/, `${label} adsJobFare missing passenger portion`);
    assert.match(src, /isTotalMobility/, `${label} adsJobFare missing TM detect`);
  }
});
