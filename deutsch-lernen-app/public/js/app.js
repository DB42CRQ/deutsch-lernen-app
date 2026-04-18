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
}

function renderPhrase(){
  const p=PHRASES[new Date().getDate()%PHRASES.length];
  const de=document.getElementById('phraseDE'); const es=document.getElementById('phraseES');
  if(de) de.textContent=p.de; if(es) es.textContent=p.es;
}

function updateStats(){
  const w=document.getElementById('statWords'); const g=document.getElementById('statGram');
  const d=document.getElementById('statDays');  const f=document.getElementById('freezeChip');
  if(w) w.textContent=S.vOk; if(g) g.textContent=S.gCorr;
  if(d) d.textContent=S.streak;
  if(f) f.style.display=S.streakFreeze>0?'flex':'none';
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
    el.className='lp-row '+lv.c+(isCur?' current':'')+(locked?' locked':'');
    el.onclick=()=>{
      if(locked) showModal('🔒','Bloqueado','Completa el examen del nivel anterior para desbloquearlo.');
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
let vRepeat={};

function getVocabSource(){
  let src = vLevel==='a1'?VOCAB : vLevel==='a2'?VOCAB_A2 : VOCAB_B1;
  return vCat==='all' ? Object.values(src).flat() : (src[vCat]||[]);
}

function buildVQueue(){
  const base=getVocabSource(); vQueue=[];
  base.forEach(w=>{ const r=vRepeat[w.de]||0; for(let i=0;i<(r>0?3:1);i++) vQueue.push(w); });
  shuffle(vQueue); vIdx=0;
}

function loadVocab(){ buildVQueue(); showVCard(); updateVocabScores(); }

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
    a1:{all:'🌟 Todo',saludos:'👋 Saludos',numeros:'🔢 Números',familia:'👪 Familia',comida:'🍎 Comida',tiempo:'⏰ Tiempo',verbos:'⚡ Verbos',adjektivos:'🎨 Adjetivos',colores:'🌈 Colores',casa:'🏠 Casa',kleidung:'👗 Ropa',schule:'🏫 Escuela',tiere:'🐾 Animales',natur:'🌿 Naturaleza'},
    a2:{all:'🌟 Todo',ciudad:'🏙️ Ciudad',reisen:'✈️ Viajes',einkaufen:'🛍️ Compras',cuerpo:'🫀 Cuerpo',pasado:'⏳ Pasado',salud:'🏥 Salud',wetter:'🌤️ Tiempo',freizeit:'🎯 Ocio',wohnen:'🏠 Vivienda',kommunikation:'💬 Comunicación'},
    b1:{all:'🌟 Todo',trabajo:'💼 Trabajo',opiniones:'💬 Opiniones',medios:'📺 Medios',gesellschaft:'🌍 Sociedad',kultur:'🎭 Cultura',bildung:'📚 Educación',wissenschaft:'🔬 Ciencia',wirtschaft:'📈 Economía',gesundheit:'💊 Salud'},
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

function markV(ok){
  const w=vQueue[vIdx%vQueue.length]; S.vTot++;
  if(ok){ S.vOk++; vRepeat[w.de]=Math.max(0,(vRepeat[w.de]||0)-1); increaseCombo(); addXP(5,'vocabulario'); completeGoal(0); }
  else  { S.vNo++; vRepeat[w.de]=(vRepeat[w.de]||0)+1; resetCombo(); }
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
  S.vTot++; if(ok){ S.vOk++; vRepeat[word.de]=Math.max(0,(vRepeat[word.de]||0)-1); increaseCombo(); addXP(5,'vocabulario'); completeGoal(0); }
  else{ S.vNo++; vRepeat[word.de]=(vRepeat[word.de]||0)+1; resetCombo(); }
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
  S.vTot++; if(ok){ S.vOk++; vRepeat[w.de]=Math.max(0,(vRepeat[w.de]||0)-1); increaseCombo(); addXP(8,'vocabulario'); completeGoal(0); if(vDir==='de') speakGerman(w.de,w.audioId); }
  else{ S.vNo++; vRepeat[w.de]=(vRepeat[w.de]||0)+1; resetCombo(); }
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
    el.innerHTML=
      '<span class="tc-icon">'+t.icon+(done?' ✅':'')+'</span>'+
      '<div class="tc-name">'+t.title+'</div>'+
      '<div class="tc-sub">'+t.sub+'</div>'+
      '<span class="tc-pill '+t.pill.toLowerCase()+'">'+t.pill+'</span>'+
      (prog.total>0?'<div class="tc-progress"><div class="tc-prog-fill" style="width:'+pct+'%"></div></div><div class="tc-pct">'+pct+'%</div>':'');
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
    b.onclick=()=>checkGramOpt(o,ex.ans,ex.exp,b); og.appendChild(b);
  });
  document.getElementById('gExpl').className='gram-expl'; document.getElementById('gExpl').textContent='';
  document.getElementById('gNext').style.display='none'; gAnswered=false;
}

