function createHeroCarousel(frame, video, toggle, reducedMotion = false) {
  let mode = 'photo';
  let paused = reducedMotion;
  let active = true;
  let wantedVideo = false;
  let revision = 0;
  let timer;

  function updateControl() {
    toggle.hidden = false;
    toggle.dataset.paused = String(paused);
    const label = paused ? 'Bildwechsel fortsetzen' : 'Bildwechsel pausieren';
    toggle.setAttribute('aria-label', label);
    toggle.setAttribute('title', label);
  }

  function hold() {
    clearTimeout(timer);
    wantedVideo = false;
    revision++;
    video.pause();
  }

  function showPhoto() {
    hold();
    mode = 'photo';
    frame.classList.remove('is-video');
    if (active && !paused) timer = setTimeout(() => void playVideo(true), 7000);
  }

  async function playVideo(restart) {
    clearTimeout(timer);
    wantedVideo = true;
    const attempt = ++revision;
    try {
      video.muted = true;
      if (!video.getAttribute('src')) video.setAttribute('src', video.dataset.src);
      if (restart) video.currentTime = 0;
      await video.play();
      if (attempt !== revision) {
        if (!wantedVideo) video.pause();
        return;
      }
      mode = 'video';
      frame.classList.add('is-video');
    } catch {
      if (attempt !== revision) return;
      paused = true;
      showPhoto();
      updateControl();
    }
  }

  toggle.addEventListener('click', () => {
    paused = !paused;
    updateControl();
    if (paused) hold();
    else if (active) void playVideo(mode === 'photo');
  });
  video.addEventListener('ended', showPhoto);
  video.addEventListener('error', () => {
    paused = true;
    showPhoto();
    updateControl();
  });
  updateControl();
  showPhoto();

  return {
    setActive(value) {
      if (active === value) return;
      active = value;
      if (!active) hold();
      else if (!paused) {
        if (mode === 'video') void playVideo(false);
        else showPhoto();
      }
    }
  };
}
