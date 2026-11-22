'use strict';

const qs = (s, root = document) => root.querySelector(s);
const qsa = (s, root = document) => [...root.querySelectorAll(s)];
const bookingDialog = qs('#booking-dialog');
const detailDialog = qs('#detail-dialog');
const serviceSelect = qs('#booking-service');
const durationSelect = qs('#booking-duration');
const dateInput = qs('#booking-date');
const now = new Date();
const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
dateInput.min = localToday;
let lastOpener = null;
let preparedText = '';

function showDialog(dialog, opener) {
  lastOpener = opener || document.activeElement;
  if (detailDialog.open) detailDialog.close();
  if (bookingDialog.open) bookingDialog.close();
  dialog.showModal();
  dialog.scrollTop = 0;
}

function syncService() {
  const service = serviceSelect.value;
  const fixedDurations = {'shiatsu-erst':'90', moxa:'90', kinder:'40', paar:'120', kennenlernen:'90'};
  const fixed = fixedDurations[service];
  const allowed = fixed ? [fixed] : service === 'workshop' ? [''] : ['60', '90'];
  durationSelect.innerHTML = allowed.map(minutes => `<option value="${minutes}">${minutes ? minutes + ' Minuten' : 'Nach Vereinbarung'}</option>`).join('');
  durationSelect.value = allowed[0];
  durationSelect.disabled = Boolean(fixed) || service === 'workshop';
  const locationSelect = qs('#booking-location');
  if (service === 'hausbesuch') locationSelect.value = 'hausbesuch';
  if (service === 'kennenlernen') locationSelect.value = 'seminarhaus';
  locationSelect.disabled = service === 'kennenlernen';
  if (service === 'workshop') locationSelect.value = 'vereinbarung';
  updateBookingPrice();
}

function updateBookingPrice() {
  const service = serviceSelect.value;
  const minutes = durationSelect.value;
  const fixedPrices = {'shiatsu-erst':119, moxa:119, kinder:55, paar:220};
  let text;
  if (service === 'kennenlernen') {
    text = 'Kennenlernblock für neue Klientinnen und Klienten: 297 € · 3 × 90 Minuten (statt 357 €) · Seminarhaus am Eckhof, Mellach';
  } else if (service === 'workshop') {
    text = 'Dauer und Preis richten sich nach dem jeweiligen Workshop.';
  } else if (service === 'hausbesuch') {
    text = 'Hausbesuch: zusätzlich 35 € inkl. Anfahrt zum Preis der vereinbarten Behandlung.';
  } else {
    const amount = fixedPrices[service] || (minutes === '90' ? 119 : 89);
    const extra = service === 'shiatsu-erst' ? ' · Erstbehandlung' : service === 'kinder' ? ' · bis 12 Jahre' : service === 'paar' ? ' · für euch beide' : '';
    text = `Standardpreis: ${amount} € · ${minutes} Minuten${extra}`;
  }
  qs('#booking-price').textContent = text;
}

function openBooking(service, opener) {
  serviceSelect.value = [...serviceSelect.options].some(o => o.value === service) ? service : 'shiatsu';
  syncService();
  qs('#mail-fallback').hidden = true;
  showDialog(bookingDialog, opener);
}

document.addEventListener('click', event => {
  const book = event.target.closest('[data-book]');
  if (book) openBooking(book.dataset.book, book);
  const close = event.target.closest('[data-close]');
  if (close) close.closest('dialog').close();
});

for (const dialog of [bookingDialog, detailDialog]) {
  dialog.addEventListener('click', e => {
    if (e.target !== dialog) return;
    const b = dialog.getBoundingClientRect();
    if (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    if (!bookingDialog.open && !detailDialog.open && lastOpener?.isConnected) lastOpener.focus({preventScroll:true});
  });
}
serviceSelect.addEventListener('change', syncService);
durationSelect.addEventListener('change', updateBookingPrice);
syncService();

const menuToggle = qs('.menu-toggle');
const mobileNav = qs('#mobile-nav');
function closeMenu() {
  mobileNav.hidden = true;
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Menü öffnen');
}
menuToggle.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') === 'true';
  mobileNav.hidden = open;
  menuToggle.setAttribute('aria-expanded', String(!open));
  menuToggle.setAttribute('aria-label', open ? 'Menü öffnen' : 'Menü schließen');
});
mobileNav.addEventListener('click', e => {if(e.target.closest('a,button')) closeMenu();});
document.addEventListener('keydown', e => {if(e.key === 'Escape') closeMenu();});
window.matchMedia('(min-width:901px)').addEventListener('change', e => {if(e.matches) closeMenu();});

