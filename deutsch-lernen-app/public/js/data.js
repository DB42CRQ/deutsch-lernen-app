// ── VOCABULARY ──────────────────────────────────────────────
const VOCAB = {
  saludos: [
    { de: 'Guten Morgen',     es: 'Buenos días',           ex: 'Guten Morgen! Wie geht es Ihnen?' },
    { de: 'Guten Tag',        es: 'Buenas tardes',          ex: 'Guten Tag, Herr Müller!' },
    { de: 'Guten Abend',      es: 'Buenas noches',          ex: 'Guten Abend! Willkommen.' },
    { de: 'Auf Wiedersehen',  es: 'Hasta luego',            ex: 'Auf Wiedersehen und tschüss!' },
    { de: 'Tschüss',          es: 'Adiós (informal)',       ex: 'Tschüss! Bis morgen!' },
    { de: 'Danke schön',      es: 'Muchas gracias',         ex: 'Danke schön für Ihre Hilfe!' },
    { de: 'Bitte',            es: 'Por favor / De nada',   ex: 'Bitte, kommen Sie rein.' },
    { de: 'Entschuldigung',   es: 'Disculpe / Perdón',     ex: 'Entschuldigung, wo ist der Bahnhof?' },
    { de: 'Es tut mir leid',  es: 'Lo siento',              ex: 'Es tut mir leid, das war mein Fehler.' },
    { de: 'Wie geht es Ihnen?', es: '¿Cómo está usted?',  ex: 'Guten Morgen! Wie geht es Ihnen?' },
  ],
  numeros: [
    { de: 'null',     es: 'cero',    ex: 'Meine Nummer ist null drei...' },
    { de: 'eins',     es: 'uno',     ex: 'Ich habe eine Katze.' },
    { de: 'zwei',     es: 'dos',     ex: 'Zwei Bier, bitte!' },
    { de: 'drei',     es: 'tres',    ex: 'Es ist drei Uhr.' },
    { de: 'vier',     es: 'cuatro',  ex: 'Vier Jahreszeiten.' },
    { de: 'fünf',     es: 'cinco',   ex: 'Fünf Finger an der Hand.' },
    { de: 'sechs',    es: 'seis',    ex: 'Sechs Tage die Woche.' },
    { de: 'sieben',   es: 'siete',   ex: 'Sieben Tage hat die Woche.' },
    { de: 'acht',     es: 'ocho',    ex: 'Acht Stunden schlafen.' },
    { de: 'neun',     es: 'nueve',   ex: 'Um neun Uhr morgens.' },
    { de: 'zehn',     es: 'diez',    ex: 'Zehn Minuten zu spät.' },
    { de: 'zwanzig',  es: 'veinte',  ex: 'Das kostet zwanzig Euro.' },
    { de: 'hundert',  es: 'cien',    ex: 'Hundert Prozent sicher!' },
  ],
  familia: [
    { de: 'die Mutter',      es: 'la madre',          ex: 'Meine Mutter heißt Maria.' },
    { de: 'der Vater',       es: 'el padre',          ex: 'Mein Vater arbeitet viel.' },
    { de: 'die Schwester',   es: 'la hermana',        ex: 'Meine Schwester ist jung.' },
    { de: 'der Bruder',      es: 'el hermano',        ex: 'Mein Bruder wohnt in Berlin.' },
    { de: 'das Kind',        es: 'el niño / la niña', ex: 'Das Kind spielt gern.' },
    { de: 'die Familie',     es: 'la familia',        ex: 'Meine Familie ist groß.' },
    { de: 'die Großmutter',  es: 'la abuela',         ex: 'Meine Großmutter kocht sehr gut.' },
    { de: 'der Großvater',   es: 'el abuelo',         ex: 'Mein Großvater ist 80 Jahre alt.' },
    { de: 'die Tochter',     es: 'la hija',           ex: 'Meine Tochter heißt Sofia.' },
    { de: 'der Sohn',        es: 'el hijo',           ex: 'Mein Sohn spielt Fußball.' },
  ],
  comida: [
    { de: 'das Brot',        es: 'el pan',        ex: 'Ich esse gern Brot.' },
    { de: 'das Brötchen',    es: 'el panecillo',  ex: 'Zwei Brötchen, bitte.' },
    { de: 'das Wasser',      es: 'el agua',       ex: 'Ein Wasser, bitte.' },
    { de: 'der Kaffee',      es: 'el café',       ex: 'Morgens trinke ich Kaffee.' },
    { de: 'das Fleisch',     es: 'la carne',      ex: 'Das Fleisch ist sehr gut.' },
    { de: 'die Milch',       es: 'la leche',      ex: 'Ich trinke keine Milch.' },
    { de: 'der Apfel',       es: 'la manzana',    ex: 'Ein Apfel am Tag...' },
    { de: 'das Gemüse',      es: 'la verdura',    ex: 'Ich esse viel Gemüse.' },
    { de: 'der Käse',        es: 'el queso',      ex: 'Käse aus der Schweiz ist sehr lecker.' },
    { de: 'das Bier',        es: 'la cerveza',    ex: 'Ein Bier, bitte!' },
  ],
  tiempo: [
    { de: 'heute',       es: 'hoy',         ex: 'Heute ist Montag.' },
    { de: 'morgen',      es: 'mañana',      ex: 'Morgen gehe ich einkaufen.' },
    { de: 'gestern',     es: 'ayer',        ex: 'Gestern war schön.' },
    { de: 'jetzt',       es: 'ahora',       ex: 'Ich muss jetzt gehen.' },
    { de: 'später',      es: 'más tarde',   ex: 'Bis später!' },
    { de: 'immer',       es: 'siempre',     ex: 'Das war immer so.' },
    { de: 'manchmal',    es: 'a veces',     ex: 'Ich laufe manchmal.' },
    { de: 'nie',         es: 'nunca',       ex: 'Ich trinke nie Alkohol.' },
    { de: 'oft',         es: 'a menudo',    ex: 'Ich lerne oft Deutsch.' },
    { de: 'der Montag',  es: 'el lunes',    ex: 'Am Montag arbeite ich.' },
  ],
  verbos: [
    { de: 'sein — ich bin',     es: 'ser/estar — yo soy',   ex: 'Ich bin müde.' },
    { de: 'haben — ich habe',   es: 'tener — yo tengo',     ex: 'Ich habe Hunger.' },
    { de: 'gehen',              es: 'ir',                   ex: 'Ich gehe nach Hause.' },
    { de: 'kommen',             es: 'venir',                ex: 'Ich komme aus Spanien.' },
    { de: 'lernen',             es: 'aprender',             ex: 'Ich lerne Deutsch.' },
    { de: 'sprechen',           es: 'hablar',               ex: 'Ich spreche ein bisschen Deutsch.' },
    { de: 'arbeiten',           es: 'trabajar',             ex: 'Ich arbeite in der Stadt.' },
    { de: 'wohnen',             es: 'vivir / residir',      ex: 'Ich wohne in Berlin.' },
    { de: 'essen',              es: 'comer',                ex: 'Ich esse gerne Pizza.' },
    { de: 'trinken',            es: 'beber',                ex: 'Ich trinke Kaffee.' },
  ],
};

