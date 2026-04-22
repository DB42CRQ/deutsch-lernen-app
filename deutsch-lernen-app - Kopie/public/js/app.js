// ══════════════════════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════════════════════
function loadState() {
  try { const s = localStorage.getItem('dl5'); if (s) return JSON.parse(s); } catch(e) {}
  return {
    xp:0, streak:1, streakFreeze:0,
    vOk:0, vNo:0, vTot:0,
    gCorr:0, combo:0, maxCombo:0,
    goals:[false,false,false],
    badges:[],
    lvl:'a1',
    lvlXP:{a1:0, a2:0, b1:0, b2:0},
    gramProgress:{},
    unlocked:['a1'],
    exams:{},
    weekXP:[0,0,0,0,0,0,0],
    weekStart:getMonday(),
    lastDay:new Date().toDateString(),
    vRepeat:{},
  };
}
function saveState(){ try{ localStorage.setItem('dl5',JSON.stringify(S)); }catch(e){} }
const S = loadState();

function getMonday(){
  const d=new Date(), day=d.getDay()||7;
  d.setDate(d.getDate()-day+1); return d.toDateString();
}

// ══════════════════════════════════════════════════════════════
//  BOOT
// ══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', ()=>{
  if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{});
  checkDayReset();
  renderHome();
  buildGramTopics();
  buildListening();
  buildSpeaking();
  loadVocab();
  syncTopBar();
  setupSWUpdate();
});

function setupSWUpdate(){
  if(!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/sw.js').then(reg=>{
    if(reg.waiting) showUpdateBtn();
    reg.addEventListener('updatefound',()=>{
      const w=reg.installing;
      w.addEventListener('statechange',()=>{
        if(w.state==='installed'&&navigator.serviceWorker.controller){ showUpdateBtn(); showToast('🔄 Actualización disponible'); }
      });
    });
  }).catch(()=>{});
  setInterval(()=>{ navigator.serviceWorker.getRegistration().then(r=>r&&r.update()); }, 600000);
}
function showUpdateBtn(){ const b=document.getElementById('updateBtn'); if(b) b.style.display='block'; }
function updateApp(){
  if('caches' in window) caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k)))).then(()=>location.reload(true));
  else location.reload(true);
}

function checkDayReset(){
  const today=new Date().toDateString();
  if(S.lastDay===today) return;
  const mon=getMonday();
  if(S.weekStart!==mon){ S.weekXP=[0,0,0,0,0,0,0]; S.weekStart=mon; }
  if(S.goals.every(g=>g)){
    S.streak++;
    if(S.streak%7===0) S.streakFreeze++;
    checkStreakBadges();
  } else {
    if(S.streakFreeze>0){ S.streakFreeze--; showToast('🧊 Streak Freeze usado — racha salvada!'); }
    else S.streak=1;
  }
  S.goals=[false,false,false];
  S.combo=0;
  S.lastDay=today;
  saveState();
}

// ══════════════════════════════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════════════════════════════
function nav(id,btn){
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('p-'+id).classList.add('active');
  if(btn) btn.classList.add('active');
  document.getElementById('content').scrollTop=0;
}

// ══════════════════════════════════════════════════════════════
//  TOP BAR
// ══════════════════════════════════════════════════════════════
function syncTopBar(){
  document.getElementById('tb-xp').textContent=S.xp;
  document.getElementById('tb-streak').textContent=S.streak;
}

// ══════════════════════════════════════════════════════════════
//  XP SYSTEM
// ══════════════════════════════════════════════════════════════
function addXP(base, reason=''){
  let multi=1;
  if(S.combo>=5) multi=3;
  else if(S.combo>=3) multi=2;
  const streakBonus=S.streak>1?1.25:1;
  const earned=Math.round(base*multi*streakBonus);
  S.xp+=earned;
  if(S.lvlXP[S.lvl]!==undefined) S.lvlXP[S.lvl]+=earned;
  const dayIdx=(new Date().getDay()+6)%7;
  S.weekXP[dayIdx]=(S.weekXP[dayIdx]||0)+earned;
  syncTopBar();
  let msg='+'+earned+' XP';
  if(multi>1) msg+=' 🔥×'+multi;
  if(streakBonus>1) msg+=' 🔆';
  if(reason) msg+=' · '+reason;
  showToast(msg);
  updateRing();
  checkLevelReadyForExam();
  saveState();
}

function increaseCombo(){
  S.combo++;
  if(S.combo>S.maxCombo) S.maxCombo=S.combo;
  updateComboUI();
  if(S.maxCombo>=5) earnBadge('perfect5');
}
function resetCombo(){ S.combo=0; updateComboUI(); }
function updateComboUI(){
  const row=document.getElementById('comboRow');
  const badge=document.getElementById('comboBadge');
  if(!row) return;
  if(S.combo>=3){
    row.style.display='flex';
    badge.textContent='🔥 Combo ×'+(S.combo>=5?3:2)+(S.combo>=5?' ⚡':'');
  } else { row.style.display='none'; }
}

// ══════════════════════════════════════════════════════════════
//  HOME
// ══════════════════════════════════════════════════════════════
function renderHome(){
  renderGreeting(); renderPhrase(); updateRing(); updateStats();
  renderWeekChart(); renderGoals(); renderLevelPath(); renderBadges(); updateComboUI();
}

function renderGreeting(){
  const h=new Date().getHours();
  const g=h<12?'¡Buenos días, chiquitina! ☀️':h<18?'¡Buenas tardes, chiquitina! 🌤️':'¡Buenas noches, chiquitina! 🌙';
  const el=document.getElementById('bannerGreeting'); if(el) el.textContent=g;
  // German immersion subtitle — shows German greeting too
  const deGreetings={
    0:'Gute Nacht! 🌙', 1:'Gute Nacht! 🌙', 2:'Gute Nacht! 🌙', 3:'Gute Nacht! 🌙',
    4:'Guten Morgen! ☀️', 5:'Guten Morgen! ☀️', 6:'Guten Morgen! ☀️',
    7:'Guten Morgen! ☀️', 8:'Guten Morgen! ☀️', 9:'Guten Morgen! ☀️',
    10:'Guten Morgen! ☀️', 11:'Guten Morgen! ☀️',
    12:'Guten Tag! 🌤️', 13:'Guten Tag! 🌤️', 14:'Guten Tag! 🌤️',
    15:'Guten Tag! 🌤️', 16:'Guten Tag! 🌤️', 17:'Guten Tag! 🌤️',
    18:'Guten Abend! 🌆', 19:'Guten Abend! 🌆', 20:'Guten Abend! 🌆',
    21:'Guten Abend! 🌆', 22:'Gute Nacht! 🌙', 23:'Gute Nacht! 🌙',
  };
  const deEl=document.getElementById('bannerDE');
  if(deEl) deEl.textContent=deGreetings[h]||'Hallo! 👋';
}

function renderPhrase(){
  // Use day-of-year for more variety across months
  const now=new Date();
  const dayOfYear=Math.floor((now - new Date(now.getFullYear(),0,0)) / 86400000);
  const p=PHRASES[dayOfYear%PHRASES.length];
  const de=document.getElementById('phraseDE'); const es=document.getElementById('phraseES');
  if(de) de.textContent=p.de; if(es) es.textContent=p.es;
}

function updateStats(){
  const w=document.getElementById('statWords'); const g=document.getElementById('statGram');
  const d=document.getElementById('statDays');  const f=document.getElementById('freezeChip');
  if(w) w.textContent=S.vOk; if(g) g.textContent=S.gCorr;
  if(d) d.textContent=S.streak;
  if(f) f.style.display=S.streakFreeze>0?'flex':'none';
  renderStatsDetail();
}

function renderStatsDetail(){
  const el=document.getElementById('statsDetail'); if(!el) return;

  // Vocab accuracy
  const vAcc = S.vTot>0 ? Math.round(S.vOk/S.vTot*100) : 0;

  // Grammar accuracy per topic
  const gramTopics = Object.entries(S.gramProgress||{});
  const bestGram = gramTopics.sort((a,b)=>{
    const pa=a[1].total>0?a[1].correct/a[1].total:0;
    const pb=b[1].total>0?b[1].correct/b[1].total:0;
    return pb-pa;
  });
  const topGram = bestGram[0];
  const weakGram = [...bestGram].reverse()[0];

  // Words needing review (vRepeat > 0)
  const reviewWords = Object.values(S.vRepeat||{}).filter(v=>v>0).length;

  // Badges earned
  const badgesEarned = (S.badges||[]).length;
  const badgesTotal  = typeof BADGES!=='undefined' ? BADGES.length : 27;

  // Total XP this week
  const weekTotal = (S.weekXP||[]).reduce((s,v)=>s+v,0);

  // Max combo
  const maxCombo = S.maxCombo||0;

  // Exam results
  const examResults = Object.entries(S.exams||{}).map(([k,v])=>
    `<span class="sd-exam-chip ${v.passed?'pass':'fail'}">${k.toUpperCase()} ${v.passed?'✓':'✗'} ${v.score}%</span>`
  ).join('');

  const gramName = k => ({artikel:'Artículos',verbkonj:'Conjugación',perfekt:'Pasado',negation:'Negación',kasus:'Casos',praepositionen:'Preposiciones',trennbar:'Separables',adjektive:'Adjetivos',modal:'Modales',satzbau:'Orden'}[k]||k);

  el.innerHTML=`
    <div class="sd-grid">
      <div class="sd-item">
        <div class="sd-val">${vAcc}%</div>
        <div class="sd-lbl">precisión vocab</div>
      </div>
      <div class="sd-item">
        <div class="sd-val">${reviewWords}</div>
        <div class="sd-lbl">palabras a repasar</div>
      </div>
      <div class="sd-item">
        <div class="sd-val">${weekTotal}</div>
        <div class="sd-lbl">XP esta semana</div>
      </div>
      <div class="sd-item">
        <div class="sd-val">${maxCombo}x</div>
        <div class="sd-lbl">combo máximo</div>
      </div>
      <div class="sd-item">
        <div class="sd-val">${badgesEarned}/${badgesTotal}</div>
        <div class="sd-lbl">logros</div>
      </div>
      <div class="sd-item">
        <div class="sd-val">${S.xp}</div>
        <div class="sd-lbl">XP total</div>
      </div>
    </div>
    ${topGram ? `<div class="sd-row"><span class="sd-tag green">💪 Mejor tema: ${gramName(topGram[0])}</span></div>` : ''}
    ${weakGram && weakGram!==topGram ? `<div class="sd-row"><span class="sd-tag orange">📌 A mejorar: ${gramName(weakGram[0])}</span></div>` : ''}
    ${examResults ? `<div class="sd-row" style="flex-wrap:wrap;gap:5px;">${examResults}</div>` : ''}
    ${reviewWords>0 ? `<div class="sd-row"><button class="sd-review-btn" onclick="startReviewMode()">🔄 Repasar ${reviewWords} palabras difíciles</button></div>` : ''}
  `;
}