function checkGramOpt(chosen,correct,exp,btn){
  if(gAnswered) return; gAnswered=true;
  const ok=chosen.toLowerCase()===correct.toLowerCase();
  if(!S.gramProgress[gTopic]) S.gramProgress[gTopic]={correct:0,total:0};
  S.gramProgress[gTopic].total++;
  if(ok){
    btn.classList.add('correct');
    document.getElementById('gExpl').textContent='✓ '+exp;
    document.getElementById('gExpl').className='gram-expl ok';
    S.gCorr++; gCorrect++;
    S.gramProgress[gTopic].correct++;
    document.getElementById('gramScoreBadge').textContent='✓ '+gCorrect;
    increaseCombo(); addXP(10,'gramática'); completeGoal(1); updateStats();
    if(S.gCorr>=10) earnBadge('gram10');
  } else {
    btn.classList.add('wrong');
    document.getElementById('gExpl').textContent='✗ Correcta: "'+correct+'". '+exp.replace('✓ ','');
    document.getElementById('gExpl').className='gram-expl err';
    resetCombo();
    document.querySelectorAll('.opt-btn').forEach(b=>{if(b.textContent.toLowerCase()===correct.toLowerCase()) b.classList.add('correct');});
  }
  document.getElementById('gNext').style.display='block';
  // Check if topic completed
  const prog=S.gramProgress[gTopic];
  const pct=prog.total>0?Math.round(prog.correct/prog.total*100):0;
  if(gIdx===(GRAMMAR[gTopic]._shuffled||GRAMMAR[gTopic].exs).length-1){
    // Last question — show result
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
    btn.textContent='▶'; time.textContent='⚠️ Sin audio (genera MP3 primero)';
    currentAudio=null; currentAudioBtn=null;
  });
  audio.playbackRate=getSpeed(i);
  audio.play().catch(()=>{ btn.textContent='▶'; time.textContent='⚠️ Sin audio'; });
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
}



// ══════════════════════════════════════════════════════════════
//  SPEAKING — Practicar con reconocimiento de voz
// ══════════════════════════════════════════════════════════════
const micTimers={};
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
  const idx=new Date().getDate()%SPEAKING.length;
  const p=SPEAKING[idx];
  const de=document.getElementById('dailySpeakDE');
  const es=document.getElementById('dailySpeakES');
  if(de) de.textContent=p.de;
  if(es) es.textContent=p.es;
}

function playSentenceOfDay(){
  const idx=new Date().getDate()%SPEAKING.length;
  const p=SPEAKING[idx];
  speakGerman(p.de,p.audioId||null);
  const st=document.getElementById('dailyStatus');
  if(st){ st.textContent='▶ Escuchando…'; setTimeout(()=>{ st.textContent='✓ Ahora repítelo en voz alta'; },1800); }
}

