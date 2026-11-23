(() => {
  // Only the production practice website counts; never local or Pages previews.
  if (!['shiatsu-kellner.at', 'www.shiatsu-kellner.at'].includes(location.hostname)) return;
  const endpoint = '/statistik/zaehlen.php';
  const count = () => {
    fetch(endpoint, {
      method: 'POST',
      mode: 'same-origin',
      credentials: 'omit',
      referrerPolicy: 'same-origin',
      cache: 'no-store',
      keepalive: true
    }).catch(() => {});
  };
  if (document.prerendering) document.addEventListener('prerenderingchange', count, { once: true });
  else count();
})();