const offerDetails = {
  shiatsu: {
    title:'Shiatsu', eyebrow:'DIE KUNST DER ACHTSAMEN BERÜHRUNG', image:'gallery/shiatsu-seebuehne-behandlung.webp', alt:'Daniela bei einer Shiatsu-Behandlung auf der Seebühne mit Blick ins Grüne',
    subtitle:'Berührung, die dich als ganzen Menschen wahrnimmt.',
    paragraphs:[
      'Manchmal braucht es keine Worte, sondern einen Raum, in dem du ankommen und dich selbst wieder spüren darfst.',
      'Shiatsu ist eine ganzheitliche Form der manuellen Körperarbeit aus Japan. Ihre Wurzeln liegen in traditionellen japanischen und chinesischen Gesundheitslehren. Dabei werden Körper, Gedanken und Gefühle als miteinander verbunden betrachtet. Im Mittelpunkt stehst du – mit deiner Geschichte, deiner Lebenssituation und dem, was dich gerade bewegt.'
    ],
    sections:[
      {title:'Jede Begegnung ist einzigartig', paragraphs:[
        'Keine Shiatsu-Behandlung gleicht der anderen. Was du mitbringst, wie du dich fühlst und was du dir wünschst, gibt unserer gemeinsamen Zeit die Richtung.',
        'Mit achtsamem Druck, sanften Dehnungen, Rotationen, Schaukeln und Ruhephasen entsteht eine Behandlung, die sich an dir orientiert. Intensität und Tempo stimmen wir auf dein Empfinden ab. So darf Raum entstehen, um Anspannung wahrzunehmen, zur Ruhe zu kommen und neue Beweglichkeit zu entdecken – körperlich wie innerlich.'
      ]},
      {title:'Mein Zugang: mit den Händen lauschen', paragraphs:[
        'Seit 2001 begleite ich Menschen mit Körperarbeit und persönlicher Zuwendung. In meine Arbeit fließen neben meiner Ausbildung auch Lebenserfahrung, Menschenkenntnis, Intuition und Einfühlungsvermögen ein.',
        'Mit meinen Händen höre ich zu. Ich nehme mir Zeit, mich auf dich einzulassen: auf deinen Körper, deinen Atem und auf das, was dich über das Körperliche hinaus beschäftigt. Dabei bleiben deine Wahrnehmung und deine Grenzen mein Maßstab.'
      ], quote:'Ich folge keinem starren Ablauf. Ich begegne dir als Mensch.'},
      {title:'Raum für dein Anliegen', paragraphs:[
        'Vielleicht wünschst du dir Entspannung in einer belastenden Zeit, mehr Körperbewusstsein oder eine bewusste Auszeit. Vielleicht suchst du achtsame Begleitung in einer Lebensphase, die Veränderungen mit sich bringt.',
        'Du musst dein Anliegen nicht schon genau benennen können. Wir finden gemeinsam heraus, was für dich gerade stimmig ist.'
      ]},
      {title:'So läuft deine Behandlung ab', paragraphs:[
        'Zu Beginn sprechen wir über dein Befinden und deine Wünsche. Die Behandlung findet in bequemer Kleidung auf einer Matte am Boden statt. Zum Abschluss bleibt Zeit zum Nachspüren.'
      ]}
    ],
    list:['Die Erstbehandlung dauert immer 90 Minuten.','Weitere Sitzungen sind mit 60 oder 90 Minuten möglich.'],
    prices:[['Erstbehandlung · 90 Minuten',119],['Shiatsu-Sitzung · 60 Minuten',89],['Shiatsu-Sitzung · 90 Minuten',119]]
  },
  mental: {
    title:'Mentaltraining, Coaching & Bewusstseinsarbeit', eyebrow:'MEINE HERZENSARBEIT', image:'mentaltraining-daniela-am-fluss.svg', alt:'Daniela sitzt mit den Händen am Herzen auf einem steinigen Flussufer in der Natur',
    paragraphs:[
      'Jeder Mensch trägt bereits alles in sich, was er für seinen eigenen Weg braucht. Manchmal sind es jedoch Erfahrungen, Gedankenmuster oder innere Blockaden, die den Blick darauf verstellen. Ich sehe mich als Raumöffnerin und Knotenlöserin.',
      'Mit Achtsamkeit, Intuition und verschiedenen ganzheitlichen Methoden begleite ich dich dabei, wieder in Verbindung mit deiner inneren Weisheit, deinen Ressourcen und deinem authentischen So-Sein zu kommen.',
      'Als diplomierte Mentaltrainerin und Energy Coach arbeite ich je nach Anliegen auf unterschiedlichen Ebenen: mit Mentaltraining und Coaching sowie transformativer Bewusstseinsarbeit und Quantenarbeit. Auch Kinder und Jugendliche finden bei mir eine liebevolle Begleitung.',
      'Jede Begegnung ist individuell und entsteht aus dem, was sich im jeweiligen Moment zeigen möchte. Inhalt und Tempo stimmen wir miteinander ab.',
      'Die Veränderung entsteht aus dir selbst. Ich halte den Raum, damit Klarheit, neue Perspektiven und Entwicklung möglich werden.'
    ],
    sections:[
      {title:'Glaubenssätze hinterfragen. Neue Perspektiven entdecken.', paragraphs:[
        'Manchmal sind es vertraute Gedanken wie „Ich bin nicht gut genug“ oder „Ich muss alles alleine schaffen“, die uns begrenzen. Im Mentaltraining und in meiner Bewusstseinsarbeit begleite ich dich dabei, solche Glaubenssätze zu erkennen und zu hinterfragen.',
        'Dabei fließen je nach Anliegen unterschiedliche Methoden ein:',
        'The Work nach Byron Katie lädt dazu ein, belastende Überzeugungen mit vier Fragen und einem Wechsel der Blickrichtung zu untersuchen.',
        'EFT – Emotional Freedom Techniques ist eine Klopftechnik, bei der ausgewählte Körperpunkte sanft beklopft werden, während wir uns deinen Gedanken und Gefühlen zuwenden.',
        'Welche Zugänge wir nutzen, stimmen wir miteinander ab. Du kannst auch gezielt mit dem Wunsch nach EFT oder der Arbeit an Glaubenssätzen zu mir kommen. Im Mittelpunkt stehen immer du, dein Anliegen und dein eigenes Tempo.'
      ]}
    ],
    list:['Einzelbegleitung nach persönlicher Vereinbarung','Auch als längerfristiger gemeinsamer Prozess','Wähle einen Termin mit 60 oder 90 Minuten.'],
    prices:[['60 Minuten',89],['90 Minuten',119]]
  },
  kakao: {
    title:'Kakaozeremonien & Rituale', eyebrow:'BEWUSST GENIESSEN · VERBINDUNG ERLEBEN',
    image:'gallery/wm-20261116/kakao-gewuerze.svg', alt:'Kakao, Kakaoraspeln und Sternanis auf einem rustikalen Holzbrett',
    subtitle:'Zeit für Verbindung. Mit dir selbst und miteinander.',
    paragraphs:[
      'Rituale laden uns ein, aus dem Alltag herauszutreten und einem Moment bewusst Bedeutung zu geben. Ich gestalte und begleite unterschiedliche Rituale – auch mit zeremoniellem Kakao als Teil meiner Bewusstseinsarbeit.'
    ],
    sections:[
      {title:'Kakao bewusst kennenlernen', paragraphs:[
        'Für meine Kakaozeremonien verwende ich hochwertigen, zeremoniellen Kakao. Wer vor allem süßen Trinkkakao kennt, begegnet hier einer anderen Art des Genießens: Der ursprüngliche, kräftige Kakaogeschmack steht im Mittelpunkt.',
        'Wir nehmen uns Zeit für Duft, Wärme und Geschmack. Mit einer persönlichen Intention – einem Wunsch, einem Anliegen oder einer Frage – richten wir unsere Aufmerksamkeit nach innen und kommen bewusst im gemeinsamen Kreis an.'
      ]},
      {title:'Ein Raum, der mit euch entsteht', paragraphs:[
        'Mit Achtsamkeit, Feingefühl und meinen unterschiedlichen Zugängen begleite ich euch durch die Zeremonie. Je nach Anlass fließen verschiedene Ritualelemente ein. Dabei entsteht Raum zum Wahrnehmen, Nachspüren und für Begegnung.',
        'Du darfst dich einbringen oder still dabei sein. Wie viel du teilen möchtest, entscheidest du selbst.'
      ]},
      {title:'Eine Kakaozeremonie bei euch', paragraphs:[
        'Du kannst mich auch einladen, eine Kakaozeremonie an einem Ort deiner Wahl zu gestalten und zu halten. Anlass, Rahmen und Möglichkeiten besprechen wir persönlich, damit die Begleitung zu euch und euren Wünschen passt.'
      ], image:'kakao-daniela.svg', imageAlt:'Daniela rührt persönlich den Kakao für eine Zeremonie an', imageCaption:'Mit Freude und Achtsamkeit vorbereitet.', imageWidth:1200, imageHeight:889, imageNatural:true}
    ],
    list:[], prices:[], inquirySubject:'Anfrage zu einer Kakaozeremonie', inquiryLabel:'Eine Kakaozeremonie anfragen',
    medicalNote:'Die Kakaozeremonie ist ein Angebot zur bewussten Begegnung und Selbstwahrnehmung.'
  },
  moxa: {
    title:'Moxa & Narbenarbeit', eyebrow:'WÄRME & ACHTSAME NARBENARBEIT', image:'gallery/wm-20261120/narben-herzhaende.svg', alt:'Hände formen ein Herz über dem Unterbauch', extraImage:'gallery/wm-20261120/moxa.svg', extraAlt:'Eine Moxa-Wärmeanwendung im Bereich einer Hand', imageCredit:`<p class="image-credit">Symbolbild · <a href="https://www.magnific.com/free-photo/close-up-hands-making-heart-shape_12977278.htm" target="_blank" rel="noopener">Bild von magnific auf Magnific</a></p>`,
    subtitle:'Wärme spüren. Der eigenen Geschichte Raum geben.',
    paragraphs:[
      'Manche Spuren auf unserem Körper erzählen von besonderen Lebensereignissen. Eine Operation, eine Verletzung oder eine Geburt können nicht nur sichtbare Narben hinterlassen, sondern auch mit Empfindungen, Erinnerungen und Gefühlen verbunden sein.',
      'In meiner Arbeit darf all das Aufmerksamkeit bekommen – behutsam, individuell und in deinem Tempo.'
    ],
    sections:[
      {title:'Moxa – achtsame Wärme', paragraphs:[
        'Moxa, auch Moxibustion genannt, ist eine traditionelle Wärmeanwendung aus der chinesischen Gesundheitslehre. Dabei wird getrockneter Beifuß verwendet, dessen Glut Wärme erzeugt. Diese wird gezielt und mit achtsamem Abstand an ausgewählte Körperbereiche herangeführt.',
        'Gemeinsam besprechen wir, ob diese Anwendung für dich passend ist. Die Intensität richtet sich nach deinem Empfinden. Du darfst zur Ruhe kommen, die Wärme wahrnehmen und nachspüren, wie sie sich für dich anfühlt.'
      ]},
      {title:'Eine Narbe ist mehr als eine sichtbare Spur', paragraphs:[
        'Vielleicht fühlt sich der Bereich einer Narbe verändert, empfindlich oder fremd an. Vielleicht ist das Gewebe längst verheilt, während das Erlebte innerlich noch Raum braucht. Und manchmal ist eine Narbe einfach ein selbstverständlicher Teil von dir.',
        'Ich begegne ihr deshalb nicht losgelöst von dir, sondern im Zusammenhang mit deinem Körper, deiner Geschichte und deinem heutigen Befinden.'
      ]},
      {title:'Mein Zugang: behutsam Verbindung schaffen', paragraphs:[
        'Die Moxa-Anwendung ist ein möglicher Bestandteil meiner Narbenarbeit. Ebenso wichtig sind für mich achtsame Berührung, Körperwahrnehmung und das persönliche Gespräch. Mit einem ganzheitlichen Blick beziehe ich körperliche Empfindungen und – soweit du das möchtest – auch die emotionale Bedeutung des Erlebten ein.',
        'Integration bedeutet für mich, einer Narbe und ihrer Geschichte einen Platz geben zu dürfen. Es geht darum, wieder Verbindung zu diesem Teil deines Körpers zu finden und wahrzunehmen, was du dafür brauchst.',
        'Du musst nichts erzählen, erklären oder erneut durchleben. Deine Grenzen bestimmen unseren gemeinsamen Weg.'
      ], quote:'Narben erzählen Geschichten. Sie dürfen als Teil von dir angenommen werden – mit allem, was du erlebt hast.'}
    ],
    list:['90 Minuten Zeit für dein Anliegen, die Anwendung und das Nachspüren'],
    prices:[['90 Minuten',119]],
    medicalNote:'Die Begleitung ersetzt keine ärztliche Abklärung, Wundversorgung oder psychotherapeutische Behandlung.'
  },
  schwangerschaft: {
    title:'Schwangerschaft, Geburt & Baby', eyebrow:'ACHTSAM BEGLEITET · VON ANFANG AN', image:'gallery/wm-20261115/schwangerschaft-herzhaende.svg', alt:'Danielas Hände bilden ein Herz auf ihrem schwangeren Bauch',
    subtitle:'Getragen sein. Vertrauen finden. Gemeinsam ankommen.',
    paragraphs:[
      'Wenn neues Leben wächst, verändert sich vieles. Dein Körper, deine Gefühle, deine Beziehungen und der Blick auf das, was vor dir liegt. Vorfreude und Vertrauen dürfen dabei ebenso ihren Platz haben wie Fragen, Unsicherheit oder das Bedürfnis nach Ruhe.',
      'Ich begleite dich in dieser besonderen Lebensphase mit achtsamer Körperarbeit, persönlicher Zuwendung und einem offenen Ohr für das, was dich bewegt – während der Schwangerschaft, rund um die Geburt und in der ersten Zeit mit deinem Baby.'
    ],
    sections:[
      {title:'Während der Schwangerschaft', image:'gallery/wm-20261116/schwangerschaft-ruhe.svg', imageAlt:'Daniela liegt entspannt auf dem Sofa und legt die Hände auf ihren schwangeren Bauch', imageCaption:'Zeit für Ruhe. Zeit für dich und dein Baby.', imageWidth:1087, imageHeight:723, paragraphs:[
        'Ein Raum für dich und die Verbindung zu deinem werdenden Kind. Mit Shiatsu, Gesprächen und meinen ganzheitlichen Zugängen richte ich mich nach deinem Befinden und dem, was gerade Aufmerksamkeit braucht.',
        'Du darfst innehalten, deinen Körper bewusst wahrnehmen und deinen eigenen Bedürfnissen nachspüren. Berührung, Position und Tempo stimmen wir individuell auf dich ab.'
      ]},
      {title:'Rund um die Geburt', paragraphs:[
        'Auch deine Gedanken, Wünsche und Gefühle zur Geburt dürfen Raum bekommen. Ich begleite dich dabei, deine eigenen Ressourcen wahrzunehmen und herauszufinden, was dir Halt und Vertrauen gibt.',
        'Nach persönlicher Absprache ist auch eine Geburtsbegleitung möglich. Gemeinsam klären wir frühzeitig, wie du dir meine Unterstützung wünschst und welcher Rahmen dafür passend ist.'
      ]},
      {title:'Im Wochenbett und danach', image:'gallery/wm-20261116/wochenbett-mutter-baby.svg', imageAlt:'Eine Mutter liegt ihrem schlafenden Baby zugewandt gegenüber und hält es liebevoll im Arm', imageCaption:'Gemeinsam ankommen. Zeit für Nähe, Geborgenheit und euren eigenen Rhythmus.', paragraphs:[
        'Nach der Geburt beginnt ein neues Kennenlernen – deines Babys, deines veränderten Körpers und eures gemeinsamen Alltags. Auch du darfst in dieser Zeit Zuwendung erfahren.',
        'Ich gebe Raum für dein Befinden, für Ruhe und für das, was du erlebt hast. Ebenso findet dein Baby mit seinen Bedürfnissen und seinem eigenen Rhythmus Platz in meiner Begleitung. Achtsame Berührung und Körperwahrnehmung können euch beim gemeinsamen Ankommen begleiten.'
      ]},
      {title:'So individuell wie du und dein Baby', paragraphs:[
        'Ich verbinde meine langjährige Erfahrung mit Einfühlungsvermögen und einer feinen Wahrnehmung für eure jeweilige Situation. Welche meiner Zugänge einfließen, entsteht aus dem, was ihr gerade braucht.'
      ], quote:'Du musst nicht alles schon wissen oder können. Du und dein Baby dürft euren eigenen Weg finden.'}
    ],
    list:[], prices:[], inquirySubject:'Anfrage zur Begleitung in Schwangerschaft, Geburt und Babyzeit', inquiryLabel:'Begleitung für dich und dein Baby anfragen',
    medicalNote:'Meine Begleitung ergänzt die Betreuung durch Hebamme und Ärztin oder Arzt. Sie ersetzt keine medizinische oder geburtshilfliche Versorgung.'
  },
  kindermental: {
    title:'Kinder & Jugendliche', eyebrow:'MENTALTRAINING & GANZHEITLICHE BEGLEITUNG', image:'', alt:'',
    subtitle:'Mit Vertrauen wachsen. Sich selbst treu bleiben.',
    paragraphs:[
      'Kinder begegnen der Welt oft mit einer besonderen Offenheit, Ehrlichkeit und Feinfühligkeit. Diese Qualitäten zu bewahren und sie darin zu stärken, ihrer Wahrnehmung zu vertrauen und ihren eigenen Wert zu spüren, liegt mir besonders am Herzen.',
      'Manchmal brauchen junge Menschen einen geschützten Raum, in dem sie Gefühle ausdrücken, über Erlebtes sprechen oder einfach ganz sie selbst sein dürfen. Einen Raum, in dem sie nichts leisten müssen und mit allem willkommen sind, was sie gerade beschäftigt.'
    ],
    sections:[
      {title:'Wahrnehmen, was gerade wichtig ist', paragraphs:[
        'Jedes Kind ist einzigartig. Deshalb gibt es bei mir keinen starren Ablauf. Mit Einfühlungsvermögen, Achtsamkeit und spielerischen, altersgerechten Methoden finde ich gemeinsam mit deinem Kind heraus, was gerade Aufmerksamkeit braucht.',
        'Dabei verbinde ich Mentaltraining, Gespräche, Körperwahrnehmung und meine weiteren ganzheitlichen Zugänge. Was davon passend ist, richtet sich nach dem Alter, den Bedürfnissen und der Bereitschaft deines Kindes. Seine Grenzen und sein Tempo bleiben dabei maßgeblich.',
        'Eine meiner Stärken ist es, aufmerksam hinzuhören und feine Signale wahrzunehmen – auch dann, wenn Worte noch fehlen. Im Mittelpunkt stehen die Ressourcen deines Kindes: seine Stärken, seine Intuition und das Vertrauen, selbst etwas bewirken zu können.'
      ]},
      {title:'Das Umfeld gehört dazu', paragraphs:[
        'Ein Kind wächst in Beziehungen auf. Deshalb beziehe ich mit einem systemischen Blick auch sein familiäres und soziales Umfeld ein: Welche Situationen beschäftigen es? Welche Erwartungen wirken auf es ein? Was gibt ihm Sicherheit und Halt?',
        'Gerade bei emotionalen Belastungen kann die begleitende Arbeit mit euch als Eltern ein wichtiger Teil sein. Gemeinsam schauen wir darauf, was euer Kind braucht und wie ihr es im Alltag unterstützen könnt. Dabei geht es um Verständnis, Entlastung und neue Möglichkeiten im Miteinander.'
      ]},
      {title:'Gemeinsam einen passenden Weg finden', paragraphs:[
        'Zu Beginn besprechen wir euer Anliegen und klären, wie eine stimmige Begleitung aussehen kann – für dein Kind und für euch als Familie. Auch Jugendliche finden bei mir Raum für ihre eigenen Fragen, Gefühle und Perspektiven.'
      ], quote:'Mein Anliegen ist, junge Menschen darin zu bestärken, sich selbst wahrzunehmen, ihren eigenen Wert zu kennen und mit Vertrauen ihren Weg zu gehen.'}
    ],
    list:[], prices:[],
    inquirySubject:'Anfrage zur Begleitung für Kinder und Jugendliche',
    medicalNote:'Diese Begleitung ersetzt keine ärztliche, psychologische oder psychotherapeutische Abklärung oder Behandlung.'
  },
  kinder: {
    title:'Kinderbehandlung', eyebrow:'ACHTSAME KÖRPERARBEIT · BIS 12 JAHRE', image:'', alt:'',
    paragraphs:['Auch die Kleinen dürfen sich Zeit zum Ankommen nehmen. Ich begleite Kinder bis 12 Jahre mit achtsamer, sanfter Körperarbeit.', 'Wir richten uns nach dem Alter, dem Empfinden und dem Tempo deines Kindes. Was gerade passend ist, besprechen wir gemeinsam.'],
    list:['Für Kinder bis 12 Jahre','Achtsame Berührung und Raum zum Wohlfühlen','40 Minuten Zeit für dein Kind'],
    prices:[['40 Minuten · bis 12 Jahre',55]]
  }
};
for (const trigger of qsa('[data-offer]')) {
  trigger.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const key = trigger.dataset.offer;
    const o = offerDetails[key];
    const media = o.extraImage ? `<div class="detail-media-group${key === 'schwangerschaft' ? ' detail-media-group--pregnancy' : key === 'kakao' ? ' detail-media-group--kakao' : key === 'moxa' ? ' detail-media-group--moxa' : ''}"><img class="detail-media" src="assets/${o.image}" alt="${o.alt}"><img class="detail-media detail-media--scar" src="assets/${o.extraImage}" alt="${o.extraAlt}"></div>` : o.image ? `<img class="detail-media${key === 'shiatsu' ? ' detail-media--shiatsu' : key === 'mental' ? ' detail-media--mental' : key === 'kakao' ? ' detail-media--kakao' : key === 'schwangerschaft' ? ' detail-media--pregnancy' : (key === 'kinder' || key === 'kindermental') ? ' detail-media--children' : ''}" src="assets/${o.image}" alt="${o.alt}">` : '';
    const priceList = o.prices.length ? `<dl class="treatment-prices treatment-prices--detail">${o.prices.map(([label,amount])=>`<div><dt>${label}</dt><dd>${amount} €</dd></div>`).join('')}</dl><p class="price-note">Standardpreise · Aktionen werden gesondert ausgewiesen.</p>` : '';
    const firstTreatment = key === 'shiatsu' ? '<button class="button" data-book="shiatsu-erst">Erstbehandlung anfragen ↗</button>' : '';
    const subtitle = o.subtitle ? `<p class="detail-subtitle"><em>${o.subtitle}</em></p>` : '';
    const sections = (o.sections || []).map(section => `<section class="detail-section"><h3>${section.title}</h3>${section.paragraphs.map(p=>`<p>${p}</p>`).join('')}${section.quote ? `<blockquote class="detail-quote">${section.quote}</blockquote>` : ''}${section.image ? `<figure class="detail-section-photo${section.imageNatural ? ' detail-section-photo--natural' : ''}"><img src="assets/${section.image}" width="${section.imageWidth || 553}" height="${section.imageHeight || 836}" alt="${section.imageAlt}" loading="lazy"><figcaption>${section.imageCaption}</figcaption></figure>` : ''}</section>`).join('');
    const inquiry = o.inquirySubject ? `<p>Umfang und Rahmen der Begleitung besprechen wir persönlich.</p><a class="button" href="mailto:daniela@shiatsu-kellner.at?subject=${encodeURIComponent(o.inquirySubject)}">${o.inquiryLabel || 'Begleitung für dein Kind anfragen'} ↗</a>` : '';
    qs('#detail-content').innerHTML = `${media}${o.imageCredit || ''}<div class="detail-body"><p class="eyebrow">${o.eyebrow}</p><h2 id="detail-title">${o.title}</h2>${subtitle}${o.paragraphs.map(p=>`<p>${p}</p>`).join('')}${sections}${o.list.length ? `<ul>${o.list.map(p=>`<li>${p}</li>`).join('')}</ul>` : ''}${priceList}${inquiry || `<div class="detail-booking-actions">${firstTreatment}<button class="${key === 'shiatsu' ? 'text-link' : 'button'}" data-book="${key}">${key === 'shiatsu' ? 'Weitere Shiatsu-Sitzung anfragen' : key === 'kinder' ? 'Kinderbehandlung anfragen' : 'Persönlichen Termin anfragen'} ↗</button></div>`}<p class="medical-note">${o.medicalNote || 'Diese Angebote ersetzen keine ärztliche Diagnose, Psychotherapie oder medizinische Behandlung.'}</p></div>`;
    showDialog(detailDialog, trigger);
  });
}

