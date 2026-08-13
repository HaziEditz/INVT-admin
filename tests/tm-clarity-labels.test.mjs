/**
 * Owner TM clarity pass: Gross fare + Meter base + always-visible subtext.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const serverSrc = readFileSync(join(root, 'server.js'), 'utf8');
const dosPage = readFileSync(join(root, 'pages/driverOpsSummary.js'), 'utf8');
const wiring = readFileSync(join(root, 'tmp-dos-owner-wiring.js'), 'utf8');

test('owner Trip History totals use Gross fare + Meter base + hints', () => {
  assert.match(serverSrc, /Gross fare \(meter \+ hoist\)/);
  assert.match(serverSrc, /Meter base \(%\/cap applies here\)/);
  assert.match(serverSrc, /%\/cap applies to Meter base, not this number/);
  assert.match(serverSrc, /Applied to Meter base · excludes hoist/);
});

test('owner Claim Batches Gross fare column + Meter base subtext', () => {
  assert.match(serverSrc, /Gross fare \(meter \+ hoist\)<\/th>/);
  assert.match(serverSrc, /Meter base \(~%\/cap\):/);
  assert.match(serverSrc, /includes hoist when present — %\/cap is not on this number/);
});

test('owner trip detail Fare Breakdown uses Gross + Meter base labels', () => {
  assert.match(serverSrc, /Gross fare \(meter \+ hoist\)/);
  assert.match(serverSrc, /Meter base \(%\/cap applies here\)/);
  assert.doesNotMatch(
    serverSrc.slice(serverSrc.indexOf('Fare Breakdown'), serverSrc.indexOf('Fare Breakdown') + 1200),
    /Meter Fare \(total\)/,
  );
});

test('owner DOS page + wiring clarity labels', () => {
  assert.match(wiring, /Gross fare \(meter \+ hoist\)/);
  assert.match(wiring, /Meter base \(%\/cap applies here\)/);
  assert.match(wiring, /Gross .+ Meter base /);
  assert.match(dosPage, /Gross fare \(meter \+ hoist\)/);
  assert.match(dosPage, /Meter base \(%\/cap applies here\)/);
});
