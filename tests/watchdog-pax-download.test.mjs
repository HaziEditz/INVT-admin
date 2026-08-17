/**
 * Watchdog-Pax must not pull allbookings ROOT (Firebase download cost).
 * Load-test tenants (bwtest*) are excluded; scans are per-cid after shallow keys.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'server.js'), 'utf8');

function sliceAround(needle, before = 200, after = 3500) {
  const idx = src.indexOf(needle);
  assert.ok(idx >= 0, 'missing ' + needle);
  return src.slice(Math.max(0, idx - before), idx + after);
}

test('Watchdog-Pax uses shallow allbookings keys then per-cid scans', () => {
  const cleanSlice = sliceAround('function _cleanStuckPassengerBookings');
  assert.match(cleanSlice, /shallow=true/);
  assert.match(cleanSlice, /proxyFirebaseRead\('allbookings'/);
  assert.match(cleanSlice, /_scanStuckPassengerBookingsForCid/);
  assert.doesNotMatch(cleanSlice, /db\.ref\('allbookings'\)\.once\('value'\)/);
  const scanSlice = sliceAround('function _scanStuckPassengerBookingsForCid');
  assert.match(scanSlice, /allbookings\/' \+ companyId/);
});

test('Watchdog-Pax excludes synthetic load-test company ids', () => {
  assert.match(src, /function _isSyntheticLoadTestCompanyId/);
  const slice = sliceAround('function _cleanStuckPassengerBookings');
  assert.match(slice, /_isSyntheticLoadTestCompanyId/);
  assert.match(src, /bwtest/);
  assert.match(src, /bwtesttariff/);
});

test('Watchdog-Pax still cancels Waiting\/Searching after 30 min', () => {
  assert.match(src, /PASSENGER_WAITING_CANCEL_MS = 30 \* 60 \* 1000/);
  const slice = sliceAround('function _scanStuckPassengerBookingsForCid');
  assert.match(slice, /waiting/);
  assert.match(slice, /searching/);
  assert.match(slice, /Passengerjobs/);
});
