(() => {
  const endpoint = ['shiatsu-kellner.at', 'www.shiatsu-kellner.at'].includes(location.hostname)
    ? 'https://daniela-kellner-auszeit.s-hebnar.chatgpt.site/api/pageview'
    : '/api/pageview';
  const count = () => {
    fetch(endpoint, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      cache: 'no-store',
      keepalive: true
    }).catch(() => {});
  };
  if (document.prerendering) document.addEventListener('prerenderingchange', count, { once: true });
  else count();
})();