// ── GRAMMAR ─────────────────────────────────────────────────
const GRAMMAR = {
  artikel: {
    title: 'Artículos', icon: '🔤', sub: 'der / die / das', pill: 'A1',
    exs: [
      { q: '___ Hund ist groß.',          ans: 'der', opts: ['der','die','das','ein'],   exp: '✓ Hund es masculino → der Hund.' },
      { q: '___ Frau heißt Anna.',         ans: 'Die', opts: ['Der','Die','Das','Eine'],  exp: '✓ Frau es femenino → die Frau.' },
      { q: '___ Kind spielt Fußball.',     ans: 'Das', opts: ['Der','Die','Das','Ein'],   exp: '✓ Kind es neutro → das Kind.' },
      { q: '___ Buch ist interessant.',    ans: 'Das', opts: ['Der','Die','Das','Ein'],   exp: '✓ Buch es neutro → das Buch.' },
      { q: '___ Mann kauft Brot.',         ans: 'Der', opts: ['Der','Die','Das','Ein'],   exp: '✓ Mann es masculino → der Mann.' },
      { q: '___ Haus ist sehr groß.',      ans: 'Das', opts: ['Der','Die','Das','Ein'],   exp: '✓ Haus es neutro → das Haus.' },
      { q: '___ Mutter kocht gern.',       ans: 'Die', opts: ['Der','Die','Das','Eine'],  exp: '✓ Mutter es femenino → die Mutter.' },
    ]
  },
  verbkonj: {
    title: 'Conjugación', icon: '⚡', sub: 'Presente regular', pill: 'A1',
    exs: [
      { q: 'Ich ___ Deutsch.',        ans: 'lerne',    opts: ['lerne','lernst','lernt','lernen'],      exp: '✓ ich + lernen = ich lerne. ¡Como "yo aprendo"!' },
      { q: 'Du ___ sehr schön.',      ans: 'sprichst', opts: ['spreche','sprichst','spricht','sprechen'], exp: '✓ du + sprechen = du sprichst (raíz e→i).' },
      { q: 'Er ___ in Berlin.',       ans: 'wohnt',    opts: ['wohne','wohnst','wohnt','wohnen'],      exp: '✓ er/sie/es + wohnen = er wohnt.' },
      { q: 'Wir ___ Freunde.',        ans: 'sind',     opts: ['bin','bist','ist','sind'],              exp: '✓ wir + sein = wir sind = somos.' },
      { q: 'Ihr ___ aus Spanien.',    ans: 'kommt',    opts: ['komme','kommst','kommt','kommen'],      exp: '✓ ihr + kommen = ihr kommt.' },
    ]
  },
  negation: {
    title: 'Negación', icon: '🚫', sub: 'nicht / kein', pill: 'A2',
    exs: [
      { q: 'Ich habe ___ Zeit.',          ans: 'keine', opts: ['nicht','kein','keine','nichts'], exp: '✓ keine niega sustantivos femeninos: keine Zeit.' },
      { q: 'Das ist ___ richtig.',        ans: 'nicht', opts: ['nicht','kein','keine','nichts'], exp: '✓ nicht niega adjetivos y verbos.' },
      { q: 'Er hat ___ Auto.',            ans: 'kein',  opts: ['nicht','kein','keine','nichts'], exp: '✓ kein para sustantivos neutros: kein Auto.' },
      { q: 'Ich spreche ___ Russisch.',   ans: 'nicht', opts: ['nicht','kein','keine','nichts'], exp: '✓ nicht para idiomas (sin artículo).' },
    ]
  },
  kasus: {
    title: 'Casos', icon: '📐', sub: 'Nominativ / Akkusativ', pill: 'A2',
    exs: [
      { q: 'Ich sehe ___ Mann.',           ans: 'den', opts: ['der','den','dem','ein'],  exp: '✓ Objeto directo = Akkusativ. Masc: der → den.' },
      { q: '___ Hund bellt sehr laut.',    ans: 'Der', opts: ['Der','Den','Dem','Das'],  exp: '✓ Sujeto = Nominativ: der Hund.' },
      { q: 'Sie kauft ___ Buch.',          ans: 'das', opts: ['der','die','das','dem'],  exp: '✓ Neutro Akkusativ: das Buch (sin cambio).' },
      { q: '___ Frau liest ein Buch.',     ans: 'Die', opts: ['Der','Die','Das','Den'],  exp: '✓ Sujeto femenino = Nominativ: die Frau.' },
    ]
  },
  modal: {
    title: 'Modales', icon: '💬', sub: 'können / müssen / wollen', pill: 'B1',
    exs: [
      { q: 'Ich ___ Deutsch sprechen.',     ans: 'kann',   opts: ['kann','will','muss','darf'],   exp: '✓ können = poder. Ich kann = yo puedo.' },
      { q: 'Du ___ mehr lernen.',           ans: 'musst',  opts: ['kannst','willst','musst','darfst'], exp: '✓ müssen = deber. Du musst = tú debes.' },
      { q: 'Er ___ nach Hause gehen.',      ans: 'will',   opts: ['kann','will','muss','soll'],   exp: '✓ wollen = querer. Er will = él quiere.' },
      { q: 'Hier ___ man nicht rauchen.',   ans: 'darf',   opts: ['kann','will','muss','darf'],   exp: '✓ dürfen (neg.) = no se permite. Man darf nicht = no se puede.' },
    ]
  },
};

