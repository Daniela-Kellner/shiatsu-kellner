// Playback starts only from the visitor's breathing or sound button click.
function createPondAmbience(audio, onUnavailable = () => {}) {
  let context;
  let gain;
  let pauseTimer;
  let revision = 0;
  let wanted = false;

  function reset() {
    audio.pause();
    audio.currentTime = 0;
  }

  function ramp(value, seconds) {
    const now = context.currentTime;
    const level = gain.gain;
    if (level.cancelAndHoldAtTime) level.cancelAndHoldAtTime(now);
    else {
      const current = level.value;
      level.cancelScheduledValues(now);
      level.setValueAtTime(current, now);
    }
    level.linearRampToValueAtTime(value, now + seconds);
  }

  function stop(immediate = false) {
    wanted = false;
    revision++;
    clearTimeout(pauseTimer);
    if (gain && context.state === 'running' && !immediate) {
      ramp(0, 1.2);
      pauseTimer = setTimeout(() => { if (!wanted) reset(); }, 1250);
    } else {
      if (gain) ramp(0, 0);
      reset();
    }
  }

  async function start() {
    wanted = true;
    const attempt = ++revision;
    clearTimeout(pauseTimer);
    try {
      if (!context) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          context = new AudioContextClass();
          gain = context.createGain();
          gain.gain.setValueAtTime(0, context.currentTime);
          context.createMediaElementSource(audio).connect(gain);
          gain.connect(context.destination);
        } else audio.volume = 0.55;
      }
      if (audio.paused) audio.currentTime = 0;
      // Both calls stay inside the click gesture, before awaiting either one.
      const resumed = context?.state === 'suspended' ? context.resume() : Promise.resolve();
      const played = audio.play();
      await Promise.all([resumed, played]);
      if (attempt !== revision) {
        if (!wanted) reset();
        return false;
      }
      if (gain) ramp(0.55, 2.5);
      return true;
    } catch {
      if (attempt === revision) {
        stop(true);
        onUnavailable();
      }
      return false;
    }
  }

  audio.addEventListener('error', () => {
    if (!wanted) return;
    stop(true);
    onUnavailable();
  });
  return { start, stop };
}
