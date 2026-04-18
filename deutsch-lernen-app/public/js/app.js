// ── STATE ────────────────────────────────────────────────────
function loadState() {
  try {
    const s = localStorage.getItem('dl4');
    if (s) return JSON.parse(s);
  } catch (e) {}
  return {
    xp: 0, streak: 1,
    vOk: 0, vNo: 0, vTot: 0,
    gCorr: 0, gStreak: 0,
    goals: [false, false, false],
    badges: ['first'],
    lvl: 'a1',
    pct: { a1: 0, a2: 0, b1: 0, b2: 0 },
    lastDay: new Date().toDateString(),
  };
}
function saveState() {
  try { localStorage.setItem('dl4', JSON.stringify(S)); } catch (e) {}
}
const S = loadState();

// ── BOOT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
  checkDayReset();
  renderHome();
  buildGramTopics();
  buildListening();
  buildSpeaking();
  loadVocab();
  syncTopBar();
});

// ── UPDATE / SERVICE WORKER ──────────────────────────────────
function updateApp() {
  // Clear all caches and reload
  if ('caches' in window) {
    caches.keys().then(keys => {
      Promise.all(keys.map(k => caches.delete(k))).then(() => {
        window.location.reload(true);
      });
    });
  } else {
    window.location.reload(true);
  }
}

// Check if a new service worker is waiting → show update button
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(reg => {
    // New SW waiting = update available
    if (reg.waiting) {
      document.getElementById('updateBtn').style.display = 'block';
    }
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          document.getElementById('updateBtn').style.display = 'block';
          showToast('🔄 Actualización disponible — toca 🔄');
        }
      });
    });
  }).catch(() => {});

  // Check for updates every 10 minutes
  setInterval(() => {
    navigator.serviceWorker.getRegistration().then(reg => {
      if (reg) reg.update();
    });
  }, 10 * 60 * 1000);
}

function checkDayReset() {
  const today = new Date().toDateString();
  if (S.lastDay !== today) {
    // New day — reset goals, update streak
    if (S.goals.every(g => g)) S.streak++;
    else if (S.lastDay) S.streak = 1; // missed a day
    S.goals = [false, false, false];
    S.lastDay = today;
    saveState();
  }
}

// ── NAVIGATION ───────────────────────────────────────────────
function nav(id, btn) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('p-' + id).classList.add('active');
  btn.classList.add('active');
  document.getElementById('content').scrollTop = 0;
}

// ── TOP BAR ──────────────────────────────────────────────────
function syncTopBar() {
  document.getElementById('tb-xp').textContent = S.xp;
  document.getElementById('tb-streak').textContent = S.streak;
}

// ── XP & LEVEL ───────────────────────────────────────────────
function addXP(amount, reason = '') {
  S.xp += amount;
  syncTopBar();
  showToast(`+${amount} XP${reason ? ' · ' + reason : ''} 🌟`);
  updateRing();
  checkLevelUp();
  saveState();
}

function updateRing() {
  const lv = LEVELS.find(l => l.id === S.lvl) || LEVELS[0];
  const pct = Math.min(100, Math.round(S.xp / lv.xp * 100));
  S.pct[S.lvl] = pct;

  const fill = document.getElementById('xpFill');
  if (fill) fill.style.width = pct + '%';

  const xpLbl = document.getElementById('xpLabel');
  if (xpLbl) xpLbl.textContent = S.xp + ' XP';

  const xpTot = document.getElementById('xpTotal');
  if (xpTot) xpTot.textContent = 'meta: ' + lv.xp + ' XP';

  const ringPct = document.getElementById('ringPct');
  if (ringPct) ringPct.textContent = pct + '%';

  const ringLbl = document.getElementById('ringLabel');
  if (ringLbl) ringLbl.textContent = lv.label;

  const rc = document.getElementById('ringCircle');
  if (rc) {
    const circum = 176;
    rc.setAttribute('stroke-dashoffset', circum - (pct / 100 * circum));
    const colors = { a1: '#6BCB77', a2: '#4D96FF', b1: '#FFD93D', b2: '#9B72CF' };
    rc.setAttribute('stroke', colors[S.lvl] || '#6BCB77');
  }

  const lcTitle = document.getElementById('lcTitle');
  if (lcTitle) lcTitle.textContent = `${lv.label} — ${lv.name}`;

  const lcDesc = document.getElementById('lcDesc');
  if (lcDesc) lcDesc.textContent = lv.desc;

  const lcNext = document.getElementById('lcNext');
  const left = lv.xp - S.xp;
  if (lcNext) lcNext.textContent = left > 0 ? `🏆 Faltan ${left} XP` : `🎉 ¡Nivel completado!`;

  renderLevelPath();
}