// ── LISTENING ────────────────────────────────────────────────
const LISTENING = [
  {
    title: '🛒 En la tienda',
    text: 'Guten Tag! Was darf es sein? — Ich hätte gerne ein Brot und zwei Brötchen, bitte. — Das macht zwei Euro fünfzig. — Bitte schön. Auf Wiedersehen!',
    qs: [
      { q: '¿Cuánto cuesta todo?',    opts: ['€1.50','€2.50','€3.00','€2.00'],              ans: 1 },
      { q: '¿Qué compró el cliente?', opts: ['Solo pan','Pan + panecillos','Solo panecillos','Café y pan'], ans: 1 },
    ]
  },
  {
    title: '🙋 Presentación personal',
    text: 'Hallo! Ich heiße Sarah. Ich komme aus Spanien und wohne jetzt in Berlin. Ich lerne seit drei Monaten Deutsch. Es macht mir sehr viel Spaß!',
    qs: [
      { q: '¿De dónde es Sarah?',          opts: ['Alemania','Austria','España','Suiza'],        ans: 2 },
      { q: '¿Cuánto lleva aprendiendo?',   opts: ['1 mes','6 meses','3 meses','1 año'],          ans: 2 },
    ]
  },
  {
    title: '🍽️ En el restaurante',
    text: 'Guten Abend! Ich hätte gerne die Speisekarte. — Natürlich! Und zu trinken? — Ein Wasser, bitte. — Und zum Essen? — Ich nehme das Schnitzel mit Pommes.',
    qs: [
      { q: '¿Qué pide para beber?', opts: ['Cerveza','Vino','Agua','Café'],                    ans: 2 },
      { q: '¿Qué pide para comer?', opts: ['Ensalada','Schnitzel con patatas','Pizza','Sopa'], ans: 1 },
    ]
  },
  {
    title: '🚂 En la estación de tren',
    text: 'Guten Morgen! Eine Fahrkarte nach München, bitte. — Einfach oder hin und zurück? — Hin und zurück, bitte. — Das macht vierzig Euro. — Danke schön!',
    qs: [
      { q: '¿A dónde viaja?',         opts: ['Berlín','Hamburgo','München','Frankfurt'],        ans: 2 },
      { q: '¿Qué tipo de billete?',   opts: ['Solo ida','Ida y vuelta','Abono','Mensual'],      ans: 1 },
    ]
  },
];