const eventData = {
  workshops: [
    {title:'Soul Life-Workshop', meta:'WORKSHOP · EINBLICK 2025', image:'soul-life.webp', description:'Ein geschützter Raum zum Innehalten, Wahrnehmen und bewussten Begegnen.', full:'Einblicke in die Soul Life-Workshops: Zeit für Körperwahrnehmung, persönliche Impulse und Austausch. Die gezeigte Veranstaltung stammt aus 2025. Wenn du dich für ein ähnliches Format interessierst, melde dich gerne persönlich bei mir.'},
    {title:'soul_life_power', meta:'WORKSHOP · EINBLICKE 2024–2025', image:'raum.webp', description:'Gemeinsam in Bewegung kommen. Den eigenen Körper wahrnehmen und nachspüren.', full:'Unter dem Namen soul_life_power finden sich auf meiner bisherigen Website verschiedene Workshop- und Trainingsformate aus 2024 und 2025. Wir nehmen uns Raum für Bewegung, bewusste Wahrnehmung und neue Impulse. Die nächsten Termine besprechen wir persönlich.'},
    {title:'Tanz der Elemente', meta:'WORKSHOP · EINBLICK 2022', image:'elemente.webp', description:'Das Element Holz als Einladung zu Bewegung, Ausdruck und einem frischen Blick.', full:'Ein Rückblick auf den Workshop „Tanz der Elemente – Holz Element“ aus 2022. Die Natur und ihre Wandlungsphasen gaben den Rahmen für diesen gemeinsamen Tag. Diese Karte zeigt einen vergangenen Workshop; ein neuer Termin ist hier nicht angekündigt.'}
  ],
  events: [
    {title:'Vorbereitung auf die Rauhnächte', meta:'VERANSTALTUNG · 18.12.2025', image:'rauhnaechte.webp', description:'Innehalten, Wünsche sammeln und der besonderen Zeit im Winter bewusst begegnen.', full:'Ein Rückblick auf die Veranstaltung vom 18. Dezember 2025. Gemeinsam haben wir uns auf die Rauhnächte eingestimmt und unseren Wünschen Raum gegeben. Ein neuer Termin für 2026 ist in diesem Entwurf nicht angekündigt.'},
    {title:'Kakao Herzenskreis', meta:'VERANSTALTUNG · 11.11.2025', image:'kakao.webp', description:'Zusammensein, zuhören und sich in einer persönlichen Runde begegnen.', full:'Ein Einblick in den Kakao Herzenskreis vom 11. November 2025. Das gemeinsame Ritual und das Miteinander standen im Mittelpunkt. Die Veranstaltung liegt in der Vergangenheit. Wenn du bei einer kommenden Begegnung dabei sein möchtest, schreib mir gerne.'},
    {title:'Shake it off', meta:'VERANSTALTUNG · EINBLICK 2024', image:'shake.webp', description:'Bewegung, lockerlassen und Raum für das eigene Körpergefühl.', full:'Ein Rückblick auf das Format „Shake it off 2024“. Über Bewegung und gemeinsames Nachspüren haben wir uns unserem Körpergefühl zugewandt. Die gezeigte Veranstaltung ist ein Einblick aus dem Archiv; neue Termine erhältst du auf persönliche Anfrage.'}
  ]
};
let selectedTab = 'workshops';
function renderEvents(tab) {
  selectedTab = tab;
  for (const button of qsa('[data-tab]')) {
    const selected = button.dataset.tab === tab;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
  }
  qs('#event-panel').setAttribute('aria-labelledby', tab === 'workshops' ? 'tab-workshops' : 'tab-events');
  qs('#event-panel').innerHTML = eventData[tab].map((e,i)=>`<article class="event-card ${tab === 'events' ? 'event' : ''}"><div class="event-card-img"><img src="assets/${e.image}" width="540" height="458" alt="${e.title} – Einblick aus dem Archiv" loading="lazy"></div><div class="event-card-body"><span>${e.meta}</span><h3>${e.title}</h3><p>${e.description}</p><button class="text-link" data-event="${i}">Einblick ansehen <span aria-hidden="true">↗</span></button></div></article>`).join('');
}
for (const tab of qsa('[data-tab]')) {
  tab.addEventListener('click', () => renderEvents(tab.dataset.tab));
  tab.addEventListener('keydown', e => {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
    e.preventDefault();
    const next = ['Home','End'].includes(e.key) ? (e.key === 'Home' ? 'workshops' : 'events') : (selectedTab === 'workshops' ? 'events' : 'workshops');
    renderEvents(next);
    qs(`[data-tab="${next}"]`).focus();
  });
}
qs('#event-panel').addEventListener('click', e => {
  const button = e.target.closest('[data-event]');
  if (!button) return;
  const data = eventData[selectedTab][Number(button.dataset.event)];
  qs('#detail-content').innerHTML = `<img class="event-detail-image" src="assets/${data.image}" alt="${data.title} – Archivbild"><div class="detail-body"><p class="eyebrow">${data.meta} · ARCHIV</p><h2 id="detail-title">${data.title}</h2><p>${data.full}</p><p>Die gezeigten Termine sind vergangen. Aktuelle Informationen bekommst du direkt bei Daniela.</p><button class="button" data-book="workshop">Interesse an neuen Terminen mitteilen ↗</button></div>`;
  showDialog(detailDialog, button);
});
renderEvents('workshops');

