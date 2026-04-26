// app.js — Lógica principal do app

// ============================================
// Inicialização Supabase
// ============================================

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;

// ============================================
// Dados estáticos
// ============================================

const BLOCKS = [
  { id: 'academia', icon: '💪', name: 'Academia',           xp: 10 },
  { id: 'camm',     icon: '🚶', name: 'Caminhada manhã',    xp: 5  },
  { id: 'camt',     icon: '🏃', name: 'Caminhada tarde',    xp: 8  },
  { id: 'sesta',    icon: '😴', name: 'Sesta (máx 30 min)', xp: 3  },
  { id: 'agua',     icon: '💧', name: 'Meta água 2,5L',     xp: 5  },
];

const MEALS = [
  {
    id: 'cafe', name: 'Café da manhã', time: '08h',
    kcal: 600, p: 55, c: 55, f: 15,
    desc: '2 ovos · tapioca 30g · mussarela · leite c/ whey 15g + aveia 15g · fruta'
  },
  {
    id: 'almoco', name: 'Almoço', time: '11-12h',
    kcal: 650, p: 50, c: 70, f: 12,
    desc: 'Arroz 70g cru · feijão 70g · frango 180g · salada livre'
  },
  {
    id: 'tarde', name: 'Café da tarde', time: '14-15h',
    kcal: 620, p: 40, c: 85, f: 15,
    desc: '2 bananas · aveia 35g · 2 ovos · cacau 5g · doce de leite · leite c/ whey 25g'
  },
  {
    id: 'janta', name: 'Jantar', time: '20h',
    kcal: 470, p: 45, c: 55, f: 10,
    desc: 'Arroz 80g cru · frango 180g · salada livre'
  },
  {
    id: 'ceia', name: 'Ceia', time: '22h',
    kcal: 210, p: 29, c: 15, f: 4,
    desc: 'Leite desnatado 200ml · whey 25g'
  },
];

const MACRO_GOALS = { p: 220, c: 272, f: 62, kcal: 2530 };

const WORKOUTS = {
  0: { name: 'Domingo — Descanso', exercises: [] },
  1: {
    name: 'Segunda — Peito + Tríceps',
    exercises: [
      '4x Supino horizontal',
      '3x Crucifixo inclinado máquina',
      '3x Voador crucifixo',
      '3x Paralela peito (Dips)',
      '3x Tríceps polia corda',
      '3x Extensão tríceps haltere',
      '2x Tríceps francês barra EZ',
    ]
  },
  2: {
    name: 'Terça — Pernas posteriores',
    exercises: [
      '4x Terra sumo (fazer primeiro)',
      '3x Stiff barra',
      '3x Cadeira flexora',
      '3x Flexão pernas em pé',
      '3x Elevação pélvica máquina',
      '3x Cadeira abdutora',
      '4x Panturrilha sentado',
    ]
  },
  3: {
    name: 'Quarta — Costas + Bíceps',
    exercises: [
      '4x Puxada alta máquina',
      '3x Remada isolateral',
      '3x Remo sentado pegada V',
      '3x Puxada triângulo',
      '2x Pulldown corda',
      '3x Rosca Scott barra EZ',
      '3x Rosca inclinada polia',
      '2x Rosca martelo',
    ]
  },
  4: {
    name: 'Quinta — Ombros',
    exercises: [
      '4x Desenvolvimento máquina',
      '3x Arnold haltere',
      '3x Elevação lateral máquina',
      '3x Elevação lateral polia',
      '3x Voador invertido máquina',
      '3x Face Pull polia',
      '3x Encolhimento barra',
    ]
  },
  5: {
    name: 'Sexta — Pernas quadríceps',
    exercises: [
      '5x Agachamento Smith',
      '3x Leg press 45°',
      '3x Leg press unilateral',
      '3x Cadeira extensora',
      '3x Avanço haltere',
      '4x Panturrilha sentado',
    ]
  },
  6: {
    name: 'Sábado — Fullbody leve + Abdômen',
    exercises: [
      '3x Agachamento goblet',
      '3x Supino máquina leve',
      '3x Puxada triângulo',
      '3x Desenvolvimento haltere',
      '3x Prancha 30-60s',
      '3x Crunch abdominal',
      '3x Elevação de pernas',
    ]
  },
};

