const ROTATION_STEP = 0.38;

export function createInputController({
  canvas,
  getWheelMetrics,
  mapPointer,
  press,
  release,
  onMove,
  onSelect,
  onBack,
  onNext,
  onPrevious,
  onTogglePlay
}) {
  let audioContext = null;
  let drag = null;

  function initializeAudio() {
    if (!audioContext) {
      try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        return;
      }
    }
    if (audioContext.state === 'suspended') audioContext.resume();
  }

  function playClick(intensity = 1) {
    if (!audioContext) return;
    const length = Math.floor(audioContext.sampleRate * 0.012);
    const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) {
      samples[index] = (Math.random() * 2 - 1) * Math.pow(1 - index / length, 3);
    }

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    const filter = audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2800;
    const gain = audioContext.createGain();
    gain.gain.value = 0.22 * intensity;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(audioContext.destination);
    source.start();
  }

  function vibrate(duration) {
    if (navigator.vibrate) {
      try {
        navigator.vibrate(duration);
      } catch {
        return;
      }
    }
  }

  function tick(direction) {
    playClick();
    vibrate(3);
    onMove(direction);
  }

  function handlePointerDown(event) {
    const point = mapPointer(event);
    const wheel = getWheelMetrics();
    const dx = point.x - wheel.x;
    const dy = point.y - wheel.y;
    const radius = Math.hypot(dx, dy);
    if (radius > wheel.radius * 1.02) return;

    event.preventDefault();
    initializeAudio();
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture can be unavailable in embedded previews.
    }
    drag = {
      pointerId: event.pointerId,
      startX: point.x,
      startY: point.y,
      angle: Math.atan2(dy, dx),
      accumulatedAngle: 0,
      totalAngle: 0,
      center: radius < wheel.radius * 0.4,
      startDX: dx,
      startDY: dy,
      distance: 0
    };
    press(dx, dy, drag.center);
  }

  function handlePointerMove(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const point = mapPointer(event);
    const wheel = getWheelMetrics();
    const dx = point.x - wheel.x;
    const dy = point.y - wheel.y;
    drag.distance = Math.max(drag.distance, Math.hypot(point.x - drag.startX, point.y - drag.startY));
    if (drag.center) return;

    const angle = Math.atan2(dy, dx);
    let angleChange = angle - drag.angle;
    if (angleChange > Math.PI) angleChange -= 2 * Math.PI;
    if (angleChange < -Math.PI) angleChange += 2 * Math.PI;
    drag.angle = angle;
    drag.totalAngle += Math.abs(angleChange);
    drag.accumulatedAngle += angleChange;
    while (drag.accumulatedAngle > ROTATION_STEP) {
      drag.accumulatedAngle -= ROTATION_STEP;
      tick(1);
    }
    while (drag.accumulatedAngle < -ROTATION_STEP) {
      drag.accumulatedAngle += ROTATION_STEP;
      tick(-1);
    }
  }

  function handlePointerEnd(event, cancelled = false) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const gesture = drag;
    drag = null;
    release();
    if (cancelled || gesture.totalAngle >= 0.3 || gesture.distance >= 14) return;

    playClick(1.2);
    vibrate(6);
    if (gesture.center) {
      onSelect();
      return;
    }

    const degrees = Math.atan2(gesture.startDY, gesture.startDX) * 180 / Math.PI;
    if (degrees > -135 && degrees <= -45) onBack();
    else if (degrees > -45 && degrees <= 45) onNext();
    else if (degrees > 45 && degrees <= 135) onTogglePlay();
    else onPrevious();
  }

  const handlePointerUp = event => handlePointerEnd(event);
  const handlePointerCancel = event => handlePointerEnd(event, true);
  const handleContextMenu = event => event.preventDefault();

  function handleKeyDown(event) {
    if (event.target?.tagName === 'INPUT') return;
    if (event.target?.tagName === 'BUTTON' && (event.key === 'Enter' || event.key === ' ')) return;
    initializeAudio();
    if (event.key === 'ArrowDown') tick(1);
    else if (event.key === 'ArrowUp') tick(-1);
    else if (event.key === 'Enter') onSelect();
    else if (event.key === 'Escape' || event.key === 'Backspace') onBack();
    else if (event.key === 'ArrowRight') onNext();
    else if (event.key === 'ArrowLeft') onPrevious();
    else if (event.key === ' ') {
      event.preventDefault();
      onTogglePlay();
    }
  }

  function requestPortraitOrientation() {
    const orientation = window.screen?.orientation;
    try {
      orientation?.lock?.('portrait')?.catch(() => {});
    } catch {
      return;
    }
  }

  canvas.addEventListener('pointerdown', handlePointerDown);
  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerup', handlePointerUp);
  canvas.addEventListener('pointercancel', handlePointerCancel);
  canvas.addEventListener('contextmenu', handleContextMenu);
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('pointerdown', requestPortraitOrientation, { once: true });

  return {
    initializeAudio,
    playClick,
    destroy() {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerCancel);
      canvas.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerdown', requestPortraitOrientation);
      audioContext?.close();
    }
  };
}