qs('[data-flyer]').addEventListener('click', e => {
  qs('#detail-content').innerHTML = '<img class="flyer-image" width="1080" height="1528" src="assets/paarritual-flyer-warm-20261122.jpg" alt="Paarritual – Raum für eure Liebe. Dauer ca. 2 Stunden. 220 Euro für euch beide."><div class="flyer-body"><h2 id="detail-title">Euer Paar-Ritual</h2><p>120 Minuten · 220 € für euch beide</p><button class="button" data-book="paar">Euren Wunschtermin anfragen ↗</button></div>';
  showDialog(detailDialog, e.currentTarget);
});

const legalContent = {
  impressum: '<h2>Impressum</h2><p><strong>Shiatsu-Praxis Daniela Kellner</strong><br>Inhaberin und Medieninhaberin: Daniela Kellner<br>Unternehmensanschrift:<br>Buchkogelstraße 46/2<br>8072 Fernitz-Mellach, Österreich</p><p>Telefon: <a href="tel:+436641034409">+43 664 1034409</a><br>E-Mail: <a href="mailto:daniela@shiatsu-kellner.at">daniela@shiatsu-kellner.at</a></p><p><strong>Behandlungen nach Vereinbarung</strong><br>Derzeit im Seminarhaus am Eckhof, Murbergstraße 155, 8072 Fernitz-Mellach.<br>Der Ort deines Termins wird persönlich vereinbart.</p><p><strong>Gewerbebezeichnung</strong><br>Massage, eingeschränkt auf Shiatsu.</p><p><strong>Inhaltliche Ausrichtung</strong><br>Informationen über die Praxis, Shiatsu, Mentaltraining, Bewusstseinsarbeit, Rituale und Veranstaltungen von Daniela Kellner.</p><p><strong>Inhalte und Bildmaterial</strong><br>Inhalte und Bildmaterial werden von Daniela Kellner bereitgestellt. Rechte Dritter, insbesondere an der Website-Gestaltung und an gesondert gekennzeichneten Materialien, bleiben unberührt.</p><p><strong>Kammerzugehörigkeit</strong><br>Wirtschaftskammer Steiermark, Landesinnung der Fußpfleger, Kosmetiker und Masseure.</p><p><strong>Gewerbebehörde</strong><br>Bezirkshauptmannschaft Graz-Umgebung.</p><p><strong>Berufsrecht</strong><br>Gewerbeordnung 1994 und die einschlägigen Vorschriften für das Massagegewerbe, abrufbar im <a href="https://www.ris.bka.gv.at/">Rechtsinformationssystem des Bundes</a>.</p><p><a href="impressum/">Impressum als eigene Seite öffnen</a> · <a href="agb/">AGB</a></p>',
  datenschutz: '<p class="eyebrow">DEINE DATEN</p><h2 id="detail-title">Datenschutz im Entwurf</h2><p>Schriften und Bilder werden mit der Seite ausgeliefert. Externe Karten und Instagram werden erst geöffnet, wenn du auf den jeweiligen Link klickst.</p><p><strong>Einfacher Aufrufzähler:</strong> Bei jedem Laden der Praxiswebsite mit aktiviertem JavaScript wird eine leere Meldung an unseren Aufrufzähler auf dem Sites-Hosting (daniela-kellner-auszeit.s-hebnar.chatgpt.site) gesendet. Dauerhaft gespeichert werden nur das Datum nach Wiener Zeit und die Anzahl der Aufrufe pro Tag. Der Zähler setzt keine Cookies und speichert keine IP-Adressen, Besucherkennungen, Herkunftsseiten oder Formularinhalte. Auch erneutes Laden zählt. Die Aufrufzahlen sind nur für die freigegebene Praxisverwaltung sichtbar.</p><p><strong>Terminanfrage:</strong> Deine Formulareingaben werden durch diese Seite weder in einer Datenbank noch im lokalen Browserspeicher gespeichert. Nach deinem Klick auf „Anfrage als E-Mail vorbereiten“ stehen sie dir als Text und als Link zu deinem Mailprogramm zur Verfügung. Erst wenn du die E-Mail dort selbst absendest, erhält Daniela deine Anfrage.</p><p>Verantwortliche für die Bearbeitung deiner versendeten Anfrage ist Daniela Kellner, Buchkogelstraße 46/2, 8072 Fernitz-Mellach. Kontakt: <a href="mailto:daniela@shiatsu-kellner.at">daniela@shiatsu-kellner.at</a>. Die Daten dienen der Bearbeitung deines Terminwunsches.</p><p>Der private Hostingdienst verarbeitet technisch erforderliche Zugriffsdaten nach seinen eigenen Bedingungen. Diese Hinweise beschreiben die Funktion dieses Entwurfs. Für einen späteren öffentlichen Praxisauftritt ist eine vollständige, zum tatsächlich verwendeten System passende Datenschutzerklärung erforderlich.</p>'
};
for (const button of qsa('[data-legal]')) {
  button.addEventListener('click', () => {
    qs('#detail-content').innerHTML = `<div class="detail-body">${legalContent[button.dataset.legal]}</div>`;
    showDialog(detailDialog, button);
  });
}
qs('[data-privacy-inline]').addEventListener('click', () => {qs('#booking-privacy').hidden = !qs('#booking-privacy').hidden;});