const LEVELS = [
  { min: 0,   max: 99,  name: 'Iniciante' },
  { min: 100, max: 199, name: 'Comprometido' },
  { min: 200, max: 399, name: 'Consistente' },
  { min: 400, max: 699, name: 'Guerreiro' },
  { min: 700, max: Infinity, name: 'Máquina' },
];

// ============================================
// Estado do app
// ============================================

const state = {
  today: getTodayStr(),
  dailyDone: {},
  mealDone: {},
  exDone: {},
  waterCups: 0,
  totalXp: 0,
  weightHistory: [],
  weekData: {},
  tab: 'hoje',
};

// ============================================
// Indicador de salvamento
// ============================================

let saveTimer = null;

function setSaveStatus(status, detail = '') {
  // status: 'saving' | 'saved' | 'error'
  const el = document.getElementById('save-status');
  if (!el) return;
  clearTimeout(saveTimer);
  el.className = 'save-status ' + status;
  if (status === 'saving') {
    el.textContent = '⏳ salvando...';
  } else if (status === 'saved') {
    el.textContent = '✓ salvo';
    saveTimer = setTimeout(() => { el.textContent = ''; el.className = 'save-status'; }, 2000);
  } else {
    // Mostra o erro real para diagnóstico
    el.textContent = '⚠ ' + (detail || 'erro ao salvar');
    console.error('[SAVE ERROR]', detail);
  }
}

// ============================================
// Utilitários de data
// ============================================

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatDatePT(dateStr) {
  const [y, m, d] = dateStr.split('-');
  const days   = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  const dt = new Date(y, m-1, d);
  return `${days[dt.getDay()]}, ${d} ${months[m-1]}`;
}

