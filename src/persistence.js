// Top-5 hip-hop on YouTube's US Top Songs chart (week of 2026-10-23..29,
// ranks pulled from charts.youtube.com on 2026-11-03; links resolved to
// the official artist channels).
export const DEFAULT_QUEUE = Object.freeze([
  Object.freeze({ id: '9ofUM-_3uQ4', title: 'Thin Ice', author: 'Megan Thee Stallion' }),
  Object.freeze({ id: 'xxFjwI1qYmc', title: 'WTF GOIN ft. 21 Savage', author: 'Belly Gang Kushington' }),
  Object.freeze({ id: 'h5u4dKq8C2w', title: 'Janice STFU', author: 'Drake' }),
  Object.freeze({ id: 'I-5e_J3LWS8', title: 'AH HA', author: 'Cardi B' }),
  Object.freeze({ id: 'g9Yo1sLnbjo', title: 'Dope Girl', author: 'Rod Wave' })
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
