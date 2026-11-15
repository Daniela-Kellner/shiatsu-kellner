'use strict';

function initializePhotoGallery(root) {
  const dialog = root.querySelector('#gallery-dialog');
  const overview = root.querySelector('#gallery-overview-dialog');
  const items = [...root.querySelectorAll('[data-gallery-item]')];
  if (!dialog || !items.length) return;
  const photos = items.map(item => ({
    src: item.dataset.gallerySrc,
    tone: item.dataset.galleryTone,
    alt: item.querySelector('img').alt,
    title: item.querySelector('[data-gallery-title]').textContent,
    caption: item.querySelector('[data-gallery-caption]').textContent
  }));
  const image = root.querySelector('#gallery-full-image');
  const title = root.querySelector('#gallery-full-title');
  const caption = root.querySelector('#gallery-full-caption');
  const counter = root.querySelector('#gallery-counter');
  let activePhoto = 0;
  let opener = null;
  let overviewOpener = null;

  function restoreFocus(trigger, fallback = null) {
    const target = trigger?.isConnected && trigger.getClientRects().length ? trigger : fallback;
    target?.focus({preventScroll: true});
  }

  function showPhoto(index) {
    activePhoto = (index + photos.length) % photos.length;
    const photo = photos[activePhoto];
    image.src = photo.src;
    image.alt = photo.alt;
    image.classList.toggle('gallery-image--sepia', photo.tone === 'sepia');
    title.textContent = photo.title;
    caption.textContent = photo.caption;
    counter.textContent = String(activePhoto + 1).padStart(2, '0') + ' / ' + String(photos.length).padStart(2, '0');
  }

  root.addEventListener('click', event => {
    const browse = event.target.closest('[data-gallery-browse]');
    if (browse && overview) {
      event.preventDefault();
      overviewOpener = browse;
      for (const other of root.querySelectorAll('dialog[open]')) {
        if (other !== overview) other.close();
      }
      if (!overview.open) overview.showModal();
      overview.scrollTop = 0;
      return;
    }
    const trigger = event.target.closest('[data-gallery-open]');
    if (!trigger || !/^\d+$/.test(trigger.dataset.galleryOpen)) return;
    const index = Number(trigger.dataset.galleryOpen);
    if (!Number.isInteger(index) || index >= photos.length) return;
    opener = trigger;
    for (const other of root.querySelectorAll('dialog[open]')) {
      if (other !== dialog && other !== overview) other.close();
    }
    showPhoto(index);
    if (!dialog.open) dialog.showModal();
  });

  root.querySelector('[data-gallery-previous]').addEventListener('click', () => showPhoto(activePhoto - 1));
  root.querySelector('[data-gallery-next]').addEventListener('click', () => showPhoto(activePhoto + 1));
  root.querySelector('[data-gallery-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    restoreFocus(opener);
  });
  if (overview) {
    root.querySelector('[data-gallery-overview-close]').addEventListener('click', () => overview.close());
    overview.addEventListener('close', () => restoreFocus(overviewOpener, root.querySelector('.menu-toggle')));
    overview.addEventListener('click', event => {
      if (event.target !== overview) return;
      const bounds = overview.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) overview.close();
    });
  }
  root.addEventListener('keydown', event => {
    if (!dialog.open) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      showPhoto(activePhoto + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });

  if (overview && typeof window !== 'undefined') {
    const openOverviewFromLink = () => {
      if (window.location.hash !== '#einblicke') return;
      overviewOpener = root.querySelector('[data-gallery-browse]');
      for (const other of root.querySelectorAll('dialog[open]')) {
        if (other !== overview) other.close();
      }
      if (!overview.open) overview.showModal();
      overview.scrollTop = 0;
    };
    window.addEventListener('hashchange', openOverviewFromLink);
    openOverviewFromLink();
  }
}

initializePhotoGallery(document);