function getDateStr(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getDayOfWeek() {
  return new Date().getDay();
}

// ============================================
// XP e Níveis
// ============================================

function getLevel(xp) {
  return LEVELS.find(l => xp >= l.min && xp <= l.max) || LEVELS[0];
}

function getXpProgress(xp) {
  const lvl = getLevel(xp);
  if (lvl.max === Infinity) return 100;
  const range = lvl.max - lvl.min + 1;
  const prog  = xp - lvl.min;
  return Math.round((prog / range) * 100);
}

function updateXpUI() {
  const xp  = state.totalXp;
  const lvl = getLevel(xp);
  const pct = getXpProgress(xp);
  document.getElementById('level-badge').textContent = lvl.name;
  document.getElementById('xp-label').textContent    = `${xp} XP`;
  document.getElementById('xp-fill').style.width     = `${pct}%`;
}

function showXpToast(xp) {
  const t = document.getElementById('xp-toast');
  t.textContent = `+${xp} XP`;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

// ============================================
// Supabase — Leitura
// ============================================

async function loadAll() {
  const uid   = currentUser.id;
  const today = state.today;

  const [daily, meals, ex, xpRow, weights] = await Promise.all([
    sb.from('daily_logs').select('block_id,done,value').eq('user_id', uid).eq('date', today),
    sb.from('meal_logs').select('meal_id,done').eq('user_id', uid).eq('date', today),
    sb.from('exercise_logs').select('exercise_index,done').eq('user_id', uid).eq('date', today),
    sb.from('user_xp').select('total_xp').eq('user_id', uid).maybeSingle(),
    sb.from('weight_logs').select('date,weight').eq('user_id', uid).order('date', { ascending: false }).limit(7),
  ]);

  // Blocos do dia
  state.dailyDone = {};
  (daily.data || []).forEach(r => {
    state.dailyDone[r.block_id] = r.done;
    // Carrega copos de água do Supabase (campo value da linha 'agua')
    if (r.block_id === 'agua') {
      state.waterCups = r.value || 0;
    }
  });

  // Refeições
  state.mealDone = {};
  (meals.data || []).forEach(r => { state.mealDone[r.meal_id] = r.done; });

  // Exercícios
  state.exDone = {};
  (ex.data || []).forEach(r => { state.exDone[r.exercise_index] = r.done; });

  // XP
  state.totalXp = xpRow.data?.total_xp || 0;

  // Histórico de peso
  state.weightHistory = (weights.data || []).map(r => ({
    date: r.date,
    weight: parseFloat(r.weight),
  }));

  await loadWeekData();
}

async function loadWeekData() {
  const uid   = currentUser.id;
  const dates = Array.from({ length: 7 }, (_, i) => getDateStr(6 - i));

  const [daily, meals] = await Promise.all([
    sb.from('daily_logs').select('date,block_id,done').eq('user_id', uid).in('date', dates),
    sb.from('meal_logs').select('date,meal_id,done').eq('user_id', uid).in('date', dates),
  ]);

  state.weekData = {};
  dates.forEach(d => { state.weekData[d] = { score: 0, total: 10 }; });

  (daily.data || []).forEach(r => {
    if (r.done && state.weekData[r.date]) state.weekData[r.date].score++;
  });
  (meals.data || []).forEach(r => {
    if (r.done && state.weekData[r.date]) state.weekData[r.date].score++;
  });
}

// ============================================
// Supabase — Escrita com feedback visual
// ============================================

async function upsertDaily(blockId, done, value = null) {
  const uid     = currentUser.id;
  const payload = { user_id: uid, date: state.today, block_id: blockId, done };
  if (value !== null) payload.value = value;

  setSaveStatus('saving');
  const { error } = await sb.from('daily_logs').upsert(payload, { onConflict: 'user_id,date,block_id' });
  if (error) {
    const msg = error.message || error.details || JSON.stringify(error);
    setSaveStatus('error', msg);
    throw new Error(msg);
  }
  setSaveStatus('saved');
}

async function upsertMeal(mealId, done) {
  const uid = currentUser.id;
  setSaveStatus('saving');
  const { error } = await sb.from('meal_logs').upsert(
    { user_id: uid, date: state.today, meal_id: mealId, done },
    { onConflict: 'user_id,date,meal_id' }
  );
  if (error) {
    const msg = error.message || error.details || JSON.stringify(error);
    setSaveStatus('error', msg);
    throw new Error(msg);
  }
  setSaveStatus('saved');
}

async function upsertExercise(idx, done) {
  const uid = currentUser.id;
  setSaveStatus('saving');
  const { error } = await sb.from('exercise_logs').upsert(
    { user_id: uid, date: state.today, exercise_index: idx, done },
    { onConflict: 'user_id,date,exercise_index' }
  );
  if (error) {
    const msg = error.message || error.details || JSON.stringify(error);
    setSaveStatus('error', msg);
    throw new Error(msg);
  }
  setSaveStatus('saved');
}

async function addXp(amount) {
  const uid = currentUser.id;
  state.totalXp += amount;
  const { error } = await sb.from('user_xp').upsert(
    { user_id: uid, total_xp: state.totalXp, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  );
  if (!error) {
    updateXpUI();
    showXpToast(amount);
  }
}

async function saveWeight(kg) {
  const uid = currentUser.id;
  setSaveStatus('saving');
  const { error } = await sb.from('weight_logs').insert(
    { user_id: uid, date: state.today, weight: kg }
  );
  if (error) { setSaveStatus('error'); throw error; }
  setSaveStatus('saved');
  state.weightHistory.unshift({ date: state.today, weight: kg });
  if (state.weightHistory.length > 7) state.weightHistory.pop();
  renderWeek();
}

// ============================================
// Render — Aba HOJE
// ============================================

function renderHoje() {
  const c = document.getElementById('tab-hoje');

  const mealsDone = Object.values(state.mealDone).filter(Boolean).length;
  c.querySelector('#stat-meals').textContent = `${mealsDone}/5`;
  c.querySelector('#stat-water').textContent = `${(state.waterCups * 0.25).toFixed(2)}L`;

  BLOCKS.forEach(b => {
    const el = c.querySelector(`[data-block="${b.id}"]`);
    if (el) el.classList.toggle('done', !!state.dailyDone[b.id]);
  });

  const cups = c.querySelectorAll('.water-cup');
  cups.forEach((cup, i) => {
    cup.classList.toggle('filled', i < state.waterCups);
  });
}

// ============================================
// Render — Aba COMIDA
// ============================================

function renderComida() {
  const c = document.getElementById('tab-comida');

  let totP = 0, totC = 0, totF = 0, totK = 0;
  MEALS.forEach(m => {
    if (state.mealDone[m.id]) {
      totP += m.p; totC += m.c; totF += m.f; totK += m.kcal;
    }
    const el = c.querySelector(`[data-meal="${m.id}"]`);
    if (el) el.classList.toggle('done', !!state.mealDone[m.id]);
  });

  setMacroBars(c, totP, totC, totF, totK);
}

function setMacroBars(c, p, carb, f, kcal) {
  const pct = (v, g) => Math.min(100, Math.round((v / g) * 100));
  c.querySelector('#bar-prot').style.width  = pct(p, MACRO_GOALS.p)       + '%';
  c.querySelector('#bar-carb').style.width  = pct(carb, MACRO_GOALS.c)    + '%';
  c.querySelector('#bar-fat').style.width   = pct(f, MACRO_GOALS.f)       + '%';
  c.querySelector('#bar-kcal').style.width  = pct(kcal, MACRO_GOALS.kcal) + '%';
  c.querySelector('#val-prot').textContent  = `${p}/${MACRO_GOALS.p}g`;
  c.querySelector('#val-carb').textContent  = `${carb}/${MACRO_GOALS.c}g`;
  c.querySelector('#val-fat').textContent   = `${f}/${MACRO_GOALS.f}g`;
  c.querySelector('#val-kcal').textContent  = `${kcal}/${MACRO_GOALS.kcal}kcal`;
}

// ============================================
// Render — Aba TREINO
// ============================================

function renderTreino() {
  const c   = document.getElementById('tab-treino');
  const dow = getDayOfWeek();
  const wk  = WORKOUTS[dow];

  c.innerHTML = '';

  if (!wk || wk.exercises.length === 0) {
    c.innerHTML = `
      <div class="rest-day">
        <div class="rest-icon">😴</div>
        <div class="rest-text">Dia de descanso — recupere bem!</div>
      </div>`;
    return;
  }

  const done  = wk.exercises.filter((_, i) => state.exDone[i]).length;
  const total = wk.exercises.length;
  const pct   = Math.round((done / total) * 100);

  c.innerHTML = `
    <div class="workout-header">
      <div class="workout-day">${wk.name}</div>
      <div class="workout-progress-wrap">
        <div class="workout-progress-bar">
          <div class="workout-progress-fill" style="width:${pct}%"></div>
        </div>
        <span class="workout-progress-label">${done}/${total} (${pct}%)</span>
      </div>
    </div>
    ${wk.exercises.map((ex, i) => `
      <div class="exercise-item${state.exDone[i] ? ' done' : ''}" data-ex="${i}">
        <span class="exercise-num">${i+1}</span>
        <span class="exercise-name">${ex}</span>
        <div class="exercise-check"></div>
      </div>
    `).join('')}
  `;

  c.querySelectorAll('.exercise-item').forEach(el => {
    el.addEventListener('click', () => toggleExercise(parseInt(el.dataset.ex)));
  });
}

// ============================================
// Render — Aba SEMANA
// ============================================

function renderWeek() {
  const c = document.getElementById('tab-semana');

  // streak
  let streak = 0;
  for (let i = 0; i < 30; i++) {
    const d  = getDateStr(i);
    const wd = state.weekData[d];
    if (wd && wd.score >= 7) streak++;
    else if (i > 0) break;
  }
  c.querySelector('#streak-num').textContent = streak;

  // week grid
  const grid     = c.querySelector('#week-grid');
  const dayNames = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  grid.innerHTML  = '';
  for (let i = 6; i >= 0; i--) {
    const ds    = getDateStr(i);
    const wd    = state.weekData[ds];
    const dt    = new Date(ds + 'T00:00:00');
    const dn    = dayNames[dt.getDay()];
    const isToday = ds === state.today;

    let cls = '';
    if (wd) {
      const pct = (wd.score / wd.total) * 100;
      cls = pct >= 70 ? 'green' : pct >= 40 ? 'amber' : 'red';
    }
    if (isToday) cls += ' today';

    grid.innerHTML += `
      <div class="day-cell ${cls}">
        <span class="day-name">${dn}</span>
        <span class="day-score">${wd ? wd.score : '-'}</span>
      </div>`;
  }

  // histórico de peso
  const hist = c.querySelector('#weight-history');
  hist.innerHTML = '';
  state.weightHistory.forEach((entry, i) => {
    const prev = state.weightHistory[i + 1];
    let diffHtml = '';
    if (prev) {
      const diff = entry.weight - prev.weight;
      const cls  = diff < 0 ? 'neg' : diff > 0 ? 'pos' : 'neu';
      const sign = diff > 0 ? '+' : '';
      diffHtml = `<span class="weight-diff ${cls}">${sign}${diff.toFixed(1)} kg</span>`;
    }
    hist.innerHTML += `
      <li class="weight-entry">
        <span>${formatDatePT(entry.date)}</span>
        <span class="weight-val">${entry.weight} kg</span>
        ${diffHtml}
      </li>`;
  });

  // meta de peso
  const goalStart = 89, goalEnd = 82;
  const lastW = state.weightHistory[0]?.weight;
  if (lastW != null) {
    const range = goalStart - goalEnd;
    const prog  = Math.max(0, Math.min(100, ((goalStart - lastW) / range) * 100));
    c.querySelector('#goal-fill').style.width    = prog + '%';
    c.querySelector('#goal-current').textContent = `${lastW} kg`;
  }
}

// ============================================
// Handlers — toggle blocos
// ============================================

async function toggleBlock(blockId) {
  const newVal = !state.dailyDone[blockId];

  // Optimista
  state.dailyDone[blockId] = newVal;
  renderHoje();

  try {
    await upsertDaily(blockId, newVal);
    if (newVal) {
      const blk = BLOCKS.find(b => b.id === blockId);
      if (blk) await addXp(blk.xp);
    }
  } catch {
    // Reverte em caso de erro
    state.dailyDone[blockId] = !newVal;
    renderHoje();
  }
}

async function toggleMeal(mealId) {
  const newVal = !state.mealDone[mealId];

  state.mealDone[mealId] = newVal;
  renderComida();
  renderHoje();

  try {
    await upsertMeal(mealId, newVal);
    if (newVal) await addXp(3);
  } catch {
    state.mealDone[mealId] = !newVal;
    renderComida();
    renderHoje();
  }
}

async function toggleExercise(idx) {
  const newVal = !state.exDone[idx];

  state.exDone[idx] = newVal;
  renderTreino();

  try {
    await upsertExercise(idx, newVal);
    if (newVal) await addXp(2);
  } catch {
    state.exDone[idx] = !newVal;
    renderTreino();
  }
}

// ============================================
// Água — salva no Supabase via campo value
// ============================================

async function toggleCup(cupIdx) {
  // Clica num copo já cheio → esvazia a partir dele; clica num vazio → preenche até ele
  const newCups = cupIdx < state.waterCups ? cupIdx : cupIdx + 1;

  // Optimista
  state.waterCups = newCups;
  renderHoje();

  const aguaDone = newCups >= 10;

  try {
    // Salva quantidade de copos no campo value + done se completou a meta
    await upsertDaily('agua', aguaDone, newCups);
    state.dailyDone['agua'] = aguaDone;
    renderHoje();

    // XP só na primeira vez que completa os 10 copos
    if (aguaDone && !state.dailyDone['agua']) await addXp(5);
  } catch {
    // Reverte
    state.waterCups = cupIdx < state.waterCups ? cupIdx + 1 : cupIdx;
    renderHoje();
  }
}

// ============================================
// Peso
// ============================================

async function handleSaveWeight() {
  const inp = document.getElementById('weight-input');
  const val = parseFloat(inp.value.replace(',', '.'));
  if (!val || val < 40 || val > 200) {
    alert('Informe um peso válido (ex: 89.5)');
    return;
  }
  const btn = document.getElementById('btn-save-weight');
  btn.disabled = true;
  btn.textContent = 'Salvando...';

  try {
    await saveWeight(val);
    inp.value = '';
  } catch {
    alert('Erro ao salvar peso. Tente novamente.');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Salvar';
  }
}

// ============================================
// Logout
// ============================================

async function logout() {
  await sb.auth.signOut();
  window.location.href = '/login';
}

// ============================================
// Tabs
// ============================================

function switchTab(name) {
  state.tab = name;
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === name);
  });
  document.querySelectorAll('.tab-content').forEach(t => {
    t.classList.toggle('active', t.id === 'tab-' + name);
  });
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === name);
  });

  if (name === 'semana') renderWeek();
  if (name === 'treino') renderTreino();
}