function checkLevelUp() {
  const lv = LEVELS.find(l => l.id === S.lvl) || LEVELS[0];
  if (S.xp >= lv.xp) {
    const idx = LEVELS.findIndex(l => l.id === S.lvl);
    if (idx < LEVELS.length - 1) {
      S.lvl = LEVELS[idx + 1].id;
      confetti();
      showModal('🎓', '¡Nivel alcanzado!',
        `¡Increíble! Ahora estás en el nivel ${LEVELS[idx + 1].label} — ${LEVELS[idx + 1].name}. ¡Sigue así!`);
      saveState();
      renderHome();
    }
  }
}

// ── HOME ─────────────────────────────────────────────────────
function renderHome() {
  updateRing();
  renderGoals();
  renderBadges();
}

function renderGoals() {
  S.goals.forEach((done, i) => {
    const card = document.getElementById('g' + i);
    const tick = document.getElementById('gc' + i);
    if (!card || !tick) return;
    card.className = 'goal-card' + (done ? ' done' : '');
    tick.textContent = done ? '✓' : '';
  });
}

function completeGoal(i) {
  if (S.goals[i]) return;
  S.goals[i] = true;
  renderGoals();
  addXP([15, 10, 10][i], 'objetivo');
  if (S.goals.every(g => g)) {
    confetti();
    showModal('🌟', '¡Todos los objetivos!', '¡Has completado todos los objetivos de hoy! Eres increíble. 🎉');
  }
  saveState();
}

function renderLevelPath() {
  const c = document.getElementById('levelPath');
  if (!c) return;
  c.innerHTML = '';
  const curIdx = LEVELS.findIndex(l => l.id === S.lvl);
  LEVELS.forEach((lv, i) => {
    const isCur = lv.id === S.lvl;
    const pct   = S.pct[lv.id] || 0;
    const locked = i > curIdx;
    const infoMap = {
      a1: 'Saludos, presentación, números y vocabulario diario básico. ¡Tu nivel actual!',
      a2: 'Rutina, compras y viajes. El siguiente gran paso.',
      b1: 'Opiniones, trabajo y textos. Nivel del certificado oficial Goethe-B1.',
      b2: 'Fluidez total. Argumentos complejos y noticias. ¡La meta final!',
    };
    const el = document.createElement('div');
    el.className = `lp-row ${lv.c}${isCur ? ' current' : ''}${locked ? ' locked' : ''}`;
    el.onclick = () => showModal('📌', `${lv.label} — ${lv.name}`, infoMap[lv.id]);
    el.innerHTML = `
      <div class="lp-badge ${lv.c}">${lv.label}</div>
      <div class="lp-body">
        <h3>${lv.label} — ${lv.name}</h3>
        <p>${lv.desc}</p>
        <div class="lp-bar"><div class="lp-fill ${lv.c}" style="width:${pct}%"></div></div>
        <div class="lp-status">${locked ? '🔒 Bloqueado' : isCur ? `📍 Nivel actual — ${pct}%` : '✅ Superado'}</div>
      </div>`;
    c.appendChild(el);
  });
}

function renderBadges() {
  const row = document.getElementById('badgesRow');
  if (!row) return;
  row.innerHTML = '';
  BADGES.forEach(b => {
    const earned = S.badges.includes(b.id);
    const el = document.createElement('div');
    el.className = 'badge-chip' + (earned ? ' earned' : '');
    el.style.opacity = earned ? '1' : '0.4';
    el.innerHTML = `<span class="be">${b.e}</span><span class="bn">${b.n}</span>`;
    el.onclick = () => showModal(b.e, b.n, b.d + (earned ? ' ✓ ¡Ya ganado!' : ' — ¡Aún no!'));
    row.appendChild(el);
  });
}

function earnBadge(id) {
  if (S.badges.includes(id)) return;
  S.badges.push(id);
  const b = BADGES.find(x => x.id === id);
  if (b) { confetti(); showModal(b.e, '¡Logro desbloqueado!', `${b.n}: ${b.d}`); }
  renderBadges();
  saveState();
}

// ── VOCABULARY ───────────────────────────────────────────────
let vList = [], vIdx = 0, vFlipped = false;

