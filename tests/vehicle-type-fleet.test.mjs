/**
 * Vehicle Fleet type dropdown must load Settings → Vehicle Types (incl. Wheelchair).
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'server.js'), 'utf8');

test('fleet vehicle modal loads vehicleTypes config into #v-type', () => {
  assert.match(src, /function loadFleetVehicleTypes/);
  assert.match(src, /vehicleTypes\/' \+ cid/);
  assert.match(src, /loadFleetVehicleTypes\(\)/);
  assert.match(src, /loadFleetVehicleTypes\(preferredType\)/);
  assert.match(src, /Wheelchair/);
  assert.match(src, /#v-type|id="v-type"/);
});

test('openVehicleModal applies preferred type after config load', () => {
  assert.match(src, /Populate from live Vehicle Types config/);
  assert.match(src, /orphan\.textContent = keep \+ ' \(saved\)'/);
});