// ============================================
// Build HTML das abas
// ============================================

function buildHoje() {
  const el = document.getElementById('tab-hoje');
  el.innerHTML = `
    <div class="stats-row">
      <div class="stat-pill">
        <div class="val" id="stat-meals">0/5</div>
        <div class="lbl">Refeições</div>
      </div>
      <div class="stat-pill">
        <div class="val" id="stat-water">0.00L</div>
        <div class="lbl">Água</div>
      </div>
    </div>

    ${BLOCKS.map(b => `
      <div class="block-item" data-block="${b.id}">
        <span class="block-icon">${b.icon}</span>
        <div class="block-info">
          <div class="block-name">${b.name}</div>
          <div class="block-xp">+${b.xp} XP</div>
        </div>
        <div class="block-check"></div>
      </div>
    `).join('')}

    <div class="card" style="margin-top:12px">
      <div class="card-title">Copos de água (250ml cada)</div>
      <div class="water-grid">
        ${Array.from({length:10}, (_,i) => `
          <div class="water-cup" data-cup="${i}">💧</div>
        `).join('')}
      </div>
    </div>
  `;

  el.querySelectorAll('.block-item').forEach(el => {
    el.addEventListener('click', () => toggleBlock(el.dataset.block));
  });

  el.querySelectorAll('.water-cup').forEach(cup => {
    cup.addEventListener('click', () => toggleCup(parseInt(cup.dataset.cup)));
  });
}