function loadVocab() {
  vList = Object.values(VOCAB).flat();
  shuffle(vList);
  showVCard();
}

function setCat(cat, el) {
  document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  vIdx = 0;
  vList = cat === 'all' ? Object.values(VOCAB).flat() : (VOCAB[cat] || []);
  shuffle(vList);
  vFlipped = false;
  showVCard();
}

function showVCard() {
  const w = vList[vIdx % vList.length];
  document.getElementById('vDe').textContent = w.de;
  document.getElementById('vEs').textContent = w.es;
  document.getElementById('vEx').textContent = `„${w.ex}"`;
  document.getElementById('flipCard3d').classList.remove('flipped');
  document.getElementById('feedbackHide').style.display = 'none';
  document.getElementById('feedbackReveal').style.display = 'flex';
  vFlipped = false;
}

function flipCard() {
  if (vFlipped) return;
  vFlipped = true;
  document.getElementById('flipCard3d').classList.add('flipped');
  document.getElementById('feedbackReveal').style.display = 'none';
  document.getElementById('feedbackHide').style.display = 'flex';
  // Speak the German word
  speakGerman(document.getElementById('vDe').textContent);
}

function speakGerman(text) {
  // Find matching speak audio file by text content
  const match = SPEAKING.find(s => s.de === text);
  if (match && match.audioId) {
    const a = new Audio('/audio/' + match.audioId + '.mp3');
    a.play().catch(() => {});
    return;
  }
  // Fallback to browser TTS
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'de-DE'; u.rate = 0.82;
  window.speechSynthesis.speak(u);
}

function markV(ok) {
  S.vTot++;
  if (ok) S.vOk++; else S.vNo++;
  document.getElementById('vs-ok').textContent = S.vOk;
  document.getElementById('vs-no').textContent = S.vNo;
  document.getElementById('vs-tot').textContent = S.vTot;

  if (ok) {
    addXP(5, 'vocabulario');
    completeGoal(0);
  }
  if (S.vOk >= 1)  earnBadge('first');
  if (S.vOk >= 10) earnBadge('vocab10');
  if (S.vOk >= 50) earnBadge('vocab50');
  if (S.vTot > 0 && S.vTot % 15 === 0) {
    showModal('🎉', '¡Ronda completada!',
      `Has repasado ${S.vTot} tarjetas. Correctas: ${S.vOk}. ¡Estupendo!`);
  }
  vIdx++;
  if (vIdx >= vList.length) { vIdx = 0; shuffle(vList); }
  showVCard();
  saveState();
}

// ── GRAMMAR ──────────────────────────────────────────────────
let gTopic = null, gIdx = 0, gAnswered = false;

function buildGramTopics() {
  const grid = document.getElementById('topicGrid');
  grid.innerHTML = '';
  Object.entries(GRAMMAR).forEach(([key, t]) => {
    const el = document.createElement('div');
    el.className = 'topic-card';
    el.innerHTML = `
      <span class="tc-icon">${t.icon}</span>
      <div class="tc-name">${t.title}</div>
      <div class="tc-sub">${t.sub}</div>
      <span class="tc-pill ${t.pill.toLowerCase()}">${t.pill}</span>`;
    el.onclick = () => startGram(key);
    grid.appendChild(el);
  });
}

function startGram(key) {
  gTopic = key; gIdx = 0; gAnswered = false;
  document.getElementById('gramTopicsWrap').style.display = 'none';
  document.getElementById('gramExWrap').style.display = 'block';
  renderGramEx();
}

function backTopics() {
  document.getElementById('gramTopicsWrap').style.display = 'block';
  document.getElementById('gramExWrap').style.display = 'none';
}

function renderGramEx() {
  const t = GRAMMAR[gTopic];
  const ex = t.exs[gIdx % t.exs.length];
  document.getElementById('gTitle').textContent = `${t.title} ${t.icon}`;
  document.getElementById('gSub').textContent = t.sub;
  document.getElementById('gQ').innerHTML = ex.q.replace('___', '<span class="q-blank">___</span>');

  const og = document.getElementById('gOpts');
  og.innerHTML = '';
  ex.opts.forEach(o => {
    const b = document.createElement('button');
    b.className = 'opt-btn';
    b.textContent = o;
    b.onclick = () => checkGramOpt(o, ex.ans, ex.exp, b);
    og.appendChild(b);
  });

  document.getElementById('gExpl').className = 'gram-expl';
  document.getElementById('gExpl').textContent = '';
  document.getElementById('gNext').style.display = 'none';
  gAnswered = false;
}

