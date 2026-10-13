let apiPromise;

export function parseVideoId(value) {
  if (typeof value !== 'string') return null;

  const input = value.trim();
  if (/^[\w-]{11}$/.test(input)) return input;

  let url;
  try {
    url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(input) ? input : `https://${input}`);
  } catch {
    return null;
  }

  const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  if (hostname === 'youtu.be') {
    return url.pathname.slice(1).match(/^[\w-]{11}$/)?.[0] || null;
  }

  if (!['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com'].includes(hostname)) {
    return null;
  }

  const id = url.searchParams.get('v') || url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})(?:\/|$)/)?.[1];
  return id && /^[\w-]{11}$/.test(id) ? id : null;
}

export function loadYouTubeApi(timeoutMs = 8000) {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const previousCallback = window.onYouTubeIframeAPIReady;
    let settled = false;

    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      if (error) {
        window.onYouTubeIframeAPIReady = previousCallback;
        apiPromise = null;
        reject(error);
      } else {
        resolve(window.YT);
      }
    };

    const timeoutId = setTimeout(() => finish(new Error('YouTube player API timed out.')), timeoutMs);
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousCallback === 'function') previousCallback();
      if (window.YT?.Player) finish();
      else finish(new Error('YouTube player API did not initialize.'));
    };

    script.src = 'https://www.youtube.com/iframe_api';
    script.onerror = () => finish(new Error('YouTube player API failed to load.'));
    document.head.appendChild(script);
  });

  return apiPromise;
}

export async function createYouTubePlayer(elementId, playerVars, events) {
  const YT = await loadYouTubeApi();
  return new YT.Player(elementId, {
    width: '100%',
    height: '100%',
    playerVars,
    events
  });
}
