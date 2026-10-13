const ICON_PLAY = '<svg viewBox="0 0 10 10"><path d="M1 0.5L9.5 5L1 9.5z"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 10 10"><path d="M1.5 0.5h2.6v9H1.5zM5.9 0.5h2.6v9H5.9z"/></svg>';
const CHEVRON = '<svg viewBox="0 0 10 10"><path d="M2.5 0.5L7.5 5L2.5 9.5L1.5 8.5L5.5 5L1.5 1.5z"/></svg>';
const VISIBLE_ROWS = 9;

export function formatTime(seconds) {
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function createScreens({
  getQueue,
  getCurrentIndex,
  getPlaybackState,
  getNowPlayingMessage,
  onPlay,
  onShuffle,
  onClearQueue,
  onTogglePlay,
  onSubmitVideo,
  onClick
}) {
  const $ = id => document.getElementById(id);
  const listElement = $('list');
  const nowPlayingScreen = { kind: 'nowPlaying', title: 'Now Playing' };
  const addVideoScreen = { kind: 'addVideo', title: 'Add Video' };
  const aboutScreen = {
    kind: 'text',
    title: 'About',
    build: () => [
      'Wheel: scroll lists, or volume',
      'Center: select / play / pause',
      'Top: Menu (back)',
      'Left / right: previous / next',
      'Bottom: play / pause',
      'Videos play through the official',
      'YouTube player. Titles come from',
      'YouTube once a video loads.'
    ].map(label => ({ label, plain: true }))
  };

  function push(screen) {
    if (currentScreen === screen) return;
    stack.push(screen);
    currentScreen = screen;
    render();
  }

  function openNowPlaying() {
    if (currentScreen !== nowPlayingScreen) push(nowPlayingScreen);
    else render();
  }

  const queueScreen = {
    kind: 'menu',
    title: 'Queue',
    selected: 0,
    top: 0,
    build: () => {
      const items = getQueue().map((video, index) => ({
        label: video.title,
        now: index === getCurrentIndex(),
        activate: () => onPlay(index)
      }));
      items.push({ label: 'Add Video', chevron: true, activate: () => push(addVideoScreen) });
      if (getQueue().length) items.push({ label: 'Clear Queue', activate: onClearQueue });
      return items;
    }
  };

  const mainScreen = {
    kind: 'menu',
    title: 'YouPod',
    selected: 0,
    top: 0,
    build: () => [
      { label: 'Now Playing', activate: openNowPlaying },
      { label: 'Queue', chevron: true, activate: () => push(queueScreen) },
      { label: 'Add Video', chevron: true, activate: () => push(addVideoScreen) },
      { label: 'Shuffle All', activate: onShuffle },
      { label: 'About', chevron: true, activate: () => push(aboutScreen) }
    ]
  };

  const stack = [mainScreen];
  let currentScreen = mainScreen;

  function renderList() {
    const items = currentScreen.build();
    if (currentScreen.kind === 'menu') {
      currentScreen.selected = Math.max(0, Math.min(items.length - 1, currentScreen.selected || 0));
      if (currentScreen.selected < currentScreen.top) currentScreen.top = currentScreen.selected;
      if (currentScreen.selected >= currentScreen.top + VISIBLE_ROWS) {
        currentScreen.top = currentScreen.selected - VISIBLE_ROWS + 1;
      }
    } else {
      currentScreen.top = 0;
      currentScreen.selected = -1;
    }

    listElement.replaceChildren();
    const visibleItems = items.slice(currentScreen.top, currentScreen.top + VISIBLE_ROWS);
    visibleItems.forEach((item, offset) => {
      const index = currentScreen.top + offset;
      const row = document.createElement(item.plain ? 'div' : 'button');
      row.className = `row${index === currentScreen.selected ? ' sel' : ''}${item.plain ? ' plain' : ''}`;
      if (!item.plain) {
        row.type = 'button';
        if (item.now) row.setAttribute('aria-current', 'true');
      }
      const label = document.createElement('span');
      label.textContent = item.label;
      row.append(label);

      if (item.chevron || item.now) {
        const marker = document.createElement('span');
        marker.className = 'r';
        marker.setAttribute('aria-hidden', 'true');
        marker.innerHTML = item.now
          ? (getPlaybackState() === 1 ? ICON_PLAY : ICON_PAUSE)
          : CHEVRON;
        row.append(marker);
      }

      if (!item.plain) {
        row.addEventListener('click', () => {
          currentScreen.selected = index;
          renderList();
          onClick();
          item.activate?.();
        });
      }
      listElement.append(row);
    });

    if (items.length > VISIBLE_ROWS) {
      const trackHeight = 24 * VISIBLE_ROWS;
      const thumbHeight = Math.max(18, trackHeight * VISIBLE_ROWS / items.length);
      const offset = (trackHeight - thumbHeight) * (currentScreen.top / (items.length - VISIBLE_ROWS));
      const scrollbar = document.createElement('div');
      scrollbar.className = 'scroll';
      scrollbar.style.height = `${thumbHeight}px`;
      scrollbar.style.top = `${offset}px`;
      listElement.append(scrollbar);
    }
  }

  function updateIndicator() {
    const currentIndex = getCurrentIndex();
    const playbackState = getPlaybackState();
    $('ind').innerHTML = currentIndex < 0
      ? ''
      : playbackState === 1 ? ICON_PLAY : playbackState === 2 ? ICON_PAUSE : '';
  }

  function updateNowPlaying() {
    const video = getQueue()[getCurrentIndex()];
    $('t1').textContent = video ? video.title : 'Not Playing';
    $('t2').textContent = video ? video.author : '';
    const message = getNowPlayingMessage();
    $('vnote').textContent = message;
    $('vnote').hidden = !message;
  }

  function render() {
    const kind = currentScreen.kind;
    $('ttl').textContent = currentScreen.title;
    listElement.hidden = !(kind === 'menu' || kind === 'text');
    $('np').hidden = kind !== 'nowPlaying';
    $('add').hidden = kind !== 'addVideo';
    $('vid').classList.toggle('on', kind === 'nowPlaying');

    if (kind === 'menu' || kind === 'text') renderList();
    if (kind === 'nowPlaying') updateNowPlaying();
    if (kind === 'addVideo') $('msg').textContent = '';
    updateIndicator();
  }

  function submitAdd() {
    const input = $('url');
    const message = $('msg');
    const result = onSubmitVideo(input.value);
    if (!result.ok) {
      message.style.color = '#c0392b';
      message.textContent = result.message;
      return;
    }

    message.style.color = '#2a8a3c';
    message.textContent = 'Added to queue.';
    input.value = '';
    input.blur();
    setTimeout(() => {
      back();
      queueScreen.selected = result.index;
      onPlay(result.index);
    }, 500);
  }

  function back() {
    if (stack.length > 1) {
      stack.pop();
      currentScreen = stack[stack.length - 1];
      render();
    }
  }

  function move(direction) {
    if (currentScreen.kind !== 'menu') return false;
    currentScreen.selected += direction;
    renderList();
    return true;
  }

  function select() {
    if (currentScreen.kind === 'menu') {
      const item = currentScreen.build()[currentScreen.selected];
      if (item?.activate) {
        onClick();
        item.activate();
      }
    } else if (currentScreen.kind === 'nowPlaying') {
      onTogglePlay();
    } else if (currentScreen.kind === 'addVideo') {
      const input = $('url');
      if (input.value.trim()) submitAdd();
      else if (navigator.clipboard?.readText) {
        navigator.clipboard.readText().then(text => {
          input.value = text;
          submitAdd();
        }).catch(() => input.focus());
      } else {
        input.focus();
      }
    }
  }

  $('url').addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submitAdd();
    }
  });

  return {
    render,
    refreshPlayback() {
      updateIndicator();
      if (currentScreen === queueScreen) renderList();
      if (currentScreen === nowPlayingScreen) updateNowPlaying();
    },
    updateProgress(currentTime, duration) {
      const progress = duration ? Math.min(100, currentTime / duration * 100) : 0;
      $('fill').style.width = `${progress}%`;
      $('fill').parentElement.setAttribute('aria-valuenow', String(Math.round(progress)));
      $('tEl').textContent = formatTime(currentTime);
      $('tRem').textContent = `-${formatTime(Math.max(0, duration - currentTime))}`;
    },
    openNowPlaying,
    back,
    move,
    select,
    isNowPlaying: () => currentScreen === nowPlayingScreen
  };
}