function renderWeekChart(){
  const c=document.getElementById('weekChart'); if(!c) return;
  const days=['L','M','X','J','V','S','D'];
  const max=Math.max(...S.weekXP,1);
  const today=(new Date().getDay()+6)%7;
  c.innerHTML=days.map((d,i)=>{
    const pct=Math.round((S.weekXP[i]||0)/max*100);
    const isT=i===today;
    return '<div class="week-bar-wrap"><div class="week-bar-track"><div class="week-bar-fill'+(isT?' today':'')+'" style="height:'+Math.max(pct,4)+'%"></div></div><div class="week-bar-label'+(isT?' today':'')+'">'+d+'</div></div>';
  }).join('');
}

function updateRing(){
  const lv=LEVELS.find(l=>l.id===S.lvl)||LEVELS[0];
  const lvXP=S.lvlXP[S.lvl]||0;
  const pct=Math.min(100,Math.round(lvXP/lv.xp*100));
  const fill=document.getElementById('xpFill'); if(fill) fill.style.width=pct+'%';
  const xpLbl=document.getElementById('xpLabel'); if(xpLbl) xpLbl.textContent=lvXP+' XP';
  const xpTot=document.getElementById('xpTotal'); if(xpTot) xpTot.textContent='meta: '+lv.xp+' XP';
  const rPct=document.getElementById('ringPct'); if(rPct) rPct.textContent=pct+'%';
  const rLbl=document.getElementById('ringLabel'); if(rLbl) rLbl.textContent=lv.label;
  const rc=document.getElementById('ringCircle');
  if(rc){
    const colors={a1:'#6BCB77',a2:'#4D96FF',b1:'#FFD93D',b2:'#9B72CF'};
    rc.setAttribute('stroke-dashoffset',176-(pct/100*176));
    rc.setAttribute('stroke',colors[S.lvl]||'#6BCB77');
  }
  const lcT=document.getElementById('lcTitle'); if(lcT) lcT.textContent=lv.label+' — '+lv.name;
  const lcD=document.getElementById('lcDesc');  if(lcD) lcD.textContent=lv.desc;
  const lcN=document.getElementById('lcNext');
  if(lcN){ const left=lv.xp-lvXP; lcN.textContent=left>0?'🏆 Faltan '+left+' XP':'🎓 ¡Listo para el examen!'; }
  renderLevelPath();
}

function checkLevelReadyForExam(){
  const lv=LEVELS.find(l=>l.id===S.lvl)||LEVELS[0];
  const btn=document.getElementById('examBtn'); if(!btn) return;
  const passed=S.exams[S.lvl]&&S.exams[S.lvl].passed;
  btn.style.display=((S.lvlXP[S.lvl]||0)>=lv.xp&&!passed)?'block':'none';
}

function renderGoals(){
  S.goals.forEach((done,i)=>{
    const card=document.getElementById('g'+i); const tick=document.getElementById('gc'+i);
    if(!card||!tick) return;
    card.className='goal-card'+(done?' done':''); tick.textContent=done?'✓':'';
  });
}

function completeGoal(i){
  if(S.goals[i]) return;
  S.goals[i]=true; renderGoals();
  addXP([15,10,10][i],'objetivo'); updateStats();
  if(S.goals.every(g=>g)){ confetti(); showModal('🌟','¡Objetivos del día!','¡Completaste todos los objetivos de hoy, chiquitina! ¡Eres increíble! 🎉'); }
  saveState();
}

function renderLevelPath(){
  const c=document.getElementById('levelPath'); if(!c) return; c.innerHTML='';
  LEVELS.forEach((lv,i)=>{
    const isCur=lv.id===S.lvl, lvXP=S.lvlXP[lv.id]||0;
    const pct=Math.min(100,Math.round(lvXP/lv.xp*100));
    const locked=!S.unlocked.includes(lv.id);
    const passed=S.exams[lv.id]&&S.exams[lv.id].passed;
    const infoMap={a1:'Saludos, presentación y números. ¡Tu nivel actual!',a2:'Rutina, compras y viajes.',b1:'Opiniones y trabajo. Nivel Goethe-B1.',b2:'Fluidez total. ¡La meta final!'};
    const el=document.createElement('div');
    el.className='lp-row '+lv.c+(isCur?' current':'')+(locked?' locked':'')+(passed?' cert-earned':'');
    el.onclick=()=>{
      if(locked) showModal('🔒','Bloqueado','Completa el examen del nivel anterior para desbloquearlo.');
      else if(passed) showCertificate(lv.id);
      else showModal('📌',lv.label+' — '+lv.name,infoMap[lv.id]);
    };
    const status=locked?'🔒 Bloqueado':isCur?'📍 Nivel actual — '+pct+'%':passed?'✅ Aprobado ('+S.exams[lv.id].score+'%)':'✓ Superado';
    el.innerHTML='<div class="lp-badge '+lv.c+'">'+(passed?'✓':lv.label)+'</div><div class="lp-body"><h3>'+lv.label+' — '+lv.name+'</h3><p>'+lv.desc+'</p><div class="lp-bar"><div class="lp-fill '+lv.c+'" style="width:'+(locked?0:pct)+'%"></div></div><div class="lp-status">'+status+'</div></div>';
    c.appendChild(el);
  });
}

function renderBadges(){
  const row=document.getElementById('badgesRow'); if(!row) return; row.innerHTML='';
  BADGES.forEach(b=>{
    const earned=S.badges.includes(b.id);
    const el=document.createElement('div');
    el.className='badge-chip'+(earned?' earned':''); el.style.opacity=earned?'1':'0.4';
    el.innerHTML='<span class="be">'+b.e+'</span><span class="bn">'+b.n+'</span>';
    el.onclick=()=>showModal(b.e,b.n,b.d+(earned?' ✓ ¡Ya ganado!':' — ¡Aún no!'));
    row.appendChild(el);
  });
}

function earnBadge(id){
  if(S.badges.includes(id)) return;
  S.badges.push(id);
  const b=BADGES.find(x=>x.id===id);
  if(b){ confetti(); showModal(b.e,'¡Logro desbloqueado!',b.n+': '+b.d); }
  renderBadges(); saveState();
}

function checkStreakBadges(){
  if(S.streak>=3)  earnBadge('streak3');
  if(S.streak>=7)  earnBadge('streak7');
  if(S.streak>=30) earnBadge('streak30');
}

// ══════════════════════════════════════════════════════════════
//  VOCABULARY — Spaced Repetition + 3 modes + 2 directions
// ══════════════════════════════════════════════════════════════
let vQueue=[], vIdx=0, vFlipped=false;
let vMode='cards', vDir='de', vLevel='a1', vCat='all';
// vRepeat now persisted in S.vRepeat

function getVocabSource(){
  let src = vLevel==='a1'?VOCAB : vLevel==='a2'?VOCAB_A2 : vLevel==='b1'?VOCAB_B1 : VOCAB_B2;
  return vCat==='all' ? Object.values(src).flat() : (src[vCat]||[]);
}

function buildVQueue(){
  const base=getVocabSource(); vQueue=[];
  base.forEach(w=>{ const r=S.vRepeat[w.de]||0; for(let i=0;i<(r>0?3:1);i++) vQueue.push(w); });
  shuffle(vQueue); vIdx=0;
}

function loadVocab(){ buildVQueue(); showVCard(); updateVocabScores(); initFlipScene(); }

