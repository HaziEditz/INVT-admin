/**
 * Owner TM Cardholder Usage tab wiring.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const serverSrc = readFileSync(join(root, 'server.js'), 'utf8');

test('owner PAGE_MAP + route + sidebar for tm_usage', () => {
  assert.match(serverSrc, /tm_usage\.aspx/);
  assert.match(serverSrc, /TM Cardholder Usage/);
  assert.match(serverSrc, /function tmUsagePage/);
  assert.match(serverSrc, /TM_Usage\.aspx/);
  assert.match(serverSrc, /Cardholder Usage/);
  assert.match(serverSrc, /lname === 'tm_usage\.aspx'/);
});

test('owner usage page uses shared aggregate + day/month + fare columns', () => {
  assert.match(serverSrc, /tmUsageAggregate\.client\.js/);
  assert.match(serverSrc, /tuSetPeriod/);
  assert.match(serverSrc, /aggregateTripUsage/);
  assert.match(serverSrc, /Fare \$/);
  assert.match(serverSrc, /Pax \$/);
  assert.match(serverSrc, /Pay type/);
  assert.ok(
    existsSync(join(root, 'taxitime.co.nz/owner/assets/js/tmUsageAggregate.client.js')),
  );
});
