'use strict';
(() => {
  const form = document.querySelector('#workshop-registration');
  const result = document.querySelector('#workshop-prepared');
  const emailLink = document.querySelector('#workshop-email');
  const copyButton = document.querySelector('#workshop-copy');
  const message = document.querySelector('#workshop-message');
  const status = document.querySelector('#workshop-copy-status');
  let prepared = '';
  form.addEventListener('input', () => {
    result.hidden = true;
    prepared = '';
    emailLink.removeAttribute('href');
    message.value = '';
    status.textContent = '';
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const values = new FormData(form);
    const value = name => String(values.get(name) || '').trim();
    prepared = `Liebe Daniela,\n\nich möchte mich für deinen Kakao-Kreis anmelden:\nBewusstseinsworkshop mit Kakaozeremonie\nFreitag, 18. Dezember 2026, 17:00–20:00 Uhr\nSeminarhaus am Eckhof, Murbergstraße 155, 8072 Mellach\n87 € pro Person inklusive zeremoniellem Kakao\n\nName: ${value('name')}\nE-Mail: ${value('email')}\nTelefon: ${value('telefon') || 'Nicht angegeben'}\n${values.has('bereits_angemeldet') ? '\nIch habe mich bereits persönlich bei dir gemeldet; bitte ordne diese E-Mail meiner bestehenden Anmeldung zu.\n' : ''}${value('nachricht') ? '\nMeine Nachricht:\n' + value('nachricht') + '\n' : ''}\nBitte bestätige mir meinen Platz persönlich. Die Durchführung ist ab sieben Teilnehmenden vorgesehen. Nach deiner Bestätigung zahle ich 43,50 € per Überweisung an; die restlichen 43,50 € bezahle ich vor Ort.\n\nIch akzeptiere die Anmeldebedingungen: Kostenlose Absage per E-Mail bis 11. Dezember 2026, 17:00 Uhr, mit Rückzahlung einer geleisteten Anzahlung. Bei späterer Absage oder Nichterscheinen 43,50 € Stornogebühr, auf die eine Anzahlung angerechnet wird. Bei einer Ersatzperson oder anderweitig vergebenem Platz entfällt die Stornogebühr. Bei einer Absage durch Daniela werden bereits bezahlte Beträge vollständig zurückgezahlt. Gesetzliche Rücktrittsrechte bleiben unberührt.\n\nDu darfst meine angegebenen Daten zur Bearbeitung dieser Anmeldung verwenden.\n\nLiebe Grüße\n${value('name')}`;
    message.value = prepared;
    emailLink.href = 'mailto:daniela@shiatsu-kellner.at?subject=' + encodeURIComponent('Anmeldung Kakao-Kreis · 18. Dezember 2026') + '&body=' + encodeURIComponent(prepared);
    result.hidden = false;
    status.textContent = '';
    result.scrollIntoView({behavior:'smooth',block:'start'});
  });
  copyButton.addEventListener('click', async () => {
    if (!prepared) return;
    try {
      await navigator.clipboard.writeText(prepared);
      status.textContent = 'Anmeldung kopiert. Du kannst sie in deine E-Mail einfügen.';
    } catch {
      message.focus();
      message.select();
      status.textContent = 'Bitte kopiere den markierten Text und sende ihn per E-Mail an Daniela.';
    }
  });
  form.hidden = false;
})();
