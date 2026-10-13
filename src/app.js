import { createInputController } from './input.js';
import { createIpodScene } from './ipod-scene.js';
import { createPersistence } from './persistence.js';
import { createScreens } from './screens.js';
import { createYouTubePlayer, parseVideoId } from './youtube-player.js';

if (!window.THREE) throw new Error('Three.js failed to load.');

const persistence = createPersistence();
let queue = persistence.loadQueue();
let currentIndex = -1;
let playbackState = -1;
let volume = persistence.loadVolume();
let player = null;
let playerReady = false;
let pendingVideoId = null;
let apiFailed = false;
let embedError = false;
let inputController;
let volumeTimer;

const scene = createIpodScene({
  THREE: window.THREE,
  canvas: document.getElementById('gl'),
  lcd: document.getElementById('lcd'),
  stage: document.getElementById('stage')
});

function getNowPlayingMessage() {
  if (apiFailed) {
    return 'The YouTube player could not load. Check your connection, and open this page from a web address rather than inside a preview.';
  }
  if (embedError) {
    return 'The owner of this video does not allow it to play here. Press the right side of the wheel for the next one.';
  }
  if (currentIndex < 0) {
    return 'Pick a video from Queue, or press the bottom of the wheel to play.';
  }
  return '';
}

const screens = createScreens({
  getQueue: () => queue,
  getCurrentIndex: () => currentIndex,
  getPlaybackState: () => playbackState,
  getNowPlayingMessage,
  onPlay: playIndex,
  onShuffle: shuffle,
  onClearQueue: clearQueue,
  onTogglePlay: togglePlay,
  onSubmitVideo: addVideo,
  onClick: () => inputController?.playClick()
});

function saveQueue() {
  persistence.saveQueue(queue);
}

function playIndex(index) {
  if (!queue.length) return;
  currentIndex = ((index % queue.length) + queue.length) % queue.length;
  embedError = false;
  const videoId = queue[currentIndex].id;
  if (playerReady) {
    try {
      player.loadVideoById(videoId);
    } catch {}
  } else {
    pendingVideoId = videoId;
  }
  screens.openNowPlaying();
}

function togglePlay() {
  if (currentIndex < 0) {
    if (queue.length) playIndex(0);
    return;
  }
  if (!playerReady) return;
  try {
    if (playbackState === 1) player.pauseVideo();
    else player.playVideo();
  } catch {
    return;
  }
}

function next() {
  if (queue.length) playIndex(currentIndex < 0 ? 0 : currentIndex + 1);
}

function previous() {
  if (!queue.length) return;
  let currentTime = 0;
  try {
    currentTime = playerReady ? player.getCurrentTime() : 0;
  } catch {
    currentTime = 0;
  }
  if (currentTime > 3 && playerReady) {
    try {
      player.seekTo(0, true);
    } catch {
      return;
    }
  } else {
    playIndex(currentIndex < 0 ? 0 : currentIndex - 1);
  }
}

function shuffle() {
  if (queue.length) playIndex(Math.floor(Math.random() * queue.length));
}

function clearQueue() {
  queue = [];
  currentIndex = -1;
  saveQueue();
  if (playerReady) {
    try {
      player.stopVideo();
    } catch {
      playbackState = -1;
    }
  }
  screens.render();
}

function addVideo(value) {
  const id = parseVideoId(value);
  if (!id) return { ok: false, message: 'That is not a YouTube link.' };

  queue.push({ id, title: `YouTube video ${id}`, author: '' });
  saveQueue();
  return { ok: true, index: queue.length - 1 };
}

function move(direction) {
  if (screens.move(direction)) return;
  if (!screens.isNowPlaying()) return;

  volume = Math.max(0, Math.min(100, volume + direction * 4));
  persistence.saveVolume(volume);
  if (playerReady) {
    try {
      player.setVolume(volume);
    } catch {
      // Keep the saved preference even if the player is unavailable.
    }
  }
  showVolume();
}

function showVolume() {
  const volumeElement = document.getElementById('vol');
  document.getElementById('volFill').style.width = `${volume}%`;
  volumeElement.hidden = false;
  clearTimeout(volumeTimer);
  volumeTimer = setTimeout(() => { volumeElement.hidden = true; }, 1200);
}

function syncVideoMetadata() {
  try {
    const details = player.getVideoData();
    const video = queue[currentIndex];
    if (details && video && details.video_id === video.id && details.title &&
        (details.title !== video.title || details.author !== video.author)) {
      video.title = details.title;
      video.author = details.author || video.author;
      saveQueue();
      screens.refreshPlayback();
    }
  } catch {
    return;
  }
}

function initializePlayer() {
  const playerVars = {
    controls: 0,
    disablekb: 1,
    playsinline: 1,
    rel: 0,
    modestbranding: 1,
    iv_load_policy: 3,
    fs: 0
  };
  if (/^https?:$/.test(location.protocol)) playerVars.origin = location.origin;

  createYouTubePlayer('yt', playerVars, {
    onReady(event) {
      player = event.target || player;
      playerReady = true;
      apiFailed = false;
      try {
        player.setVolume(volume);
      } catch {
        // Player setup can finish before every API method is available.
      }
      if (pendingVideoId) {
        try {
          player.loadVideoById(pendingVideoId);
        } catch {
          embedError = true;
        }
        pendingVideoId = null;
      }
      if (screens.isNowPlaying()) screens.refreshPlayback();
    },
    onStateChange(event) {
      playbackState = event.data;
      if (playbackState === 1 || playbackState === 5) {
        embedError = false;
        syncVideoMetadata();
      }
      if (playbackState === 0) next();
      screens.refreshPlayback();
    },
    onError() {
      embedError = true;
      playbackState = -1;
      screens.refreshPlayback();
    }
  }).then(instance => {
    player = instance;
  }).catch(() => {
    apiFailed = true;
    if (screens.isNowPlaying()) screens.refreshPlayback();
  });
}

const progressTimer = setInterval(() => {
  if (!playerReady || currentIndex < 0 || !screens.isNowPlaying()) return;
  try {
    screens.updateProgress(player.getCurrentTime() || 0, player.getDuration() || 0);
  } catch {
    return;
  }
}, 400);

inputController = createInputController({
  canvas: scene.canvas,
  getWheelMetrics: scene.getWheelMetrics,
  mapPointer: scene.mapPointer,
  press: scene.press,
  release: scene.release,
  onMove: move,
  onSelect: screens.select,
  onBack: screens.back,
  onNext: next,
  onPrevious: previous,
  onTogglePlay: togglePlay
});

function destroy() {
  clearInterval(progressTimer);
  clearTimeout(volumeTimer);
  inputController.destroy();
  scene.destroy();
}

window.addEventListener('pagehide', destroy, { once: true });
screens.render();
initializePlayer();