// ── SPEAKING ─────────────────────────────────────────────────
const SPEAKING = [
  { de: 'Wie heißt du?',              es: '¿Cómo te llamas?',         tip: 'Responde: „Ich heiße [tu nombre]." La EI suena como en "veinte".' },
  { de: 'Wo wohnst du?',              es: '¿Dónde vives?',            tip: 'Responde: „Ich wohne in [ciudad]." La W alemana suena como nuestra V.' },
  { de: 'Was machst du gern?',        es: '¿Qué te gusta hacer?',     tip: 'Responde: „Ich lerne gern Deutsch!" La CH en „ich" es suave, como susurrar.' },
  { de: 'Ich komme aus Spanien.',     es: 'Vengo de España.',         tip: 'La IE en Spanien suena como la nuestra. ¡Muy natural!' },
  { de: 'Ich spreche ein bisschen Deutsch.', es: 'Hablo un poco de alemán.', tip: 'Bisschen = un poquito. La SCH suena como nuestra CH.' },
  { de: 'Ich lerne Deutsch, weil...',  es: 'Aprendo alemán porque...', tip: 'Frase abierta. ¡Complétala con tu razón personal!' },
];

// ── PHONETICS ────────────────────────────────────────────────
const PHONETICS = [
  { s: 'ch', ex: 'ich, mich, nicht',      tip: 'Más suave que la J española. Como cuando empañas un espejo.' },
  { s: 'ü',  ex: 'über, müde, fünf',      tip: 'Di "i" con labios redondeados como para decir "u".' },
  { s: 'ö',  ex: 'schön, können, hören',  tip: 'Di "e" con labios redondeados como para decir "o".' },
  { s: 'ß',  ex: 'Straße, heißen, groß',  tip: 'Es una "s" larga. Suena igual que "ss". Tras vocal larga.' },
  { s: 'w',  ex: 'wie, wo, was, wer',     tip: '¡Igual que nuestra V española! "wie" = "vi" (¿cómo?).' },
  { s: 'ei', ex: 'ein, mein, Stein',      tip: 'Suena como "ei" en "veinte". Fácil para hispanohablantes.' },
  { s: 'ie', ex: 'wie, Liebe, Brief',     tip: 'Suena como "i" larga. "wie" = /vi/, "Liebe" = /líbe/.' },
];

// ── LEVELS ───────────────────────────────────────────────────
const LEVELS = [
  { id: 'a1', label: 'A1', name: 'Principiante', c: 'a1', desc: 'Saludos, números y vida cotidiana. ~500 palabras.',    xp: 300  },
  { id: 'a2', label: 'A2', name: 'Elemental',    c: 'a2', desc: 'Compras, viajes y pasado. ~1.000 palabras.',           xp: 700  },
  { id: 'b1', label: 'B1', name: 'Intermedio',   c: 'b1', desc: 'Opiniones y trabajo. ~2.000 palabras. Cert. Goethe.', xp: 1200 },
  { id: 'b2', label: 'B2', name: 'Inter. alto',  c: 'b2', desc: 'Fluidez y argumentos complejos. ~4.000 palabras.',    xp: 2000 },
];

// ── BADGES ───────────────────────────────────────────────────
const BADGES = [
  { id: 'first',    e: '🌱', n: 'Primer paso',  d: 'Completaste tu primera tarjeta' },
  { id: 'vocab10',  e: '📖', n: '10 palabras',  d: '10 tarjetas marcadas como correctas' },
  { id: 'vocab50',  e: '📚', n: '50 palabras',  d: '50 tarjetas marcadas como correctas' },
  { id: 'gram10',   e: '✏️', n: 'Gramático',    d: '10 ejercicios de gramática correctos' },
  { id: 'streak3',  e: '🔥', n: '3 días',       d: 'Racha de 3 días consecutivos' },
  { id: 'streak7',  e: '⚡', n: '7 días',       d: 'Racha de 7 días consecutivos' },
  { id: 'a1done',   e: '🏆', n: 'A1 completo',  d: '¡Superaste el nivel A1!' },
  { id: 'perfect5', e: '⭐', n: 'Perfecto x5',  d: '5 aciertos seguidos sin error' },
];