function buildComida() {
  const el = document.getElementById('tab-comida');
  el.innerHTML = `
    <div class="card" style="margin-bottom:12px">
      <div class="card-title">Macros do dia</div>
      <div class="macro-row">
        <div class="macro-header">
          <span>Proteína</span><span id="val-prot">0/${MACRO_GOALS.p}g</span>
        </div>
        <div class="macro-bar"><div class="macro-fill prot" id="bar-prot" style="width:0%"></div></div>
      </div>
      <div class="macro-row">
        <div class="macro-header">
          <span>Carboidrato</span><span id="val-carb">0/${MACRO_GOALS.c}g</span>
        </div>
        <div class="macro-bar"><div class="macro-fill carb" id="bar-carb" style="width:0%"></div></div>
      </div>
      <div class="macro-row">
        <div class="macro-header">
          <span>Gordura</span><span id="val-fat">0/${MACRO_GOALS.f}g</span>
        </div>
        <div class="macro-bar"><div class="macro-fill fat" id="bar-fat" style="width:0%"></div></div>
      </div>
      <div class="macro-row">
        <div class="macro-header">
          <span>Calorias</span><span id="val-kcal">0/${MACRO_GOALS.kcal}kcal</span>
        </div>
        <div class="macro-bar"><div class="macro-fill kcal" id="bar-kcal" style="width:0%"></div></div>
      </div>
    </div>

    ${MEALS.map(m => `
      <div class="meal-item" data-meal="${m.id}">
        <div class="meal-header">
          <span class="meal-name">${m.name}</span>
          <span class="meal-time">${m.time}</span>
        </div>
        <div class="meal-macros">${m.kcal}kcal · ${m.p}p · ${m.c}c · ${m.f}g</div>
        <div class="meal-desc">${m.desc}</div>
      </div>
    `).join('')}
  `;

  el.querySelectorAll('.meal-item').forEach(el => {
    el.addEventListener('click', () => toggleMeal(el.dataset.meal));
  });
}