for (const eventName of ['input', 'change']) {
  qs('#booking-form').addEventListener(eventName, () => {
    qs('#mail-fallback').hidden = true;
    preparedText = '';
  });
}

qs('#booking-form').addEventListener('submit', e => {
  e.preventDefault();
  const form = e.currentTarget;
  if (!form.reportValidity()) return;
  const f = new FormData(form);
  const value = name => String(f.get(name) || '').trim();
  const service = serviceSelect.selectedOptions[0].text;
  let date = value('datum');
  if (date && date < localToday) {
    dateInput.setCustomValidity('Bitte wähle heute oder ein zukünftiges Datum.');
    dateInput.reportValidity();
    return;
  }
  dateInput.setCustomValidity('');
  const dateLabel = date ? new Date(date + 'T12:00:00').toLocaleDateString('de-AT',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'}) : 'Besprechen wir persönlich';
  const duration = serviceSelect.value === 'workshop' ? 'Nicht zutreffend – Workshop-Information' : serviceSelect.value === 'kennenlernen' ? '3 Termine à 90 Minuten' : durationSelect.value + ' Minuten';
  preparedText = `Liebe Daniela,\n\nich interessiere mich für folgendes Angebot:\n${service}\n\nDauer: ${duration}\n${qs('#booking-price').textContent}\nWunschort: ${qs('#booking-location').selectedOptions[0].textContent}\nWunschdatum: ${dateLabel}\nWunschzeit: ${value('zeit') || 'Nach Vereinbarung'}\n\nMeine Kontaktdaten:\n${value('vorname')} ${value('nachname')}\nE-Mail: ${value('email')}\nTelefon: ${value('telefon')}\n\nRechnungsadresse:\n${value('strasse')}\n${value('plz')} ${value('wohnort')}\n\n${value('nachricht') ? 'Meine Nachricht:\n' + value('nachricht') + '\n\n' : ''}Mir ist bewusst, dass dies eine Anfrage ist und der Termin erst nach deiner persönlichen Bestätigung vereinbart ist. Du darfst meine angegebenen Daten zur Bearbeitung dieser Anfrage verwenden.\n\nLiebe Grüße\n${value('vorname')}`;
  const href = `mailto:daniela@shiatsu-kellner.at?subject=${encodeURIComponent('Terminanfrage · ' + service)}&body=${encodeURIComponent(preparedText)}`;
  qs('#mail-link').href = href;
  qs('#prepared-request').value = preparedText;
  qs('#mail-message').textContent = 'Deine Anfrage ist vorbereitet. Noch nichts versendet. Öffne dein Mailprogramm oder kopiere den Text.';
  qs('#mail-fallback').hidden = false;
  qs('#mail-fallback').scrollIntoView({behavior:'smooth', block:'nearest'});
});
dateInput.addEventListener('input', () => dateInput.setCustomValidity(''));
qs('#copy-request').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(preparedText);
    qs('#mail-message').textContent = 'Anfragetext kopiert. Du kannst ihn jetzt in eine E-Mail an daniela@shiatsu-kellner.at einfügen.';
  } catch {
    qs('#prepared-request').focus();
    qs('#prepared-request').select();
    qs('#mail-message').textContent = 'Bitte den markierten Anfragetext kopieren und in dein Mailprogramm einfügen.';
  }
});


