/**
 * Owner TM Trip History: From/To date range + driver filter (DOS pattern).
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const serverSrc = readFileSync(join(root, 'server.js'), 'utf8');

const histStart = serverSrc.indexOf('id="tm-month-filter"');
assert.ok(histStart >= 0, 'tm-month-filter missing');
const histEnd = serverSrc.indexOf('function loadTrips', histStart);
const histChunk = serverSrc.slice(histStart, histEnd > histStart ? histEnd : histStart + 12000);

test('owner Trip History toolbar has From/To + driver filter', () => {
  assert.match(histChunk, /id="tm-from-filter"/);
  assert.match(histChunk, /id="tm-to-filter"/);
  assert.match(histChunk, /id="tm-driver-filter"/);
  assert.match(histChunk, /All Drivers/);
});

test('owner filterTrips wires driver + NZ From/To via _tmTs', () => {
  assert.match(serverSrc, /function populateDriverFilter/);
  assert.match(serverSrc, /populateDriverFilter\(trips\)/);
  assert.match(histChunk, /tm-driver-filter/);
  assert.match(histChunk, /_tzDayStart\(fromYmd, NZ_TZ\)/);
  assert.match(histChunk, /_tzDayEnd\(toYmd, NZ_TZ\)/);
  assert.match(histChunk, /did !== driverKey && dname !== driverKey/);
});

test('owner date filter uses existing _tmTs (completedAt fallback intact)', () => {
  assert.match(serverSrc, /function _tmTs\(t\)/);
  assert.match(serverSrc, /completedAt_ISO \|\| t\.completedAt \|\| t\.startedAt_ISO/);
});
