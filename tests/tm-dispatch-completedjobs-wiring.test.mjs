/**
 * Wire check: INVT completeBooking schedules completedJobs upsert.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const invt = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'INVT');

test('INVT server wires upsertCompletedJobFromDispatch on complete + force-complete', () => {
  const src = readFileSync(join(invt, 'server.js'), 'utf8');
  assert.match(src, /upsertCompletedJobFromDispatch/);
  assert.match(src, /_scheduleUpsertCompletedJobFromDispatch\(job,/);
  assert.match(src, /_scheduleUpsertCompletedJobFromDispatch\(_closed,/);
  assert.match(src, /_scheduleUpsertCompletedJobFromDispatch\(_fcJob,/);
  assert.match(src, /lib\/upsertCompletedJobFromDispatch\.cjs/);
});
