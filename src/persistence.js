export const DEFAULT_QUEUE = Object.freeze([
  Object.freeze({ id: 'JyDM9RB3Tec', title: 'YouTube video JyDM9RB3Tec', author: '' }),
  Object.freeze({ id: 'Fofi08x84dA', title: 'YouTube video Fofi08x84dA', author: '' })
]);

const LEGACY_QUEUE_IDS = ['dQw4w9WgXcQ', 'jNQXAC9IVRM', '9bZkp7q19f0'];

export function resolveInitialQueue(savedQueue) {
  const isLegacyQueue = Array.isArray(savedQueue) &&
    savedQueue.length === LEGACY_QUEUE_IDS.length &&
    savedQueue.every((video, index) => video?.id === LEGACY_QUEUE_IDS[index]);

  if (!Array.isArray(savedQueue) || isLegacyQueue) {
    return {
      queue: DEFAULT_QUEUE.map(video => ({ ...video })),
      migrated: true
    };
  }

  return { queue: savedQueue, migrated: false };
}

export function createPersistence(storageProvider = () => globalThis.localStorage) {
  function read(key, fallback) {
    try {
      const value = storageProvider().getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      storageProvider().setItem(key, JSON.stringify(value));
    } catch {
      // Storage may be unavailable in private browsing or restricted contexts.
    }
  }

  return {
    loadQueue() {
      const result = resolveInitialQueue(read('youpod.queue', null));
      if (result.migrated) write('youpod.queue', result.queue);
      return result.queue;
    },
    saveQueue(queue) {
      write('youpod.queue', queue);
    },
    loadVolume() {
      const volume = read('youpod.vol', 80);
      return Number.isFinite(volume) ? Math.max(0, Math.min(100, volume)) : 80;
    },
    saveVolume(volume) {
      if (Number.isFinite(volume)) write('youpod.vol', Math.max(0, Math.min(100, volume)));
    }
  };
}