function checkGramOpt(chosen, correct, exp, btn) {
  if (gAnswered) return;
  gAnswered = true;
  const ok = chosen.toLowerCase() === correct.toLowerCase();
  const expl = document.getElementById('gExpl');

  if (ok) {
    btn.classList.add('correct');
    expl.textContent = exp;
    expl.className = 'gram-expl ok';
    S.gCorr++;
    S.gStreak = (S.gStreak || 0) + 1;
    addXP(10, 'gramática');
    completeGoal(1);
    if (S.gCorr >= 10) earnBadge('gram10');
    if (S.gStreak >= 5) earnBadge('perfect5');
  } else {
    btn.classList.add('wrong');
    expl.textContent = `✗ Correcta: "${correct}". ${exp.replace('✓ ', '')}`;
    expl.className = 'gram-expl err';
    S.gStreak = 0;
    document.querySelectorAll('.opt-btn').forEach(b => {
      if (b.textContent.toLowerCase() === correct.toLowerCase()) b.classList.add('correct');
    });
  }
  document.getElementById('gNext').style.display = 'block';
  saveState();
}

function nextGramEx() {
  gIdx++;
  gAnswered = false;
  renderGramEx();
}

// ── LISTENING ────────────────────────────────────────────────
let currentAudio = null;
let currentAudioBtn = null;
let progressInterval = null;

function stopAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  if (currentAudioBtn) {
    currentAudioBtn.textContent = '▶';
    currentAudioBtn = null;
  }
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
}

function buildListening() {
  const c = document.getElementById('listenCards');
  c.innerHTML = '';

  LISTENING.forEach((item, i) => {
    const qHtml = item.qs.map((q, qi) => `
      <div class="listen-q">
        <div class="lq-label">${q.q}</div>
        <div class="lq-opts">
          ${q.opts.map((o, oi) =>
            `<button class="lq-opt" id="lo${i}${qi}${oi}" onclick="checkListen(${i},${qi},${oi},${q.ans})">${o}</button>`
          ).join('')}
        </div>
      </div>`).join('');

    const el = document.createElement('div');
    el.className = 'listen-card';
    el.innerHTML = `
      <h3>${item.title}</h3>
      <div class="player">
        <button class="play-btn" id="pb${i}" onclick="playAudio(${i})">▶</button>
        <div class="pbar-outer">
          <div class="pbar-track"><div class="pbar-fill" id="pf${i}"></div></div>
          <div class="pbar-time" id="pt${i}">Toca ▶ para escuchar</div>
        </div>
      </div>
      <button class="tr-btn" onclick="toggleTranscript(${i})">📄 Ver / ocultar transcripción</button>
      <div class="tr-text" id="tr${i}">${item.text}</div>
      ${qHtml}`;
    c.appendChild(el);
  });
}

function playAudio(i) {
  const btn  = document.getElementById('pb' + i);
  const bar  = document.getElementById('pf' + i);
  const time = document.getElementById('pt' + i);

  // Same button = stop
  if (currentAudioBtn === btn) {
    stopAudio();
    bar.style.width = '0%';
    time.textContent = 'Toca ▶ para escuchar';
    return;
  }

  // Stop anything else
  stopAudio();

  const audio = new Audio('/audio/' + LISTENING[i].audioId + '.mp3');
  currentAudio = audio;
  currentAudioBtn = btn;
  btn.textContent = '⏸';
  bar.style.width = '0%';
  time.textContent = '0:00';

  audio.addEventListener('loadedmetadata', () => {
    progressInterval = setInterval(() => {
      if (!audio.duration) return;
      const pct = (audio.currentTime / audio.duration) * 100;
      bar.style.width = pct + '%';
      const s = Math.floor(audio.currentTime);
      time.textContent = '0:' + s.toString().padStart(2, '0');
    }, 200);
  });

  audio.addEventListener('ended', () => {
    clearInterval(progressInterval);
    progressInterval = null;
    bar.style.width = '100%';
    time.textContent = '✓ Fin';
    btn.textContent = '▶';
    currentAudio = null;
    currentAudioBtn = null;
  });

  audio.addEventListener('error', () => {
    clearInterval(progressInterval);
    progressInterval = null;
    btn.textContent = '▶';
    time.textContent = '⚠️ Error de audio';
    currentAudio = null;
    currentAudioBtn = null;
  });

  audio.play().catch(() => {
    btn.textContent = '▶';
    time.textContent = '⚠️ No se pudo reproducir';
  });
}

