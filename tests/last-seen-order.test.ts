import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldAdvanceLastSeen } from '../src/utils/last-seen-order';

test('first last-seen pointer is accepted', () => {
  assert.equal(shouldAdvanceLastSeen(undefined, undefined, 1000, 'a'), true);
});

test('newer timestamp advances the pointer', () => {
  assert.equal(shouldAdvanceLastSeen(1000, 'z', 1001, 'a'), true);
});

test('older timestamp never moves the pointer backwards', () => {
  assert.equal(shouldAdvanceLastSeen(1001, 'a', 1000, 'z'), false);
});

test('equal timestamps use a stable message-id tie breaker', () => {
  assert.equal(shouldAdvanceLastSeen(1000, 'a', 1000, 'b'), true);
  assert.equal(shouldAdvanceLastSeen(1000, 'b', 1000, 'a'), false);
});
