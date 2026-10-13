import assert from 'node:assert/strict';
import test from 'node:test';
import { createPersistence, DEFAULT_QUEUE, resolveInitialQueue } from '../src/persistence.js';

const legacyQueue = [
  { id: 'dQw4w9WgXcQ', title: 'Never Gonna Give You Up', author: 'Rick Astley' },
  { id: 'jNQXAC9IVRM', title: 'Me at the zoo', author: 'jawed' },
  { id: '9bZkp7q19f0', title: 'Gangnam Style', author: 'PSY' }
];

function createMemoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, value); },
    values
  };
}

test('new installs receive the current default queue', () => {
  const result = resolveInitialQueue(null);
  assert.equal(result.migrated, true);
  assert.deepEqual(result.queue.map(video => video.id), DEFAULT_QUEUE.map(video => video.id));
});

test('the exact legacy sample queue migrates to the current defaults', () => {
  const result = resolveInitialQueue(legacyQueue);
  assert.equal(result.migrated, true);
  assert.deepEqual(result.queue.map(video => video.id), ['JyDM9RB3Tec', 'Fofi08x84dA']);
});

test('custom and intentionally empty queues are preserved', () => {
  const customQueue = [{ id: 'abcdefghijk', title: 'My video', author: '' }];
  assert.deepEqual(resolveInitialQueue(customQueue), { queue: customQueue, migrated: false });
  assert.deepEqual(resolveInitialQueue([]), { queue: [], migrated: false });
});

test('loading a legacy queue persists the migrated defaults', () => {
  const storage = createMemoryStorage({ 'youpod.queue': JSON.stringify(legacyQueue) });
  const persistence = createPersistence(() => storage);
  assert.deepEqual(persistence.loadQueue().map(video => video.id), ['JyDM9RB3Tec', 'Fofi08x84dA']);
  assert.deepEqual(JSON.parse(storage.values.get('youpod.queue')).map(video => video.id), ['JyDM9RB3Tec', 'Fofi08x84dA']);
});

test('volume loading validates and clamps stored values', () => {
  const storage = createMemoryStorage({ 'youpod.vol': '140' });
  const persistence = createPersistence(() => storage);
  assert.equal(persistence.loadVolume(), 100);
  persistence.saveVolume(140);
  assert.equal(JSON.parse(storage.values.get('youpod.vol')), 100);
});
