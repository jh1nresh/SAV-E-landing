import test from 'node:test';
import assert from 'node:assert/strict';
import { isFresh, isNewStore, stationIsNew, weekNewCount } from '../../lib/metro-logic.mjs';
const store = (overrides = {}) => ({ kind: 'post', backfill: false, addedAt: '2026-10-27', sourcePosts: [{ date: '2026-10-27' }], ...overrides });

test('NF-1: only post entries after the flow start, going live within 0–3 days, qualify', () => {
  for (const date of ['2026-10-21','2026-10-25','2026-10-26']) {
    assert.equal(isFresh(store({ addedAt: date, sourcePosts: [{ date }] })), false, date);
  }
  assert.equal(isFresh(store()), true);
  assert.equal(isFresh(store({ addedAt: '2026-10-30' })), true);
  assert.equal(isFresh(store({ addedAt: '2026-10-31' })), false);
  assert.equal(isFresh(store({ addedAt: '2026-10-26' })), false);
  assert.equal(isFresh(store({ kind: 'example' })), false);
  assert.equal(isFresh(store({ backfill: true })), false);
  assert.equal(isFresh(store({ sourcePosts: [{ date: '2026-10-25' }, { date: '2026-10-27' }] })), true);
});

test('NF-1: malformed and impossible dates fail closed', () => {
  for (const date of ['2026-02-30','2026-13-01','garbage','2026-1-1','']) {
    assert.equal(isFresh(store({ addedAt: date })), false);
    assert.equal(isFresh(store({ sourcePosts: [{ date }] })), false);
    assert.equal(isNewStore(store(), date), false);
  }
  for (const sourcePosts of [[], null, [null], [{ date: '2026-10-27' }, { date: '2026-02-30' }]]) {
    assert.equal(isFresh(store({ sourcePosts })), false);
  }
});

test('N-1/N-2: seven-day display runs from go-live, not publication', () => {
  const s = store({ addedAt: '2026-10-30' });
  for (const [clock, expected] of [['2026-10-29',false],['2026-10-30',true],['2026-11-05',true],['2026-11-06',false],['2026-11-07',false]]) {
    assert.equal(isNewStore(s, clock), expected, clock);
  }
});

test('N-4: counts and station markers agree for mixed, backfill and expired stores', () => {
  const stores = [store(), store({ kind: 'example' }), store({ backfill: true }), store({ addedAt: '2026-10-31' })];
  assert.equal(weekNewCount(stores, '2026-10-31'), 1);
  assert.equal(stationIsNew(stores, '2026-10-31'), true);
  assert.equal(weekNewCount(stores, '2026-11-03'), 0);
  assert.equal(stationIsNew(stores, '2026-11-03'), false);
  assert.equal(stationIsNew([], '2026-10-27'), false);
});