function buildSemana() {
  const el = document.getElementById('tab-semana');
  el.innerHTML = `
    <div class="streak-box">
      <div class="streak-num" id="streak-num">0</div>
      <div class="streak-label">dias consecutivos (score ≥ 7)</div>
    </div>

    <div class="card">
      <div class="card-title">Últimos 7 dias</div>
      <div class="week-grid" id="week-grid"></div>
    </div>

    <div class="card">
      <div class="card-title">Registrar peso</div>
      <div class="weight-form">
        <input type="number" id="weight-input" class="weight-input"
          placeholder="Ex: 89.5" step="0.1" min="40" max="200">
        <button class="btn-save" id="btn-save-weight">Salvar</button>
      </div>
      <ul class="weight-history" id="weight-history"></ul>
    </div>

    <div class="goal-box">
      <div class="goal-header">
        <span class="goal-label">Meta de peso</span>
        <span class="goal-vals">
          <span id="goal-current">—</span> → 82 kg
        </span>
      </div>
      <div class="goal-bar">
        <div class="goal-fill" id="goal-fill" style="width:0%"></div>
      </div>
    </div>
  `;

  el.querySelector('#btn-save-weight').addEventListener('click', handleSaveWeight);
}

// ============================================
// Init
// ============================================

async function init() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    window.location.href = '/login';
    return;
  }
  currentUser = session.user;

  document.getElementById('header-date').textContent = formatDatePT(state.today);

  buildHoje();
  buildComida();
  buildSemana();

  document.querySelectorAll('.tab-btn').forEach(b => {
    b.addEventListener('click', () => switchTab(b.dataset.tab));
  });
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.addEventListener('click', () => switchTab(b.dataset.tab));
  });

  document.getElementById('btn-logout').addEventListener('click', logout);

  // Teste de conectividade — loga qualquer problema de acesso ao banco
  const { error: pingError } = await sb.from('user_xp').select('user_id').limit(1);
  if (pingError) {
    console.error('[SUPABASE PING ERROR]', pingError);
    setSaveStatus('error', 'Sem acesso ao banco: ' + (pingError.message || pingError.code));
  } else {
    console.log('[SUPABASE] Conectado com sucesso. User:', currentUser.id);
  }

  await loadAll();

  updateXpUI();
  renderHoje();
  renderComida();
  renderTreino();

  sb.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') window.location.href = '/login';
  });
}

document.addEventListener('DOMContentLoaded', init);