function startReviewMode(){
  // Navigate to vocab tab and filter to only wrong words
  nav('vocab', document.querySelectorAll('.nav-btn')[1]);
  // Get all wrong words across all levels
  const wrongWords = [];
  [VOCAB, VOCAB_A2, VOCAB_B1, VOCAB_B2].forEach(src=>{
    if(!src) return;
    Object.values(src).flat().forEach(w=>{
      if((S.vRepeat[w.de]||0)>0) wrongWords.push(w);
    });
  });
  if(wrongWords.length===0){
    showToast('🎉 ¡No tienes palabras difíciles!'); return;
  }
  vQueue = [...wrongWords]; shuffle(vQueue); vIdx=0; vFlipped=false;
  vMode='cards';
  // Update UI
  document.querySelectorAll('.mode-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('modeCards').classList.add('active');
  document.getElementById('modeCardsArea').style.display='block';
  document.getElementById('modeChoiceArea').style.display='none';
  document.getElementById('modeTypeArea').style.display='none';
  // Mark all level buttons as inactive to show "custom" mode
  document.querySelectorAll('.vocab-level-row .lvl-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('vocabBannerSub').textContent='🔄 Repasando '+wrongWords.length+' palabras difíciles';
  showVCard();
  showToast('🔄 Modo repaso: '+wrongWords.length+' palabras');
}

function setVocabMode(mode,btn){
  vMode=mode;
  document.querySelectorAll('.mode-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active');
  document.getElementById('modeCardsArea').style.display  = mode==='cards' ?'block':'none';
  document.getElementById('modeChoiceArea').style.display = mode==='choice'?'block':'none';
  document.getElementById('modeTypeArea').style.display   = mode==='type'  ?'block':'none';
  const subs={cards:'Toca la tarjeta para revelar',choice:'Elige la respuesta correcta',type:'Escribe la traducción'};
  document.getElementById('vocabBannerSub').textContent=subs[mode];
  buildVQueue();
  if(mode==='cards') showVCard(); else if(mode==='choice') showChoiceCard(); else showTypeCard();
}

function setVocabDir(dir,btn){
  vDir=dir; document.querySelectorAll('.dir-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active');
  buildVQueue(); vFlipped=false;
  if(vMode==='cards') showVCard(); else if(vMode==='choice') showChoiceCard(); else showTypeCard();
}

function setVocabLevel(level,btn){
  vLevel=level; vCat='all';
  document.querySelectorAll('.lvl-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active');
  const catLabels={
    a1:{all:'🌟 Todo',saludos:'👋 Saludos',numeros:'🔢 Números',familia:'👪 Familia',comida:'🍎 Comida',tiempo:'⏰ Tiempo',verbos:'⚡ Verbos',adjektivos:'🎨 Adjetivos',colores:'🌈 Colores',casa:'🏠 Casa',kleidung:'👗 Ropa',schule:'🏫 Escuela',tiere:'🐾 Animales',natur:'🌿 Naturaleza',koerperpflege:'🪥 Higiene'},
    a2:{all:'🌟 Todo',ciudad:'🏙️ Ciudad',reisen:'✈️ Viajes',einkaufen:'🛍️ Compras',cuerpo:'🫀 Cuerpo',pasado:'⏳ Pasado',salud:'🏥 Salud',wetter:'🌤️ Tiempo',freizeit:'🎯 Ocio',wohnen:'🏠 Vivienda',kommunikation:'💬 Comunicación',gefuehle:'❤️ Sentimientos'},
    b1:{all:'🌟 Todo',trabajo:'💼 Trabajo',opiniones:'💬 Opiniones',medios:'📺 Medios',gesellschaft:'🌍 Sociedad',kultur:'🎭 Cultura',bildung:'📚 Educación',wissenschaft:'🔬 Ciencia',wirtschaft:'📈 Economía',gesundheit:'💊 Salud',recht:'⚖️ Derecho'},
    b2:{all:'🌟 Todo',sprache:'🗣️ Lengua',politik:'🏛️ Política',psychologie:'🧠 Psicología',wirtschaft_b2:'💹 Economía B2'},
  };
  const labels=catLabels[level]||catLabels.a1;
  document.getElementById('catRow').innerHTML=Object.entries(labels).map(([k,l])=>
    '<div class="cat-chip'+(k==='all'?' active':'')+'" onclick="setCat(\''+k+'\',this)">'+l+'</div>'
  ).join('');
  buildVQueue();
  if(vMode==='cards') showVCard(); else if(vMode==='choice') showChoiceCard(); else showTypeCard();
}

function setCat(cat,el){
  vCat=cat; document.querySelectorAll('.cat-chip').forEach(c=>c.classList.remove('active')); el.classList.add('active');
  buildVQueue(); vFlipped=false;
  if(vMode==='cards') showVCard(); else if(vMode==='choice') showChoiceCard(); else showTypeCard();
}

function updateVocabScores(){
  document.getElementById('vs-ok').textContent=S.vOk;
  document.getElementById('vs-no').textContent=S.vNo;
  document.getElementById('vs-tot').textContent=S.vTot;
}

// ── CARDS ────────────────────────────────────────────────────
function showVCard(){
  if(!vQueue.length) buildVQueue();
  const w=vQueue[vIdx%vQueue.length];
  const front=vDir==='de'?w.de:w.es, back=vDir==='de'?w.es:w.de;
  document.getElementById('vDe').textContent=front;
  document.getElementById('vEs').textContent=back;
  document.getElementById('vEx').textContent='\u201e'+w.ex+'\u201c';
  document.getElementById('vBackLabel').textContent=vDir==='de'?'En español:':'Auf Deutsch:';
  document.getElementById('vCardNum').textContent=(vIdx%vQueue.length+1)+' / '+vQueue.length;
  document.getElementById('flipCard3d').classList.remove('flipped');
  document.getElementById('feedbackReveal').style.display='flex';
  document.getElementById('feedbackHide').style.display='none';
  vFlipped=false;
}

function flipCard(){
  if(vFlipped) return; vFlipped=true;
  document.getElementById('flipCard3d').classList.add('flipped');
  document.getElementById('feedbackReveal').style.display='none';
  document.getElementById('feedbackHide').style.display='flex';
  const w=vQueue[vIdx%vQueue.length];
  if(vDir==='de') speakGerman(w.de,w.audioId);
}

function initFlipScene(){
  const scene = document.getElementById('flipScene');
  if(!scene) return;
  // Use touchend + preventDefault to avoid double-firing on Android
  let touchHandled = false;
  scene.addEventListener('touchend', function(e){
    // Don't trigger if touching a button inside
    if(e.target.tagName === 'BUTTON') return;
    e.preventDefault();
    touchHandled = true;
    flipCard();
    setTimeout(()=>{ touchHandled = false; }, 300);
  }, {passive: false});
  scene.addEventListener('click', function(e){
    if(e.target.tagName === 'BUTTON') return;
    if(touchHandled) return; // already handled by touchend
    flipCard();
  });
}

function markV(ok, e){
  if(e) e.stopPropagation(); // prevent tap bubbling to flip-scene on Android
  const w=vQueue[vIdx%vQueue.length]; S.vTot++;
  if(ok){ S.vOk++; S.vRepeat[w.de]=Math.max(0,(S.vRepeat[w.de]||0)-1); increaseCombo(); addXP(5,'vocabulario'); completeGoal(0); }
  else  { S.vNo++; S.vRepeat[w.de]=(S.vRepeat[w.de]||0)+1; resetCombo(); }
  updateVocabScores(); updateStats(); checkVocabBadges();
  if(S.vTot>0&&S.vTot%15===0) showModal('🎉','¡Ronda completada!','Tarjetas: '+S.vTot+'. Correctas: '+S.vOk+'.');
  vIdx++; if(vIdx>=vQueue.length) buildVQueue();
  showVCard(); saveState();
}

// ── CHOICE ───────────────────────────────────────────────────
function showChoiceCard(){
  if(!vQueue.length) buildVQueue();
  const w=vQueue[vIdx%vQueue.length];
  const correct=vDir==='de'?w.es:w.de;
  document.getElementById('choiceQ').textContent=vDir==='de'?'"'+w.de+'" en español es…':'"'+w.es+'" auf Deutsch ist…';
  const allWords=getVocabSource().filter(x=>x.de!==w.de); shuffle(allWords);
  const opts=[correct,...allWords.slice(0,3).map(x=>vDir==='de'?x.es:x.de)]; shuffle(opts);
  const og=document.getElementById('choiceOpts'); og.innerHTML='';
  opts.forEach(o=>{ const b=document.createElement('button'); b.className='opt-btn choice-opt'; b.textContent=o; b.onclick=()=>checkChoice(o,correct,w,b); og.appendChild(b); });
  document.getElementById('choiceExpl').className='gram-expl'; document.getElementById('choiceExpl').textContent='';
  if(vDir==='de') speakGerman(w.de,w.audioId);
}

function checkChoice(chosen,correct,word,btn){
  if(btn.disabled) return;
  document.querySelectorAll('.choice-opt').forEach(b=>{ b.disabled=true; if(b.textContent===correct) b.classList.add('correct'); });
  const ok=chosen===correct; if(!ok) btn.classList.add('wrong');
  const expl=document.getElementById('choiceExpl');
  expl.textContent=ok?'✓ ¡Correcto!':'✗ Era: "'+correct+'"'; expl.className='gram-expl '+(ok?'ok':'err');
  S.vTot++; if(ok){ S.vOk++; S.vRepeat[word.de]=Math.max(0,(S.vRepeat[word.de]||0)-1); increaseCombo(); addXP(5,'vocabulario'); completeGoal(0); }
  else{ S.vNo++; S.vRepeat[word.de]=(S.vRepeat[word.de]||0)+1; resetCombo(); }
  updateVocabScores(); updateStats(); checkVocabBadges();
  setTimeout(()=>{ vIdx++; if(vIdx>=vQueue.length) buildVQueue(); showChoiceCard(); saveState(); },1200);
}

// ── TYPE ─────────────────────────────────────────────────────
function showTypeCard(){
  if(!vQueue.length) buildVQueue();
  const w=vQueue[vIdx%vQueue.length];
  document.getElementById('typeQ').textContent=vDir==='de'?'En alemán se dice…':'En español se dice…';
  document.getElementById('typeWord').textContent=vDir==='de'?w.es:w.de;
  const inp=document.getElementById('typeInput'); inp.value=''; inp.disabled=false;
  document.getElementById('typeExpl').className='gram-expl'; document.getElementById('typeExpl').textContent='';
  document.getElementById('typeNext').style.display='none';
  setTimeout(()=>{ inp.focus(); },100);
}

function checkType(){
  const w=vQueue[vIdx%vQueue.length], correct=vDir==='de'?w.de:w.es;
  const inp=document.getElementById('typeInput'), typed=inp.value.trim(); if(!typed) return;
  inp.disabled=true;
  const norm=s=>s.toLowerCase().replace(/[äÄ]/g,'a').replace(/[öÖ]/g,'o').replace(/[üÜ]/g,'u').replace(/ß/g,'ss').replace(/[^a-z0-9 ]/g,'');
  const ok=norm(typed)===norm(correct)||levenshtein(norm(typed),norm(correct))<=1;
  const expl=document.getElementById('typeExpl');
  expl.textContent=ok?'✓ ¡Correcto! "'+correct+'"':'✗ Respuesta correcta: "'+correct+'"'; expl.className='gram-expl '+(ok?'ok':'err');
  S.vTot++; if(ok){ S.vOk++; S.vRepeat[w.de]=Math.max(0,(S.vRepeat[w.de]||0)-1); increaseCombo(); addXP(8,'vocabulario'); completeGoal(0); if(vDir==='de') speakGerman(w.de,w.audioId); }
  else{ S.vNo++; S.vRepeat[w.de]=(S.vRepeat[w.de]||0)+1; resetCombo(); }
  updateVocabScores(); updateStats(); checkVocabBadges();
  document.getElementById('typeNext').style.display='block'; saveState();
}

function nextTypeCard(){ vIdx++; if(vIdx>=vQueue.length) buildVQueue(); showTypeCard(); }

function levenshtein(a,b){
  const m=a.length,n=b.length,dp=Array.from({length:m+1},(_,i)=>Array.from({length:n+1},(_,j)=>i===0?j:j===0?i:0));
  for(let i=1;i<=m;i++) for(let j=1;j<=n;j++) dp[i][j]=a[i-1]===b[j-1]?dp[i-1][j-1]:1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
  return dp[m][n];
}

function checkVocabBadges(){
  if(S.vOk>=1) earnBadge('first'); if(S.vOk>=10) earnBadge('vocab10'); if(S.vOk>=50) earnBadge('vocab50');
}


// ══════════════════════════════════════════════════════════════
//  GRAMMAR — with explanations, progress tracking, level filter
// ══════════════════════════════════════════════════════════════
let gTopic=null, gIdx=0, gAnswered=false, gCorrect=0;
let gLevelFilter='all';
// Track per-topic score: {topicKey: {correct, total}}
if(!S.gramProgress) S.gramProgress={};

function setGramLevel(level, btn){
  gLevelFilter=level;
  document.querySelectorAll('.vocab-level-row .lvl-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  buildGramTopics();
}

function buildGramTopics(){
  const grid=document.getElementById('topicGrid'); grid.innerHTML='';
  Object.entries(GRAMMAR).forEach(([key,t])=>{
    if(gLevelFilter!=='all' && t.pill!==gLevelFilter) return;
    const prog=S.gramProgress[key]||{correct:0,total:0};
    const pct=prog.total>0?Math.round(prog.correct/prog.total*100):0;
    const done=pct>=80&&prog.total>=6;
    const el=document.createElement('div');
    el.className='topic-card'+(done?' topic-done':'');
    // Show last 10 questions accuracy for cleaner metric
    const recent = prog.total>10 ? {
      correct: prog.correct - Math.max(0, prog.correct - Math.round(prog.correct/prog.total*Math.min(10,prog.total))),
      total: Math.min(10,prog.total)
    } : prog;
    const recentPct = recent.total>0?Math.round(recent.correct/recent.total*100):pct;
    el.innerHTML=
      '<span class="tc-icon">'+t.icon+(done?' ✅':'')+'</span>'+
      '<div class="tc-name">'+t.title+'</div>'+
      '<div class="tc-sub">'+t.sub+'</div>'+
      '<span class="tc-pill '+t.pill.toLowerCase()+'">'+t.pill+'</span>'+
      (prog.total>0?'<div class="tc-progress"><div class="tc-prog-fill" style="width:'+pct+'%"></div></div><div class="tc-pct">'+pct+'% ('+prog.correct+'/'+prog.total+')</div>':'');
    el.onclick=()=>startGram(key);
    grid.appendChild(el);
  });
}

function startGram(key){
  gTopic=key; gIdx=0; gAnswered=false; gCorrect=0;
  // Shuffle exercises for variety
  GRAMMAR[key]._shuffled = [...GRAMMAR[key].exs]; shuffle(GRAMMAR[key]._shuffled);
  const t=GRAMMAR[key];
  // Show explanation first
  document.getElementById('gramTopicsWrap').style.display='none';
  document.getElementById('gramExplainWrap').style.display='block';
  document.getElementById('gramExWrap').style.display='none';
  document.getElementById('explainTitle').textContent=t.title+' '+t.icon;
  document.getElementById('explainRule').textContent=t.explain.rule;
  const exEl=document.getElementById('explainExamples');
  exEl.innerHTML=t.explain.examples.map(e=>'<div class="explain-ex-item">'+e+'</div>').join('');
  document.getElementById('explainTip').textContent=t.explain.tip;
}

function startExercises(){
  document.getElementById('gramExplainWrap').style.display='none';
  document.getElementById('gramExWrap').style.display='block';
  renderGramEx();
}

function backTopics(){
  document.getElementById('gramTopicsWrap').style.display='block';
  document.getElementById('gramExplainWrap').style.display='none';
  document.getElementById('gramExWrap').style.display='none';
  buildGramTopics(); // refresh progress
}

function renderGramEx(){
  const t=GRAMMAR[gTopic];
  const exs=t._shuffled||t.exs; const total=exs.length;
  const ex=exs[gIdx%total];
  document.getElementById('gTitle').textContent=t.title+' '+t.icon;
  document.getElementById('gSub').textContent=t.sub;
  document.getElementById('gQ').innerHTML=ex.q.replace('___','<span class="q-blank">___</span>');
  document.getElementById('gramCounter').textContent=(gIdx+1)+' / '+total;
  document.getElementById('gramProgFill').style.width=((gIdx+1)/total*100)+'%';
  document.getElementById('gramScoreBadge').textContent='✓ '+gCorrect;
  const og=document.getElementById('gOpts'); og.innerHTML='';
  ex.opts.forEach(o=>{
    const b=document.createElement('button'); b.className='opt-btn'; b.textContent=o;
    b.onclick=()=>checkGramOpt(o,ex.ans,ex.exp,ex.q,b); og.appendChild(b);
  });
  document.getElementById('gExpl').className='gram-expl'; document.getElementById('gExpl').textContent='';
  document.getElementById('gNext').style.display='none'; gAnswered=false;
  // Reset hint
  const hint=document.getElementById('gHint');
  if(hint){ hint.style.display='none'; hint.textContent=''; }
  // Show hint button (💡) — extracts Spanish from exp field
  const hbtn=document.getElementById('gHintBtn');
  if(hbtn){
    hbtn.style.display='inline-flex';
    hbtn.onclick=()=>toggleGramHint(ex);
  }
}

function toggleGramHint(ex){
  const hint=document.getElementById('gHint');
  if(!hint) return;
  if(hint.style.display==='block'){
    hint.style.display='none'; return;
  }
  // Extract Spanish translation from exp field
  // exp looks like: "sein → Präteritum: ich war." — we show it as context
  // Also show es field if present
  let hintText = '';
  if(ex.es) {
    hintText = ex.es;
  } else {
    // Build hint from exp: extract anything after the last colon or the whole thing
    hintText = ex.exp.replace(/^[✓✗]\s*/, '');
  }
  hint.textContent = '💬 ' + hintText;
  hint.style.display='block';
}

function checkGramOpt(chosen,correct,exp,questionText,btn){
  if(gAnswered) return; gAnswered=true;
  const ok=chosen.toLowerCase()===correct.toLowerCase();
  if(!S.gramProgress[gTopic]) S.gramProgress[gTopic]={correct:0,total:0};
  S.gramProgress[gTopic].total++;
  // Hide hint if showing
  const hint=document.getElementById('gHint');
  if(hint) hint.style.display='none';
  const hbtn=document.getElementById('gHintBtn');
  if(hbtn) hbtn.style.display='none';

  if(ok){
    btn.classList.add('correct');
    // Build and speak the full correct German sentence
    const fullSentence = questionText ? questionText.replace('___', correct) : correct;
    speakGerman(fullSentence, null);
    // Show explanation + full sentence
    document.getElementById('gExpl').innerHTML =
      '<div class="gram-expl-row">'+
        '<span>✓ '+exp+'</span>'+
        '<button class="gram-speak-btn" id="gSpeakBtn">🔊</button>'+
      '</div>'+
      '<div class="gram-full-sentence">'+fullSentence+'</div>';
    document.getElementById('gExpl').className='gram-expl ok';
    var sb=document.getElementById('gSpeakBtn');
    if(sb){sb._s=fullSentence;sb.onclick=function(){speakGerman(this._s,null);};}
    S.gCorr++; gCorrect++;
    S.gramProgress[gTopic].correct++;
    document.getElementById('gramScoreBadge').textContent='✓ '+gCorrect;
    increaseCombo(); addXP(10,'gramática'); completeGoal(1); updateStats();
    if(S.gCorr>=10) earnBadge('gram10');
  } else {
    btn.classList.add('wrong');
    // Show correct answer + speak it
    const fullSentence = questionText ? questionText.replace('___', correct) : correct;
    speakGerman(fullSentence, null);
    document.getElementById('gExpl').innerHTML =
      '<div class="gram-expl-row">'+
        '<span>✗ Correcta: "'+correct+'". '+exp.replace('✓ ','')+'</span>'+
        '<button class="gram-speak-btn" id="gSpeakBtn">🔊</button>'+
      '</div>'+
      '<div class="gram-full-sentence">'+fullSentence+'</div>';
    document.getElementById('gExpl').className='gram-expl err';
    var sb=document.getElementById('gSpeakBtn');
    if(sb){sb._s=fullSentence;sb.onclick=function(){speakGerman(this._s,null);};}
    resetCombo();
    document.querySelectorAll('.opt-btn').forEach(b=>{if(b.textContent.toLowerCase()===correct.toLowerCase()) b.classList.add('correct');});
  }
  document.getElementById('gNext').style.display='block';
  if(gIdx===(GRAMMAR[gTopic]._shuffled||GRAMMAR[gTopic].exs).length-1){
    document.getElementById('gNext').textContent='Ver resultado ✓';
  }
  saveState();
}

function nextGramEx(){
  gIdx++;
  if(gIdx>=(GRAMMAR[gTopic]._shuffled||GRAMMAR[gTopic].exs).length){
    // Finished all questions
    const prog=S.gramProgress[gTopic];
    const pct=prog.total>0?Math.round(prog.correct/prog.total*100):0;
    const passed=pct>=80;
    if(passed){ confetti(); earnBadge('gram_'+gTopic); }
    showModal(passed?'🎉':'📚',
      passed?'¡Tema dominado!':'¡Sigue practicando!',
      'Puntuación: '+gCorrect+' / '+GRAMMAR[gTopic].exs.length+' ('+pct+'%). '+
      (passed?'¡Excelente dominio del tema!':'Practica un poco más para mejorar. ¡Tú puedes!')
    );
    backTopics();
    return;
  }
  gAnswered=false; renderGramEx();
}


// ══════════════════════════════════════════════════════════════
//  LISTENING — 12 dialogs, level filter, vocab help, score
// ══════════════════════════════════════════════════════════════
let currentAudio=null, currentAudioBtn=null, progressInterval=null;
let listenLevelFilter='all';
let listenCorrect=0, listenTotal=0;

function setListenLevel(level, btn){
  listenLevelFilter=level;
  document.querySelectorAll('.vocab-level-row .lvl-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  buildListening();
}

function stopAudio(){
  if(currentAudio){ currentAudio.pause(); currentAudio.currentTime=0; currentAudio=null; }
  if(currentAudioBtn){ currentAudioBtn.textContent='▶'; currentAudioBtn=null; }
  if(progressInterval){ clearInterval(progressInterval); progressInterval=null; }
}

function buildListening(){
  const c=document.getElementById('listenCards'); c.innerHTML='';
  const items = listenLevelFilter==='all'
    ? LISTENING
    : LISTENING.filter(i=>i.level===listenLevelFilter);

  items.forEach((item,i)=>{
    const realIdx = LISTENING.indexOf(item);
    // Level badge color
    const lvlColor = item.level==='A1'?'var(--a1c)':item.level==='A2'?'var(--a2c)':'var(--b1c)';
    const lvlBg    = item.level==='A1'?'var(--mint-light)':item.level==='A2'?'var(--sky-light)':'var(--sun-light)';

    const qHtml = item.qs.map((q,qi)=>
      '<div class="listen-q"><div class="lq-label">'+q.q+'</div>'+
      '<div class="lq-opts">'+
      q.opts.map((o,oi)=>'<button class="lq-opt" id="lo'+realIdx+qi+oi+'" onclick="checkListen('+realIdx+','+qi+','+oi+','+q.ans+')">'+o+'</button>').join('')+
      '</div></div>'
    ).join('');

    const vocabHtml = item.vocab
      ? '<div class="vocab-help" id="vh'+realIdx+'" style="display:none;">'+
        item.vocab.map(v=>'<div class="vocab-help-item"><span class="vh-de">'+v.de+'</span><span class="vh-es">'+v.es+'</span></div>').join('')+
        '</div>'
      : '';

    const el=document.createElement('div');
    el.className='listen-card';
    el.innerHTML=
      '<div class="listen-card-header">'+
        '<h3>'+item.title+'</h3>'+
        '<span class="listen-level-badge" style="background:'+lvlBg+';color:'+lvlColor+'">'+item.level+'</span>'+
      '</div>'+
      '<div class="player">'+
        '<button class="play-btn" id="pb'+realIdx+'" onclick="playAudio('+realIdx+')">▶</button>'+
        '<div class="pbar-outer">'+
          '<div class="pbar-track"><div class="pbar-fill" id="pf'+realIdx+'"></div></div>'+
          '<div class="pbar-time" id="pt'+realIdx+'">Toca ▶ para escuchar</div>'+
        '</div>'+
      '</div>'+
      '<div class="listen-card-actions">'+
        '<div class="speed-row">'+
          '<span class="speed-label">🐢</span>'+
          '<button class="speed-btn" onclick="setSpeed('+realIdx+',0.6,this)">0.6×</button>'+
          '<button class="speed-btn" onclick="setSpeed('+realIdx+',0.8,this)">0.8×</button>'+
          '<button class="speed-btn active" onclick="setSpeed('+realIdx+',1.0,this)">1.0×</button>'+
          '<button class="speed-btn" onclick="setSpeed('+realIdx+',1.25,this)">1.25×</button>'+
        '</div>'+
        '<div class="listen-action-btns">'+
          (item.vocab ? '<button class="tr-btn" onclick="toggleVocab('+realIdx+')">📖 Vocab</button>' : '')+
          '<button class="tr-btn" onclick="toggleTranscript('+realIdx+')">📄 Texto</button>'+
        '</div>'+
      '</div>'+
      vocabHtml+
      '<div class="tr-text" id="tr'+realIdx+'">'+item.text+'</div>'+
      '<div class="listen-score" id="lscore'+realIdx+'"></div>'+
      qHtml;
    c.appendChild(el);
  });
  updateListenScoreRow();
}

function playAudio(i){
  const btn=document.getElementById('pb'+i),bar=document.getElementById('pf'+i),time=document.getElementById('pt'+i);
  if(currentAudioBtn===btn){ stopAudio(); bar.style.width='0%'; time.textContent='Toca ▶ para escuchar'; return; }
  stopAudio();
  const audio=new Audio('/audio/'+LISTENING[i].audioId+'.mp3');
  currentAudio=audio; currentAudioBtn=btn; btn.textContent='⏸'; bar.style.width='0%'; time.textContent='0:00';
  audio.addEventListener('loadedmetadata',()=>{
    progressInterval=setInterval(()=>{
      if(!audio.duration) return;
      bar.style.width=(audio.currentTime/audio.duration*100)+'%';
      time.textContent='0:'+Math.floor(audio.currentTime).toString().padStart(2,'0');
    },200);
  });
  audio.addEventListener('ended',()=>{
    clearInterval(progressInterval); progressInterval=null;
    bar.style.width='100%'; time.textContent='✓ Fin';
    btn.textContent='▶'; currentAudio=null; currentAudioBtn=null;
  });
  audio.addEventListener('error',()=>{
    clearInterval(progressInterval); progressInterval=null;
    currentAudio=null; currentAudioBtn=null;
    // Fallback: TTS mit dem Dialog-Text
    const item=LISTENING[i];
    if(item && item.text && window.speechSynthesis){
      btn.textContent='🔊'; time.textContent='▶ TTS…';
      window.speechSynthesis.cancel();
      const u=new SpeechSynthesisUtterance(item.text);
      u.lang='de-DE'; u.rate=getSpeed(i)*0.75;
      const vx=window.speechSynthesis.getVoices().find(v=>v.lang==='de-DE')||
               window.speechSynthesis.getVoices().find(v=>v.lang.startsWith('de'));
      if(vx) u.voice=vx;
      u.onstart=()=>{ time.textContent='🔊 Escuchando…'; };
      u.onend=()=>{ btn.textContent='▶'; time.textContent='✓ Fin (TTS)'; };
      window.speechSynthesis.speak(u);
    } else {
      btn.textContent='▶'; time.textContent='⚠️ Sin audio — ejecuta generate_audio.py';
    }
  });
  audio.playbackRate=getSpeed(i);
  audio.play().catch(()=>{
    // play() rejected before error event — trigger TTS directly
    clearInterval(progressInterval); progressInterval=null;
    currentAudio=null; currentAudioBtn=null;
    const item=LISTENING[i];
    if(item && item.text && window.speechSynthesis){
      btn.textContent='🔊'; time.textContent='▶ TTS…';
      window.speechSynthesis.cancel();
      const u=new SpeechSynthesisUtterance(item.text);
      u.lang='de-DE'; u.rate=getSpeed(i)*0.75;
      const vv=window.speechSynthesis.getVoices().find(v=>v.lang==='de-DE')||
               window.speechSynthesis.getVoices().find(v=>v.lang.startsWith('de'));
      if(vv) u.voice=vv;
      u.onend=()=>{ btn.textContent='▶'; time.textContent='✓ Fin (TTS)'; };
      window.speechSynthesis.speak(u);
    } else {
      btn.textContent='▶'; time.textContent='⚠️ Sin audio';
    }
  });
}

const cardSpeeds={};
function setSpeed(i,speed,btn){
  cardSpeeds[i]=speed;
  btn.closest('.speed-row').querySelectorAll('.speed-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  if(currentAudio&&currentAudioBtn===document.getElementById('pb'+i)) currentAudio.playbackRate=speed;
}
function getSpeed(i){ return cardSpeeds[i]||1.0; }
function toggleTranscript(i){ document.getElementById('tr'+i).classList.toggle('show'); }
function toggleVocab(i){
  const vh=document.getElementById('vh'+i);
  if(vh) vh.style.display=vh.style.display==='none'?'block':'none';
}

function checkListen(di,qi,oi,correct){
  const n=LISTENING[di].qs[qi].opts.length;
  for(let j=0;j<n;j++){
    const b=document.getElementById('lo'+di+qi+j);
    if(b){ b.classList.remove('correct','wrong'); b.disabled=true; }
  }
  const cb=document.getElementById('lo'+di+qi+oi);
  const crb=document.getElementById('lo'+di+qi+correct);
  listenTotal++;
  const isCorrect=(oi===correct);
  // Record actual result for score tracking
  if(!listenResults[di]) listenResults[di]={};
  listenResults[di][qi]=isCorrect;
  if(isCorrect){
    cb.classList.add('correct');
    listenCorrect++;
    increaseCombo(); addXP(8,'comprensión');
  } else {
    cb.classList.add('wrong');
    if(crb) crb.classList.add('correct');  // show correct answer
    resetCombo();
  }
  updateListenScoreRow();
  updateDialogScore(di);
}

// Track per-question correctness: listenResults[di][qi] = true/false
const listenResults={};

function updateDialogScore(di){
  const item=LISTENING[di];
  const results=listenResults[di]||{};
  const answered=Object.keys(results).length;
  if(answered===0) return;
  const correct=Object.values(results).filter(Boolean).length;
  const sc=document.getElementById('lscore'+di);
  if(sc){
    const pct=Math.round(correct/answered*100);
    sc.textContent='✓ '+correct+' / '+answered+' correctas';
    sc.style.color=pct>=80?'var(--mint-d)':pct>=50?'var(--b1c)':'var(--coral)';
  }
}

function updateListenScoreRow(){
  const lc=document.getElementById('ls-correct');
  const lt=document.getElementById('ls-total');
  if(lc) lc.textContent=listenCorrect;
  if(lt) lt.textContent=listenTotal;
  // Count how many dialogs are fully answered
  const items=listenLevelFilter==='all'?LISTENING:LISTENING.filter(i=>i.level===listenLevelFilter);
  const completed=items.filter(item=>{
    const di=LISTENING.indexOf(item);
    const results=listenResults[di]||{};
    return Object.keys(results).length===item.qs.length;
  }).length;
  const compEl=document.getElementById('ls-completed');
  if(compEl) compEl.textContent=completed+'/'+items.length+' diálogos';
}



// ══════════════════════════════════════════════════════════════
//  SPEAKING — Practicar con reconocimiento de voz
// ══════════════════════════════════════════════════════════════
const micTimers={};
const shadowData={}; // stores {text,audioId} per phrase index
let speakMode='normal', speakLevelFilter='all';
let spPracticedToday=0, spTotalSession=0;
let shadowStep={};

// ── SPEECH RECOGNITION SETUP ─────────────────────────────────
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let srSupported = !!SpeechRecognition;
let activeRecognition = null;

function setSpeakMode(mode,btn){
  speakMode=mode;
  document.querySelectorAll('.vocab-mode-row .mode-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('speakCardsWrap').style.display=mode==='phonetic'?'none':'block';
  document.getElementById('speakPhoneticWrap').style.display=mode==='phonetic'?'block':'none';
  if(mode!=='phonetic') buildSpeakCards();
}

function setSpeakLevel(level,btn){
  speakLevelFilter=level;
  document.querySelectorAll('.vocab-level-row .lvl-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  buildSpeakCards();
}

function buildSpeaking(){
  renderSentenceOfDay();
  buildSpeakCards();
  buildPhonetics();
  updateSpeakStats();
}

// ── SENTENCE OF THE DAY ──────────────────────────────────────
function renderSentenceOfDay(){
  // Habla: show a random SPEAKING phrase for pronunciation practice
  // Uses day-of-year so it changes daily
  const now=new Date();
  const dayOfYear=Math.floor((now - new Date(now.getFullYear(),0,0)) / 86400000);
  const idx=dayOfYear%SPEAKING.length;
  const p=SPEAKING[idx];
  const de=document.getElementById('dailySpeakDE');
  const es=document.getElementById('dailySpeakES');
  if(de) de.textContent=p.de;
  if(es) es.textContent=p.es;
}

function playSentenceOfDay(){
  const now=new Date();
  const dayOfYear=Math.floor((now - new Date(now.getFullYear(),0,0)) / 86400000);
  const idx=dayOfYear%SPEAKING.length;
  const p=SPEAKING[idx];
  speakGerman(p.de,p.audioId||null);
  const st=document.getElementById('dailyStatus');
  if(st){ st.textContent='▶ Escuchando…'; setTimeout(()=>{ st.textContent='✓ Ahora repítelo en voz alta'; },1800); }
}

let dailyMicTimer=null;
function toggleDailyMic(){
  const lbl=document.getElementById('dailyMicLabel');
  const st=document.getElementById('dailyStatus');
  const now=new Date();
  const dayOfYear=Math.floor((now - new Date(now.getFullYear(),0,0)) / 86400000);
  const idx=dayOfYear%SPEAKING.length;
  const p=SPEAKING[idx];
  if(srSupported){
    startRecognition(p.de, null, lbl, st, ()=>{
      addXP(5,'pronunciación'); completeGoal(2);
      spPracticedToday++; spTotalSession++; updateSpeakStats();
    });
  } else {
    // Fallback timer
    if(dailyMicTimer){ clearTimeout(dailyMicTimer); dailyMicTimer=null; if(lbl) lbl.textContent='Practicar'; if(st) st.textContent='✓ ¡Listo!'; addXP(5,'pronunciación'); completeGoal(2); spPracticedToday++; spTotalSession++; updateSpeakStats(); }
    else{ if(lbl) lbl.textContent='Detener'; if(st) st.textContent='🔴 Grabando…'; dailyMicTimer=setTimeout(()=>{ dailyMicTimer=null; if(lbl) lbl.textContent='Practicar'; if(st) st.textContent='✓ ¡Grabado!'; addXP(5,'pronunciación'); completeGoal(2); spPracticedToday++; spTotalSession++; updateSpeakStats(); },4000); }
  }
}

// ── SPEECH RECOGNITION ENGINE ────────────────────────────────
function startRecognition(targetText, audioId, btnEl, statusEl, onDone){
  // Stop any ongoing recognition
  if(activeRecognition){ try{ activeRecognition.stop(); }catch(e){} activeRecognition=null; }

  if(!srSupported){
    if(statusEl) statusEl.innerHTML='⚠️ Tu navegador no soporta reconocimiento de voz.<br><small>Usa Chrome en Android para esta función.</small>';
    return;
  }

  const sr=new SpeechRecognition();
  sr.lang='de-DE';
  sr.continuous=false;
  sr.interimResults=true;
  sr.maxAlternatives=3;
  activeRecognition=sr;

  if(btnEl){ btnEl.textContent='⏹ Detener'; btnEl.classList.add('rec'); }
  if(statusEl) statusEl.innerHTML='🔴 <strong>Escuchando…</strong> Habla ahora en alemán';

  sr.onresult=function(e){
    let best='', bestConf=0;
    // Try all alternatives across results
    for(let ri=0;ri<e.results.length;ri++){
      for(let ai=0;ai<e.results[ri].length;ai++){
        const alt=e.results[ri][ai];
        if(alt.confidence>bestConf){ bestConf=alt.confidence; best=alt.transcript; }
      }
      // Always grab final result even if confidence=0
      if(e.results[ri].isFinal && best==='') best=e.results[ri][0].transcript;
    }
    if(e.results[e.results.length-1].isFinal){
      activeRecognition=null;
      if(btnEl){ btnEl.textContent='🎤 Reintentar'; btnEl.classList.remove('rec'); }
      showPronFeedback(best, targetText, statusEl);
      if(onDone) onDone(best);
    } else {
      // Show interim
      if(statusEl) statusEl.innerHTML='🎙️ <em>'+best+'</em>';
    }
  };

  sr.onerror=function(e){
    activeRecognition=null;
    if(btnEl){ btnEl.textContent='🎤 Reintentar'; btnEl.classList.remove('rec'); }
    const msgs={
      'no-speech':'No se detectó voz. ¿Está el micrófono activado?',
      'not-allowed':'Permiso de micrófono denegado. Actívalo en el navegador.',
      'network':'Error de red. Comprueba la conexión.',
      'audio-capture':'No se encontró micrófono.',
    };
    if(statusEl) statusEl.innerHTML='⚠️ '+(msgs[e.error]||'Error: '+e.error);
  };

  sr.onend=function(){
    if(activeRecognition===sr) activeRecognition=null;
    if(btnEl && btnEl.classList.contains('rec')){ btnEl.textContent='🎤 Reintentar'; btnEl.classList.remove('rec'); if(statusEl && !statusEl.querySelector('.pron-result')) statusEl.innerHTML='⚠️ No se detectó voz. Inténtalo de nuevo.'; }
  };

  sr.start();
}

// ── PRONUNCIATION FEEDBACK ────────────────────────────────────
function normWord(w){
  return w.toLowerCase()
    .replace(/[äÄ]/g,'a').replace(/[öÖ]/g,'o').replace(/[üÜ]/g,'u')
    .replace(/ß/g,'ss').replace(/[!?,.:;'"]/g,'').trim();
}

function levenshtein(a,b){
  const m=a.length,n=b.length,dp=[];
  for(let i=0;i<=m;i++){ dp[i]=[i]; }
  for(let j=0;j<=n;j++){ dp[0][j]=j; }
  for(let i=1;i<=m;i++) for(let j=1;j<=n;j++)
    dp[i][j]=a[i-1]===b[j-1]?dp[i-1][j-1]:1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
  return dp[m][n];
}

function showPronFeedback(heard, target, statusEl){
  if(!heard || !statusEl) return;

  const targetWords = target.split(/\s+/).filter(Boolean);
  const heardWords  = heard.split(/\s+/).filter(Boolean);

  // Match each target word to best heard word
  let correct=0, html='<div class="pron-result">';
  html+='<div class="pron-heard">🎙️ Escuchado: <em>'+heard+'</em></div>';
  html+='<div class="pron-words">';

  targetWords.forEach(tw=>{
    const tn=normWord(tw);
    // Find best match in heard words
    let bestDist=999, bestWord='';
    heardWords.forEach(hw=>{ const d=levenshtein(tn,normWord(hw)); if(d<bestDist){ bestDist=d; bestWord=hw; } });
    const maxDist=Math.max(1,Math.floor(tn.length*0.35));
    const ok=bestDist<=maxDist;
    if(ok) correct++;
    html+='<span class="pw '+(ok?'pw-ok':'pw-err')+'">'+tw+'</span> ';
  });

  html+='</div>';

  // Score
  const pct=Math.round(correct/targetWords.length*100);
  let emoji, msg, color;
  if(pct===100){      emoji='🌟'; msg='¡Perfecto! Pronunciación excelente.';    color='var(--mint-d)'; }
  else if(pct>=80){   emoji='✅'; msg='¡Muy bien! Casi perfecto.';               color='var(--mint-d)'; }
  else if(pct>=60){   emoji='👍'; msg='Bien, pero practica las palabras en rojo.';color='var(--b1c)'; }
  else if(pct>=40){   emoji='💪'; msg='Sigue intentándolo. ¡Tú puedes!';          color='var(--orange)'; }
  else{               emoji='🔄'; msg='Escucha el original e inténtalo de nuevo.'; color='var(--coral)'; }

  html+='<div class="pron-score" style="color:'+color+'">'+emoji+' '+pct+'% — '+msg+'</div>';
  html+='</div>';

  statusEl.innerHTML=html;

  // XP based on score
  const xpEarned=pct>=80?10:pct>=60?5:2;
  addXP(xpEarned,'pronunciación');
  if(pct>=60){ increaseCombo(); completeGoal(2); }
  spPracticedToday++; spTotalSession++; updateSpeakStats();

  // Badge check
  if(pct===100) earnBadge('perfect5');
}

// ── SPEAK CARDS ──────────────────────────────────────────────
function buildSpeakCards(){
  const c=document.getElementById('speakCards'); c.innerHTML='';
  const phrases=speakLevelFilter==='all'?SPEAKING:SPEAKING.filter(p=>p.level===speakLevelFilter);

  let lastLevel='';
  phrases.forEach((p,i)=>{
    const realIdx=SPEAKING.indexOf(p);
    if(p.level!==lastLevel&&speakLevelFilter==='all'){
      lastLevel=p.level;
      const hdr=document.createElement('div'); hdr.className='speak-level-header';
      const colors={A1:'var(--a1c)',A2:'var(--a2c)',B1:'var(--b1c)'};
      const bgs={A1:'var(--mint-light)',A2:'var(--sky-light)',B1:'var(--sun-light)'};
      hdr.innerHTML='<span style="background:'+bgs[p.level]+';color:'+colors[p.level]+';padding:3px 10px;border-radius:8px;font-weight:800;font-size:0.75rem;">'+p.level+'</span>';
      c.appendChild(hdr);
    }

    const el=document.createElement('div'); el.className='speak-card';

    if(speakMode==='shadow'){
      shadowStep[realIdx]=shadowStep[realIdx]||'ready';
      el.innerHTML=buildShadowCard(p,realIdx);
    } else {
      // PRACTICAR mode — with speech recognition
      const audioId=p.audioId||'';
      const de_escaped=p.de.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
      el.innerHTML=
        '<div class="speak-card-top">'+
          '<div class="speak-de">'+p.de+'</div>'+
          '<button class="speak-play-btn" onclick="speakGerman(\''+de_escaped+'\',\''+audioId+'\')" title="Escuchar">🔊</button>'+
        '</div>'+
        '<div class="speak-es">'+p.es+'</div>'+
        '<div class="speak-tip">💡 '+p.tip+'</div>'+
        '<div class="pron-actions">'+
          '<button class="pron-listen-btn" onclick="speakGerman(\''+de_escaped+'\',\''+audioId+'\')">🔊 Escuchar primero</button>'+
          '<button class="pron-rec-btn" id="recbtn'+realIdx+'" onclick="startPronRec('+realIdx+',\''+de_escaped+'\',\''+audioId+'\')">'+
            (srSupported?'🎤 Grabar y analizar':'🎤 Practicar')+
          '</button>'+
        '</div>'+
        '<div class="pron-status" id="pronst'+realIdx+'">'+
          (srSupported?'Escucha el audio y luego graba tu pronunciación':'Toca para practicar esta frase')+
        '</div>';
    }
    c.appendChild(el);
  });
}

function startPronRec(idx, targetText, audioId){
  const btn=document.getElementById('recbtn'+idx);
  const st=document.getElementById('pronst'+idx);

  // If already recording, stop
  if(btn&&btn.classList.contains('rec')){
    if(activeRecognition){ try{ activeRecognition.stop(); }catch(e){} }
    return;
  }

  if(srSupported){
    startRecognition(targetText, audioId, btn, st, null);
  } else {
    // Fallback: just timer
    if(btn){ btn.textContent='⏹ Detener'; btn.classList.add('rec'); }
    if(st) st.textContent='🔴 Grabando… ¡Habla ahora!';
    const t=setTimeout(()=>{
      if(btn){ btn.textContent='🎤 Practicar'; btn.classList.remove('rec'); }
      if(st) st.textContent='✓ ¡Grabado! Escúchate y repite.';
      addXP(5,'pronunciación'); completeGoal(2);
      spPracticedToday++; spTotalSession++; updateSpeakStats();
    },4000);
    if(btn) btn._fallbackTimer=t;
  }
}

function toggleMic(i){
  // Legacy fallback for daily card
  const mic=document.getElementById('mic'+i),st=document.getElementById('mics'+i);
  if(micTimers[i]){ clearTimeout(micTimers[i]); mic&&mic.classList.remove('rec'); if(st) st.textContent='✓ ¡Grabado!'; micTimers[i]=null; addXP(5,'pronunciación'); completeGoal(2); spPracticedToday++; spTotalSession++; updateSpeakStats(); }
  else{ mic&&mic.classList.add('rec'); if(st) st.textContent='🔴 Grabando…'; micTimers[i]=setTimeout(()=>{ mic&&mic.classList.remove('rec'); if(st) st.textContent='✓ ¡Grabado!'; micTimers[i]=null; addXP(5,'pronunciación'); completeGoal(2); spPracticedToday++; spTotalSession++; updateSpeakStats(); },4000); }
}

function updateSpeakStats(){
  const p=document.getElementById('sp-practiced'); if(p) p.textContent=spPracticedToday;
  const t=document.getElementById('sp-total');     if(t) t.textContent=spTotalSession;
}

// ── SHADOW MODE ───────────────────────────────────────────────
function buildShadowCard(p,i){
  const step=shadowStep[i]||'ready';
  // Store in lookup — avoids all quote-escaping issues in onclick
  shadowData[i]={text:p.de, audioId:p.audioId||null};
  return '<div class="shadow-card">'+
    '<div class="speak-de">'+p.de+'</div>'+
    '<div class="speak-es">'+p.es+'</div>'+
    '<div class="shadow-steps">'+
      '<div class="shadow-step'+(step==='ready'||step==='listen'?' active':step==='speak'||step==='done'?' done':'')+'" id="ss1_'+i+'">'+
        '<span class="ss-num">1</span><span>Escuchar</span>'+
        '<button class="ss-btn" onclick="shadowListen('+i+')">▶ Oír</button>'+
      '</div>'+
      '<div class="shadow-step'+(step==='speak'?' active':step==='done'?' done':'')+'" id="ss2_'+i+'">'+
        '<span class="ss-num">2</span><span>Repetir</span>'+
        '<button class="ss-btn" id="ssmicbtn'+i+'" onclick="shadowSpeak('+i+')">🎤 Hablar</button>'+
      '</div>'+
      '<div class="shadow-step'+(step==='done'?' active':'')+'" id="ss3_'+i+'">'+
        '<span class="ss-num">3</span><span>Comparar</span>'+
        '<button class="ss-btn" onclick="shadowCompare('+i+')">▶ Original</button>'+
      '</div>'+
    '</div>'+
    '<div class="pron-status" id="shadowst'+i+'">Empieza escuchando el audio</div>'+
    '<button class="shadow-next-btn" id="shadownext'+i+'" style="display:none;" onclick="shadowNext('+i+')">Siguiente frase → </button>'+
    '</div>';
}

function shadowListen(i){
  const d=shadowData[i]||{}; 
  shadowStep[i]='listen'; 
  speakGerman(d.text||'', d.audioId||null);
  const st=document.getElementById('shadowst'+i);
  if(st) st.textContent='Escuchando… luego haz clic en 🎤 Hablar';
  // Estimate duration: ~600ms per word + 1s buffer
  const words=(d.text||'').split(' ').length;
  const delay=Math.max(2500, words*600+1000);
  setTimeout(()=>{
    shadowStep[i]='speak';
    const s2=document.getElementById('ss2_'+i); if(s2) s2.classList.add('active');
    if(st) st.textContent='✓ Oído. Ahora repítelo tú en voz alta.';
  }, delay);
}

function shadowSpeak(i){
  const d=shadowData[i]||{};
  const btn=document.getElementById('ssmicbtn'+i);
  const st=document.getElementById('shadowst'+i);
  if(!btn) return;
  if(btn._recording){
    clearTimeout(btn._timer); btn._recording=false;
    if(activeRecognition){ try{ activeRecognition.stop(); }catch(e){} }
  } else {
    if(srSupported && d.text){
      startRecognition(d.text, null, btn, st, ()=>{
        shadowStep[i]='done';
        const s3=document.getElementById('ss3_'+i); if(s3) s3.classList.add('active');
        addXP(8,'shadowing'); completeGoal(2);
        spPracticedToday++; spTotalSession++; updateSpeakStats();
      });
    } else {
      btn._recording=true; btn.textContent='⏹ Detener';
      if(st) st.textContent='🔴 Grabando… ¡Habla ahora!';
      btn._timer=setTimeout(()=>{
        btn._recording=false; btn.textContent='🎤 Repetir';
        shadowStep[i]='done';
        if(st) st.textContent='✓ ¡Grabado! Compara con el original.';
        const s3=document.getElementById('ss3_'+i); if(s3) s3.classList.add('active');
        addXP(8,'shadowing'); completeGoal(2);
        spPracticedToday++; spTotalSession++; updateSpeakStats();
      },4000);
    }
  }
}

function shadowCompare(i){
  const d=shadowData[i]||{};
  speakGerman(d.text||'', d.audioId||null);
  const st=document.getElementById('shadowst'+i);
  if(st) st.textContent='🔊 Escucha y compara. ¿Cómo sonaste?';
  // Show next button
  const nb=document.getElementById('shadownext'+i);
  if(nb) nb.style.display='block';
}

function shadowNext(i){
  // Scroll to next shadow card
  const cards=document.querySelectorAll('.speak-card');
  let found=false;
  cards.forEach(c=>{
    if(found && !c.classList.contains('speak-level-header')){
      c.scrollIntoView({behavior:'smooth',block:'center'}); found=false;
    }
    if(c.querySelector('#shadownext'+i)) found=true;
  });
  // Reset this card for reuse
  shadowStep[i]='ready';
  const nb=document.getElementById('shadownext'+i);
  if(nb) nb.style.display='none';
}

// ── PHONETICS ────────────────────────────────────────────────
function buildPhonetics(){
  const ph=document.getElementById('phonList'); if(!ph) return; ph.innerHTML='';
  // Store phonetics data globally to avoid inline onclick escaping issues
  PHONETICS.forEach((p,pi)=>{
    phonData[pi]=p;
    const el=document.createElement('div'); el.className='ph-row';
    el.innerHTML=
      '<div class="ph-badge">'+p.s+'</div>'+
      '<div style="flex:1"><div class="ph-ex">'+p.ex+'</div><div class="ph-tip">'+p.tip+'</div></div>'+
      '<button class="ph-play" onclick="playPhonetic('+pi+')" title="Escuchar ejemplo">🔊</button>';
    ph.appendChild(el);
  });
}

const phonData={};
function playPhonetic(pi){
  const p=phonData[pi]; if(!p) return;
  // Use Murf audio if available
  if(p.audioId){
    speakGerman('', p.audioId);
    return;
  }
  // Fallback: TTS — speak each example word with a pause between them
  const words = p.ex.split(',').map(w=>w.trim()).filter(Boolean);
  let idx=0;
  function speakNext(){
    if(idx>=words.length) return;
    speakGerman(words[idx], null);
    idx++;
    if(idx<words.length) setTimeout(speakNext, 1400);
  }
  speakNext();
}

function speakGerman(text,audioId){
  if(audioId&&audioId!==''){ const a=new Audio('/audio/'+audioId+'.mp3'); a.play().catch(()=>{}); return; }
  if(!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text); u.lang='de-DE'; u.rate=0.82;
  function go(){ const v=window.speechSynthesis.getVoices().find(v=>v.lang==='de-DE')||window.speechSynthesis.getVoices().find(v=>v.lang.startsWith('de')); if(v) u.voice=v; window.speechSynthesis.speak(u); }
  if(window.speechSynthesis.getVoices().length>0) go(); else window.speechSynthesis.onvoiceschanged=go;
}


// ══════════════════════════════════════════════════════════════
//  EXAMEN
// ══════════════════════════════════════════════════════════════
let examLvl=null,examQs=[],examIdx=0,examCorrect=0,examAnswered=false;

function startExam(){
  examLvl=S.lvl;
  const data=EXAMEN[examLvl]; if(!data) return;
  examQs=[...data.questions]; shuffle(examQs);
  examIdx=0; examCorrect=0; examAnswered=false;
  document.getElementById('examTitle').textContent=data.title;
  document.getElementById('examSubtitle').textContent='10 preguntas · mínimo '+data.passing+'% para aprobar';
  const eb=document.getElementById('examBtn'); if(eb) eb.style.display='none';
  nav('exam',null); renderExamQ();
}

function renderExamQ(){
  const q=examQs[examIdx],tot=examQs.length;
  document.getElementById('examCounter').textContent=(examIdx+1)+' / '+tot;
  document.getElementById('examProgFill').style.width=((examIdx+1)/tot*100)+'%';
  document.getElementById('examQ').innerHTML=q.q.replace('___','<span class="q-blank">___</span>');
  document.getElementById('examExpl').className='gram-expl'; document.getElementById('examExpl').textContent='';
  document.getElementById('examNext').style.display='none'; examAnswered=false;
  const og=document.getElementById('examOpts'); og.innerHTML='';
  q.opts.forEach((o,oi)=>{ const b=document.createElement('button'); b.className='opt-btn'; b.textContent=o; b.onclick=()=>checkExamOpt(oi,q.ans,q.exp,b); og.appendChild(b); });
}

function checkExamOpt(chosen,correct,exp,btn){
  if(examAnswered) return; examAnswered=true;
  const ok=chosen===correct;
  if(ok){ btn.classList.add('correct'); examCorrect++; document.getElementById('examExpl').textContent='✓ '+exp; document.getElementById('examExpl').className='gram-expl ok'; }
  else{ btn.classList.add('wrong'); document.getElementById('examExpl').textContent='✗ Correcta: "'+examQs[examIdx].opts[correct]+'". '+exp; document.getElementById('examExpl').className='gram-expl err'; document.querySelectorAll('#examOpts .opt-btn').forEach((b,i)=>{ if(i===correct) b.classList.add('correct'); }); }
  const nb=document.getElementById('examNext'); nb.style.display='block'; nb.textContent=examIdx<examQs.length-1?'Siguiente →':'Ver resultado';
}

function nextExamQ(){ examIdx++; if(examIdx>=examQs.length) finishExam(); else{ examAnswered=false; renderExamQ(); } }

function finishExam(){
  const data=EXAMEN[examLvl];
  const score=Math.round(examCorrect/examQs.length*100);
  const passed=score>=data.passing;
  S.exams[examLvl]={passed,score,date:new Date().toLocaleDateString()};
  if(passed){
    confetti(); addXP(100,'examen'); earnBadge('exam_'+examLvl);
    const idx=LEVELS.findIndex(l=>l.id===examLvl),nextLvl=LEVELS[idx+1];
    if(nextLvl&&!S.unlocked.includes(nextLvl.id)){ S.unlocked.push(nextLvl.id); S.lvl=nextLvl.id; }
    saveState(); nav('home',document.querySelector('.nav-btn')); renderHome();
    // Show certificate popup instead of plain modal
    setTimeout(()=>showCertificate(examLvl), 600);
  } else {
    saveState(); nav('home',document.querySelector('.nav-btn')); renderHome();
    showModal('📚','Examen '+examLvl.toUpperCase()+' — '+score+'%','Necesitas '+data.passing+'% para aprobar. ¡Practica un poco más y vuelve! Tú puedes 💪');
  }
}

function exitExam(){ nav('home',document.querySelector('.nav-btn')); checkLevelReadyForExam(); }

// ══════════════════════════════════════════════════════════════
//  MODAL / TOAST / CONFETTI / UTILS
// ══════════════════════════════════════════════════════════════
function showModal(emoji,title,text){
  document.getElementById('mEmoji').textContent=emoji;
  document.getElementById('mTitle').textContent=title;
  document.getElementById('mText').textContent=text;
  document.getElementById('modal').classList.add('show');
}
function closeModal(){ document.getElementById('modal').classList.remove('show'); }

// ── CERTIFICATE ───────────────────────────────────────────────
function showCertificate(levelId){
  const lv = LEVELS.find(l=>l.id===levelId);
  const exam = S.exams[levelId];
  if(!lv || !exam) return;

  const colors = {
    a1: { bg:'#E8F8F0', border:'#6BCB77', dark:'#27AE60', medal:'🥉' },
    a2: { bg:'#E8F3FF', border:'#4D96FF', dark:'#2980B9', medal:'🥈' },
    b1: { bg:'#FFFBE8', border:'#FFD93D', dark:'#E67E22', medal:'🥇' },
    b2: { bg:'#F5EEFF', border:'#9B72CF', dark:'#8E44AD', medal:'🏆' },
  };
  const c = colors[levelId] || colors.a1;
  const date = exam.date || new Date().toLocaleDateString('es-ES');
  const score = exam.score;

  // Stars based on score
  const stars = score===100?'★★★★★':score>=90?'★★★★☆':score>=80?'★★★☆☆':'★★☆☆☆';

  document.getElementById('certInner').innerHTML = `
    <div class="cert-card" style="background:${c.bg};border-color:${c.border};">

      <!-- Header -->
      <div class="cert-header" style="background:${c.border};">
        <div class="cert-flag">🇩🇪</div>
        <div class="cert-header-text">
          <div class="cert-title-top">ZERTIFIKAT DEUTSCH</div>
          <div class="cert-title-sub">Certificado de Alemán</div>
        </div>
        <div class="cert-medal">${c.medal}</div>
      </div>

      <!-- Body -->
      <div class="cert-body">
        <div class="cert-recipient">¡Enhorabuena, chiquitina!</div>
        <div class="cert-text">Ha superado con éxito el examen oficial de nivel</div>

        <div class="cert-level-badge" style="background:${c.dark};">
          ${lv.label} — ${lv.name}
        </div>

        <div class="cert-desc">${lv.desc}</div>

        <!-- Score -->
        <div class="cert-score-row">
          <div class="cert-score-box" style="border-color:${c.border};">
            <div class="cert-score-num" style="color:${c.dark};">${score}%</div>
            <div class="cert-score-lbl">Puntuación</div>
          </div>
          <div class="cert-score-box" style="border-color:${c.border};">
            <div class="cert-score-num" style="color:${c.dark};font-size:1.2rem;">${stars}</div>
            <div class="cert-score-lbl">Valoración</div>
          </div>
          <div class="cert-score-box" style="border-color:${c.border};">
            <div class="cert-score-num" style="color:${c.dark};font-size:0.9rem;">${date}</div>
            <div class="cert-score-lbl">Fecha</div>
          </div>
        </div>

        <!-- Signature area -->
        <div class="cert-sig-row">
          <div class="cert-sig">
            <div class="cert-sig-line" style="border-color:${c.dark};"></div>
            <div class="cert-sig-lbl">Deutsch Lernen App</div>
          </div>
          <div class="cert-seal" style="border-color:${c.border};color:${c.dark};">
            <div class="cert-seal-inner">
              <div>✓</div>
              <div style="font-size:0.45rem;font-weight:800;margin-top:2px;">${lv.label}</div>
              <div style="font-size:0.4rem;">APROBADO</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('certOverlay').classList.add('show');
  confetti();
}

function closeCert(){
  document.getElementById('certOverlay').classList.remove('show');
}

function confirmReset(){
  // Use a custom confirm inside the modal
  document.getElementById('mEmoji').textContent='🗑️';
  document.getElementById('mTitle').textContent='¿Reiniciar progreso?';
  document.getElementById('mText').textContent='Se borrarán todos tus XP, racha, badges y progreso. No se puede deshacer.';
  const modal=document.getElementById('modal');
  // Replace CTA button temporarily
  const cta=modal.querySelector('.modal-cta');
  const orig=cta.outerHTML;
  cta.outerHTML='<div style="display:flex;gap:10px;margin-top:8px;">'+
    '<button class="modal-cta" style="background:var(--faint);color:var(--muted);" onclick="closeModal()">Cancelar</button>'+
    '<button class="modal-cta" style="background:var(--coral);" onclick="doReset()">Sí, reiniciar</button>'+
    '</div>';
  modal.classList.add('show');
}

function doReset(){
  try{ localStorage.removeItem('dl5'); }catch(e){}
  closeModal();
  // Small delay so user sees the modal close
  setTimeout(()=>{ window.location.reload(); }, 300);
}

function showToast(msg){
  const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show');
  clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('show'),2000);
}

function confetti(){
  const cv=document.getElementById('confetti'); cv.width=window.innerWidth; cv.height=window.innerHeight;
  const ctx=cv.getContext('2d'),colors=['#FF6B35','#FFD93D','#6BCB77','#4D96FF','#9B72CF','#FF9F4A'];
  const parts=Array.from({length:100},()=>({x:Math.random()*cv.width,y:-10,r:Math.random()*7+3,c:colors[Math.floor(Math.random()*colors.length)],vx:(Math.random()-.5)*5,vy:Math.random()*4+2,rot:Math.random()*360,vr:(Math.random()-.5)*10}));
  let frame=0;
  (function draw(){
    ctx.clearRect(0,0,cv.width,cv.height);
    parts.forEach(p=>{ ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot*Math.PI/180); ctx.fillStyle=p.c; ctx.fillRect(-p.r,-p.r/2,p.r*2,p.r); ctx.restore(); p.x+=p.vx; p.y+=p.vy; p.rot+=p.vr; p.vy+=.06; });
    if(++frame<130) requestAnimationFrame(draw); else ctx.clearRect(0,0,cv.width,cv.height);
  })();
}

function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } }
