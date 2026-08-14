/**
 * Owner dashboard Firebase download hygiene — shared tree cache + no double fetch.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'server.js'), 'utf8');

test('dashboard shares one tree cache for today/totals/upcoming', () => {
  assert.match(src, /var DASH_TREE_TTL_MS = 5 \* 60 \* 1000/);
  assert.match(src, /function _dashLoadTrees/);
  assert.match(src, /_dashLoadTrees\(\)/);
  // Today + totals + upcoming all go through the cache helper
  assert.match(src, /return _dashLoadTrees\(\)/);
  assert.match(src, /var pJobStats = _dashLoadTrees\(\)/);
  assert.match(src, /_dashLoadTrees\(\)\.then\(function\(cache\)/);
});

test('dashboard totals compute TM + channels from one cache hit', () => {
  assert.match(src, /function _dashCountCompletedChannels/);
  assert.match(src, /var pJobStats = _dashLoadTrees/);
  assert.doesNotMatch(src, /var pCompleted = window\.adminRead\('completedJobs/);
  assert.doesNotMatch(src, /var pTm = Promise\.all\(\[\s*\n\s*window\.adminRead\('completedJobs/);
});

test('dashboard tree cache TTL is at least 5 minutes', () => {
  const m = src.match(/DASH_TREE_TTL_MS\s*=\s*([^;]+);/);
  assert.ok(m);
  // eslint-disable-next-line no-new-func
  const ttl = Function(`return (${m[1]})`)();
  assert.ok(ttl >= 5 * 60 * 1000);
});