let dailyMicTimer=null;
function toggleDailyMic(){
  const lbl=document.getElementById('dailyMicLabel');
  const st=document.getElementById('dailyStatus');
  const idx=new Date().getDate()%SPEAKING.length;
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
  const audioId=p.audioId||'';
  const de_escaped=p.de.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  return '<div class="shadow-card">'+
    '<div class="speak-de">'+p.de+'</div>'+
    '<div class="speak-es">'+p.es+'</div>'+
    '<div class="shadow-steps">'+
      '<div class="shadow-step'+(step==='ready'||step==='listen'?' active':step==='speak'||step==='done'?' done':'')+'\" id="ss1_'+i+'">'+
        '<span class="ss-num">1</span><span>Escuchar</span>'+
        '<button class="ss-btn" onclick="shadowListen('+i+',\''+de_escaped+'\',\''+audioId+'\')">▶ Oír</button>'+
      '</div>'+
      '<div class="shadow-step'+(step==='speak'?' active':step==='done'?' done':'')+'\" id="ss2_'+i+'">'+
        '<span class="ss-num">2</span><span>Repetir</span>'+
        '<button class="ss-btn" id="ssmicbtn'+i+'" onclick="shadowSpeak('+i+',\''+de_escaped+'\')">🎤 Hablar</button>'+
      '</div>'+
      '<div class="shadow-step'+(step==='done'?' active':'')+'\" id="ss3_'+i+'">'+
        '<span class="ss-num">3</span><span>Comparar</span>'+
        '<button class="ss-btn" onclick="shadowCompare('+i+',\''+de_escaped+'\',\''+audioId+'\')">▶ Original</button>'+
      '</div>'+
    '</div>'+
    '<div class="pron-status" id="shadowst'+i+'">Empieza escuchando el audio</div>'+
    '</div>';
}

function shadowListen(i,text,audioId){
  shadowStep[i]='listen'; speakGerman(text,audioId||null);
  const st=document.getElementById('shadowst'+i);
  if(st) st.textContent='Escuchando… luego haz clic en Hablar';
  setTimeout(()=>{ shadowStep[i]='speak'; const s2=document.getElementById('ss2_'+i); if(s2) s2.classList.add('active'); if(st) st.textContent='✓ Oído. Ahora repítelo tú.'; },2000);
}

function shadowSpeak(i, targetText){
  const btn=document.getElementById('ssmicbtn'+i);
  const st=document.getElementById('shadowst'+i);
  if(!btn) return;
  if(btn._recording){
    clearTimeout(btn._timer); btn._recording=false;
    if(activeRecognition){ try{ activeRecognition.stop(); }catch(e){} }
  } else {
    if(srSupported && targetText){
      startRecognition(targetText, null, btn, st, ()=>{
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

function shadowCompare(i,text,audioId){
  speakGerman(text,audioId||null);
  const st=document.getElementById('shadowst'+i);
  if(st) st.textContent='🔊 Comparando con el original…';
}

// ── PHONETICS ────────────────────────────────────────────────
function buildPhonetics(){
  const ph=document.getElementById('phonList'); if(!ph) return; ph.innerHTML='';
  PHONETICS.forEach(p=>{
    const el=document.createElement('div'); el.className='ph-row';
    const tts_escaped=p.tts.replace(/'/g,"\\'");
    el.innerHTML=
      '<div class="ph-badge">'+p.s+'</div>'+
      '<div style="flex:1"><div class="ph-ex">'+p.ex+'</div><div class="ph-tip">'+p.tip+'</div></div>'+
      '<button class="ph-play" onclick="speakGerman(\''+tts_escaped+'\',null)" title="Escuchar">🔊</button>';
    ph.appendChild(el);
  });
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
    showModal('🎓','¡Examen '+examLvl.toUpperCase()+' aprobado!','Puntuación: '+score+'%. ¡Felicidades, chiquitina! '+(nextLvl?'Nivel '+nextLvl.label+' desbloqueado 🎉':'¡Has completado todos los niveles!'));
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