const breathButton = qs('#breathing-button');
const soundToggle = qs('#breath-sound-toggle');
let breathTimers = [];
let breathing = false;
let soundEnabled = true;
const pondSound = createPondAmbience(qs('#pond-audio'), () => {
  soundEnabled = false;
  updateSoundControl();
  qs('#breath-sound-note').textContent = 'Die Naturklänge sind gerade nicht verfügbar. Atme gerne in Stille weiter.';
});
function updateSoundControl() {
  soundToggle.setAttribute('aria-pressed', String(soundEnabled));
  qs('#breath-sound-state').textContent = soundEnabled ? 'Naturklänge an' : 'Naturklänge aus';
  qs('#breath-sound-note').textContent = soundEnabled ? 'Leises Wasserplätschern begleitet deine Atempause.' : 'Deine Atempause bleibt ganz still.';
}
soundToggle.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  updateSoundControl();
  if (soundEnabled && breathing) void pondSound.start();
  else if (!soundEnabled) pondSound.stop();
});
function stopBreathing(done = false, immediate = false) {
  pondSound.stop(immediate);
  breathTimers.forEach(clearTimeout);
  breathTimers = [];
  breathing = false;
  breathButton.classList.remove('breathing');
  qs('#breath-state').textContent = done ? 'Wieder bei dir.' : 'Einfach atmen';
  qs('#breath-instruction').textContent = done ? 'NOCH EIN MOMENT? ↗' : '30 SEKUNDEN FÜR DICH ↗';
  breathButton.setAttribute('aria-label', 'Eine kurze Atempause starten');
  qs('#breath-live').textContent = done ? 'Deine kleine Atempause ist zu Ende.' : 'Atempause beendet.';
}
breathButton.addEventListener('click', () => {
  if (breathing) {stopBreathing(); return;}
  breathing = true;
  if (soundEnabled) void pondSound.start();
  breathButton.classList.add('breathing');
  breathButton.setAttribute('aria-label', 'Atempause beenden');
  const phase = inhale => {
    qs('#breath-state').textContent = inhale ? 'Einatmen.' : 'Ausatmen.';
    qs('#breath-instruction').textContent = 'SANFT. IN DEINEM TEMPO.';
    qs('#breath-live').textContent = inhale ? 'Sanft einatmen, in deinem eigenen Tempo.' : 'Sanft ausatmen, in deinem eigenen Tempo.';
  };
  phase(true);
  for(let cycle=0;cycle<3;cycle++) {
    if (cycle) breathTimers.push(setTimeout(()=>phase(true),cycle*10000));
    breathTimers.push(setTimeout(()=>phase(false),cycle*10000+4000));
  }
  breathTimers.push(setTimeout(()=>stopBreathing(true),30000));
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) return;
  if (breathing) stopBreathing(false, true);
  else pondSound.stop(true);
});
window.addEventListener('pagehide', () => stopBreathing(false, true));

if ('IntersectionObserver' in window && window.matchMedia('(min-width: 1001px) and (hover: hover) and (pointer: fine)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.documentElement.classList.add('js-ready');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target);}});
  }, {threshold:0.08, rootMargin:'0px 0px 10px 0px'});
  qsa('.reveal').forEach(el => observer.observe(el));
}

const heroFrame = qs('#hero-media');
const heroCarousel = createHeroCarousel(heroFrame, qs('#hero-video'), qs('#hero-media-toggle'), window.matchMedia('(prefers-reduced-motion: reduce)').matches);
let heroInView = true;
if ('IntersectionObserver' in window) {
  const heroObserver = new IntersectionObserver(entries => {
    heroInView = entries[0].isIntersecting;
    heroCarousel.setActive(heroInView && !document.hidden);
  }, {threshold:0.1});
  heroObserver.observe(heroFrame);
}
document.addEventListener('visibilitychange', () => heroCarousel.setActive(heroInView && !document.hidden));
window.addEventListener('pagehide', () => heroCarousel.setActive(false));