function toggleTranscript(i) {
  document.getElementById('tr' + i).classList.toggle('show');
}

function checkListen(di, qi, oi, correct) {
  const n = LISTENING[di].qs[qi].opts.length;
  for (let j = 0; j < n; j++) {
    const b = document.getElementById(`lo${di}${qi}${j}`);
    if (b) { b.classList.remove('correct', 'wrong'); b.disabled = true; }
  }
  const cb  = document.getElementById(`lo${di}${qi}${oi}`);
  const crb = document.getElementById(`lo${di}${qi}${correct}`);
  if (oi === correct) { cb.classList.add('correct'); addXP(8, 'comprensión'); }
  else { cb.classList.add('wrong'); if (crb) crb.classList.add('correct'); }
}

// ── SPEAKING ─────────────────────────────────────────────────
const micTimers = {};

function buildSpeaking() {
  const c = document.getElementById('speakCards');
  c.innerHTML = '';
  SPEAKING.forEach((p, i) => {
    const el = document.createElement('div');
    el.className = 'speak-card';
    el.innerHTML = `
      <div class="speak-de">${p.de}</div>
      <div class="speak-es">${p.es}</div>
      <button class="mic-btn" id="mic${i}" onclick="toggleMic(${i})">🎤</button>
      <div class="mic-status" id="mics${i}">Toca el micrófono para practicar</div>
      <div class="speak-tip">💡 ${p.tip}</div>`;
    c.appendChild(el);
  });

  const ph = document.getElementById('phonList');
  ph.innerHTML = '';
  PHONETICS.forEach(p => {
    const el = document.createElement('div');
    el.className = 'ph-row';
    el.innerHTML = `
      <div class="ph-badge">${p.s}</div>
      <div>
        <div class="ph-ex">${p.ex}</div>
        <div class="ph-tip">${p.tip}</div>
      </div>`;
    ph.appendChild(el);
  });
}

function toggleMic(i) {
  const mic = document.getElementById('mic' + i);
  const st  = document.getElementById('mics' + i);
  if (micTimers[i]) {
    clearTimeout(micTimers[i]);
    mic.classList.remove('rec');
    st.textContent = '✓ ¡Muy bien! Escúchate y repite.';
    micTimers[i] = null;
    addXP(5, 'pronunciación');
    completeGoal(2);
  } else {
    mic.classList.add('rec');
    st.textContent = '🔴 Grabando… ¡Habla ahora!';
    micTimers[i] = setTimeout(() => {
      mic.classList.remove('rec');
      st.textContent = '✓ ¡Grabado! Escúchate y repite.';
      micTimers[i] = null;
      addXP(5, 'pronunciación');
      completeGoal(2);
    }, 4000);
  }
}

// ── MODAL ────────────────────────────────────────────────────
function showModal(emoji, title, text) {
  document.getElementById('mEmoji').textContent = emoji;
  document.getElementById('mTitle').textContent = title;
  document.getElementById('mText').textContent  = text;
  document.getElementById('modal').classList.add('show');
}
function closeModal() { document.getElementById('modal').classList.remove('show'); }

// ── TOAST ────────────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 1900);
}

// ── CONFETTI ─────────────────────────────────────────────────
function confetti() {
  const cv = document.getElementById('confetti');
  cv.width  = window.innerWidth;
  cv.height = window.innerHeight;
  const ctx = cv.getContext('2d');
  const colors = ['#FF6B35','#FFD93D','#6BCB77','#4D96FF','#9B72CF','#FF9F4A','#FF6B6B'];
  const particles = Array.from({ length: 100 }, () => ({
    x: Math.random() * cv.width, y: -10,
    r: Math.random() * 7 + 3,
    c: colors[Math.floor(Math.random() * colors.length)],
    vx: (Math.random() - 0.5) * 5,
    vy: Math.random() * 4 + 2,
    rot: Math.random() * 360,
    vr: (Math.random() - 0.5) * 10,
  }));
  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    particles.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot * Math.PI / 180);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
      ctx.restore();
      p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.vy += 0.06;
    });
    frame++;
    if (frame < 130) requestAnimationFrame(draw);
    else ctx.clearRect(0, 0, cv.width, cv.height);
  }
  draw();
}

// ── UTILS ────────────────────────────────────────────────────
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}
