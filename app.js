// app.js — Lógica principal do app

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
  { id: 'cafe',   name: 'Café da manhã', time: '08h',   kcal: 600, p: 55, c: 55, f: 15, desc: '2 ovos · tapioca 30g · mussarela · leite c/ whey 15g + aveia 15g · fruta' },
  { id: 'almoco', name: 'Almoço',        time: '11-12h', kcal: 650, p: 50, c: 70, f: 12, desc: 'Arroz 70g cru · feijão 70g · frango 180g · salada livre' },
  { id: 'tarde',  name: 'Café da tarde', time: '14-15h', kcal: 620, p: 40, c: 85, f: 15, desc: '2 bananas · aveia 35g · 2 ovos · cacau 5g · doce de leite · leite c/ whey 25g' },
  { id: 'janta',  name: 'Jantar',        time: '20h',    kcal: 470, p: 45, c: 55, f: 10, desc: 'Arroz 80g cru · frango 180g · salada livre' },
  { id: 'ceia',   name: 'Ceia',          time: '22h',    kcal: 210, p: 29, c: 15, f: 4,  desc: 'Leite desnatado 200ml · whey 25g' },
];

const MACRO_GOALS = { p: 220, c: 272, f: 62, kcal: 2530 };

const WORKOUTS = {
  0: { name: 'Domingo — Descanso', exercises: [] },
  1: { name: 'Segunda — Peito + Tríceps', exercises: ['4x Supino horizontal','3x Crucifixo inclinado máquina','3x Voador crucifixo','3x Paralela peito (Dips)','3x Tríceps polia corda','3x Extensão tríceps haltere','2x Tríceps francês barra EZ'] },
  2: { name: 'Terça — Pernas posteriores', exercises: ['4x Terra sumo (fazer primeiro)','3x Stiff barra','3x Cadeira flexora','3x Flexão pernas em pé','3x Elevação pélvica máquina','3x Cadeira abdutora','4x Panturrilha sentado'] },
  3: { name: 'Quarta — Costas + Bíceps', exercises: ['4x Puxada alta máquina','3x Remada isolateral','3x Remo sentado pegada V','3x Puxada triângulo','2x Pulldown corda','3x Rosca Scott barra EZ','3x Rosca inclinada polia','2x Rosca martelo'] },
  4: { name: 'Quinta — Ombros', exercises: ['4x Desenvolvimento máquina','3x Arnold haltere','3x Elevação lateral máquina','3x Elevação lateral polia','3x Voador invertido máquina','3x Face Pull polia','3x Encolhimento barra'] },
  5: { name: 'Sexta — Pernas quadríceps', exercises: ['5x Agachamento Smith','3x Leg press 45°','3x Leg press unilateral','3x Cadeira extensora','3x Avanço haltere','4x Panturrilha sentado'] },
  6: { name: 'Sábado — Fullbody leve + Abdômen', exercises: ['3x Agachamento goblet','3x Supino máquina leve','3x Puxada triângulo','3x Desenvolvimento haltere','3x Prancha 30-60s','3x Crunch abdominal','3x Elevação de pernas'] },
};

const LEVELS = [
  { min: 0,   max: 99,  name: 'Iniciante' },
  { min: 100, max: 199, name: 'Comprometido' },
  { min: 200, max: 399, name: 'Consistente' },
  { min: 400, max: 699, name: 'Guerreiro' },
  { min: 700, max: Infinity, name: 'Máquina' },
];

const DAY_SHORT  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

// ============================================
// Estado
// ============================================

const state = {
  today:         getTodayStr(),
  viewDate:      getTodayStr(),
  dailyDone:     {},
  mealDone:      {},
  exDone:        {},
  waterCups:     0,
  totalXp:       0,
  weightHistory: [],
  weekData:      {},
  monthData:     {},
  calYear:       new Date().getFullYear(),
  calMonth:      new Date().getMonth(),
  blockSchedule: loadSchedule(),
  tab:           'hoje',
};

// ============================================
// Block Schedule (localStorage)
// ============================================

function defaultSchedule() {
  const all     = ['academia','camm','camt','sesta','agua'];
  const weekend = ['academia','sesta','agua'];
  return {
    0: [...weekend], // Dom
    1: [...all],     // Seg
    2: [...all],     // Ter
    3: [...all],     // Qua
    4: [...all],     // Qui
    5: [...all],     // Sex
    6: [...weekend], // Sáb
  };
}

function loadSchedule() {
  try {
    const s = localStorage.getItem('blockSchedule');
    if (!s) return defaultSchedule();
    const parsed = JSON.parse(s);
    // Garante que todas as chaves existem
    const def = defaultSchedule();
    for (let i = 0; i <= 6; i++) {
      if (!Array.isArray(parsed[i])) parsed[i] = def[i];
    }
    return parsed;
  } catch { return defaultSchedule(); }
}

function saveSchedule() {
  try { localStorage.setItem('blockSchedule', JSON.stringify(state.blockSchedule)); } catch {}
}

function getActiveBlocks(dateStr) {
  const dow = new Date(dateStr + 'T12:00:00').getDay();
  const ids  = state.blockSchedule[dow] || BLOCKS.map(b => b.id);
  return BLOCKS.filter(b => ids.includes(b.id));
}

// ============================================
// Utilitários de data
// ============================================

function getTodayStr() {
  return dateToStr(new Date());
}

function dateToStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatDatePT(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${DAY_SHORT[dt.getDay()]}, ${String(d).padStart(2,'0')} ${MONTH_NAMES[m-1].slice(0,3).toLowerCase()}`;
}

function getDateStr(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return dateToStr(d);
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
  return Math.min(100, Math.round(((xp - lvl.min) / (lvl.max - lvl.min + 1)) * 100));
}

function updateXpUI() {
  const xp  = state.totalXp;
  const lvl = getLevel(xp);
  document.getElementById('level-badge').textContent = lvl.name;
  document.getElementById('xp-label').textContent    = `${xp} XP`;
  document.getElementById('xp-fill').style.width     = getXpProgress(xp) + '%';
}

function showXpToast(xp) {
  const t = document.getElementById('xp-toast');
  t.textContent = `+${xp} XP`;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

// ============================================
// Indicador de salvamento
// ============================================

let saveTimer = null;

function setSaveStatus(status, detail = '') {
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
    el.textContent = '⚠ erro ao salvar';
    if (detail) console.error('[SAVE ERROR]', detail);
  }
}

// ============================================
// Navegação de dia
// ============================================

async function navigateDay(delta) {
  const d = new Date(state.viewDate + 'T12:00:00');
  d.setDate(d.getDate() + delta);
  const newDate = dateToStr(d);
  if (newDate > state.today) return; // Não navega para o futuro
  state.viewDate = newDate;
  updateHeaderDate();
  buildHoje(); // Rebuild pois os blocos ativos podem mudar
  await loadAllForDate(state.viewDate);
  renderHoje();
  renderComida();
  if (state.tab === 'treino') renderTreino();
}

async function goToToday() {
  state.viewDate = state.today;
  updateHeaderDate();
  buildHoje();
  await loadAllForDate(state.viewDate);
  renderHoje();
  renderComida();
  if (state.tab === 'treino') renderTreino();
  switchTab('hoje');
}

function updateHeaderDate() {
  const el       = document.getElementById('header-date');
  const isToday  = state.viewDate === state.today;
  const todayBtn = document.getElementById('btn-goto-today');
  const nextBtn  = document.getElementById('next-day');

  if (el) el.textContent = isToday ? formatDatePT(state.viewDate) : formatDatePT(state.viewDate) + ' (passado)';
  if (todayBtn) todayBtn.style.display = isToday ? 'none' : 'inline-flex';
  if (nextBtn)  nextBtn.disabled = isToday;
}

// ============================================
// Supabase — Leitura
// ============================================

async function loadAllForDate(dateStr) {
  const uid = currentUser.id;

  const [daily, meals, ex, xpRow, weights] = await Promise.all([
    sb.from('daily_logs').select('block_id,done,value').eq('user_id', uid).eq('date', dateStr),
    sb.from('meal_logs').select('meal_id,done').eq('user_id', uid).eq('date', dateStr),
    sb.from('exercise_logs').select('exercise_index,done').eq('user_id', uid).eq('date', dateStr),
    sb.from('user_xp').select('total_xp').eq('user_id', uid).maybeSingle(),
    sb.from('weight_logs').select('date,weight').eq('user_id', uid).order('date', { ascending: false }).limit(7),
  ]);

  state.dailyDone = {};
  state.waterCups = 0;
  (daily.data || []).forEach(r => {
    state.dailyDone[r.block_id] = r.done;
    if (r.block_id === 'agua') state.waterCups = r.value || 0;
  });

  state.mealDone = {};
  (meals.data || []).forEach(r => { state.mealDone[r.meal_id] = r.done; });

  state.exDone = {};
  (ex.data || []).forEach(r => { state.exDone[r.exercise_index] = r.done; });

  state.totalXp = xpRow.data?.total_xp || 0;

  state.weightHistory = (weights.data || []).map(r => ({
    date: r.date, weight: parseFloat(r.weight),
  }));

  await loadWeekData();
}

async function loadWeekData() {
  const uid   = currentUser.id;
  const dates = Array.from({ length: 7 }, (_, i) => getDateStr(6 - i));

  const [daily, meals] = await Promise.all([
    sb.from('daily_logs').select('date,block_id,done').eq('user_id', uid).in('date', dates),
    sb.from('meal_logs').select('date,done').eq('user_id', uid).in('date', dates),
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

async function loadMonthData(year, month) {
  const uid   = currentUser.id;
  const start = `${year}-${String(month+1).padStart(2,'0')}-01`;
  const lastD = new Date(year, month + 1, 0).getDate();
  const end   = `${year}-${String(month+1).padStart(2,'0')}-${String(lastD).padStart(2,'0')}`;

  const [daily, meals] = await Promise.all([
    sb.from('daily_logs').select('date,block_id,done').eq('user_id', uid).gte('date', start).lte('date', end).eq('done', true),
    sb.from('meal_logs').select('date,done').eq('user_id', uid).gte('date', start).lte('date', end).eq('done', true),
  ]);

  state.monthData = {};

  (daily.data || []).forEach(r => {
    if (!state.monthData[r.date]) state.monthData[r.date] = { xp: 0, items: 0 };
    const blk = BLOCKS.find(b => b.id === r.block_id);
    state.monthData[r.date].xp    += blk ? blk.xp : 0;
    state.monthData[r.date].items += 1;
  });

  (meals.data || []).forEach(r => {
    if (!state.monthData[r.date]) state.monthData[r.date] = { xp: 0, items: 0 };
    state.monthData[r.date].xp    += 3;
    state.monthData[r.date].items += 1;
  });
}

// ============================================
// Supabase — Escrita
// ============================================

async function upsertDaily(blockId, done, value = null) {
  const uid     = currentUser.id;
  const payload = { user_id: uid, date: state.viewDate, block_id: blockId, done };
  if (value !== null) payload.value = value;

  setSaveStatus('saving');
  const { error } = await sb.from('daily_logs').upsert(payload, { onConflict: 'user_id,date,block_id' });
  if (error) { setSaveStatus('error', error.message); throw error; }
  setSaveStatus('saved');
}

async function upsertMeal(mealId, done) {
  const uid = currentUser.id;
  setSaveStatus('saving');
  const { error } = await sb.from('meal_logs').upsert(
    { user_id: uid, date: state.viewDate, meal_id: mealId, done },
    { onConflict: 'user_id,date,meal_id' }
  );
  if (error) { setSaveStatus('error', error.message); throw error; }
  setSaveStatus('saved');
}

async function upsertExercise(idx, done) {
  const uid = currentUser.id;
  setSaveStatus('saving');
  const { error } = await sb.from('exercise_logs').upsert(
    { user_id: uid, date: state.viewDate, exercise_index: idx, done },
    { onConflict: 'user_id,date,exercise_index' }
  );
  if (error) { setSaveStatus('error', error.message); throw error; }
  setSaveStatus('saved');
}

async function addXp(amount) {
  const uid = currentUser.id;
  state.totalXp += amount;
  const { error } = await sb.from('user_xp').upsert(
    { user_id: uid, total_xp: state.totalXp, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  );
  if (!error) { updateXpUI(); showXpToast(amount); }
}

async function saveWeight(kg) {
  const uid = currentUser.id;
  setSaveStatus('saving');
  const { error } = await sb.from('weight_logs').insert({ user_id: uid, date: state.viewDate, weight: kg });
  if (error) { setSaveStatus('error', error.message); throw error; }
  setSaveStatus('saved');
  state.weightHistory.unshift({ date: state.viewDate, weight: kg });
  if (state.weightHistory.length > 7) state.weightHistory.pop();
  renderWeek();
}

// ============================================
// Handlers
// ============================================

async function toggleBlock(blockId) {
  const newVal = !state.dailyDone[blockId];
  state.dailyDone[blockId] = newVal;
  renderHoje();
  try {
    await upsertDaily(blockId, newVal);
    if (newVal) { const blk = BLOCKS.find(b => b.id === blockId); if (blk) await addXp(blk.xp); }
  } catch {
    state.dailyDone[blockId] = !newVal;
    renderHoje();
  }
}

async function toggleMeal(mealId) {
  const newVal = !state.mealDone[mealId];
  state.mealDone[mealId] = newVal;
  renderComida(); renderHoje();
  try {
    await upsertMeal(mealId, newVal);
    if (newVal) await addXp(3);
  } catch {
    state.mealDone[mealId] = !newVal;
    renderComida(); renderHoje();
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

async function toggleCup(cupIdx) {
  const newCups  = cupIdx < state.waterCups ? cupIdx : cupIdx + 1;
  const prevCups = state.waterCups;
  state.waterCups = newCups;
  renderHoje();

  const aguaDone = newCups >= 10;
  const wasAlreadyDone = !!state.dailyDone['agua'];

  try {
    await upsertDaily('agua', aguaDone, newCups);
    if (aguaDone && !wasAlreadyDone) {
      state.dailyDone['agua'] = true;
      await addXp(5);
    } else if (!aguaDone) {
      state.dailyDone['agua'] = false;
    }
    renderHoje();
  } catch {
    state.waterCups = prevCups;
    renderHoje();
  }
}

async function handleSaveWeight() {
  const inp = document.getElementById('weight-input');
  const val = parseFloat(inp.value.replace(',', '.'));
  if (!val || val < 40 || val > 200) { alert('Informe um peso válido (ex: 89.5)'); return; }
  const btn = document.getElementById('btn-save-weight');
  btn.disabled = true; btn.textContent = 'Salvando...';
  try { await saveWeight(val); inp.value = ''; }
  catch { alert('Erro ao salvar peso. Tente novamente.'); }
  finally { btn.disabled = false; btn.textContent = 'Salvar'; }
}

// ============================================
// Calendário — navegação de mês
// ============================================

async function navigateMonth(delta) {
  state.calMonth += delta;
  if (state.calMonth > 11) { state.calMonth = 0;  state.calYear++; }
  if (state.calMonth < 0)  { state.calMonth = 11; state.calYear--; }
  await loadMonthData(state.calYear, state.calMonth);
  renderCalendar();
}

// ============================================
// Render — Aba HOJE
// ============================================

function renderHoje() {
  const c            = document.getElementById('tab-hoje');
  const mealsDone    = Object.values(state.mealDone).filter(Boolean).length;
  const activeBlocks = getActiveBlocks(state.viewDate);

  c.querySelector('#stat-meals').textContent = `${mealsDone}/5`;
  c.querySelector('#stat-water').textContent = `${(state.waterCups * 0.25).toFixed(2)}L`;

  activeBlocks.forEach(b => {
    const el = c.querySelector(`[data-block="${b.id}"]`);
    if (el) el.classList.toggle('done', !!state.dailyDone[b.id]);
  });

  c.querySelectorAll('.water-cup').forEach((cup, i) => {
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
    if (state.mealDone[m.id]) { totP += m.p; totC += m.c; totF += m.f; totK += m.kcal; }
    const el = c.querySelector(`[data-meal="${m.id}"]`);
    if (el) el.classList.toggle('done', !!state.mealDone[m.id]);
  });
  const pct = (v, g) => Math.min(100, Math.round((v/g)*100));
  c.querySelector('#bar-prot').style.width  = pct(totP, MACRO_GOALS.p)    + '%';
  c.querySelector('#bar-carb').style.width  = pct(totC, MACRO_GOALS.c)    + '%';
  c.querySelector('#bar-fat').style.width   = pct(totF, MACRO_GOALS.f)    + '%';
  c.querySelector('#bar-kcal').style.width  = pct(totK, MACRO_GOALS.kcal) + '%';
  c.querySelector('#val-prot').textContent  = `${totP}/${MACRO_GOALS.p}g`;
  c.querySelector('#val-carb').textContent  = `${totC}/${MACRO_GOALS.c}g`;
  c.querySelector('#val-fat').textContent   = `${totF}/${MACRO_GOALS.f}g`;
  c.querySelector('#val-kcal').textContent  = `${totK}/${MACRO_GOALS.kcal}kcal`;
}

// ============================================
// Render — Aba TREINO
// ============================================

function renderTreino() {
  const c   = document.getElementById('tab-treino');
  const dow = new Date(state.viewDate + 'T12:00:00').getDay();
  const wk  = WORKOUTS[dow];

  c.innerHTML = '';

  if (!wk || wk.exercises.length === 0) {
    c.innerHTML = `<div class="rest-day"><div class="rest-icon">😴</div><div class="rest-text">Dia de descanso — recupere bem!</div></div>`;
    return;
  }

  const done  = wk.exercises.filter((_, i) => state.exDone[i]).length;
  const total = wk.exercises.length;
  const pct   = Math.round((done / total) * 100);

  c.innerHTML = `
    <div class="workout-header">
      <div class="workout-day">${wk.name}</div>
      <div class="workout-progress-wrap">
        <div class="workout-progress-bar"><div class="workout-progress-fill" style="width:${pct}%"></div></div>
        <span class="workout-progress-label">${done}/${total} (${pct}%)</span>
      </div>
    </div>
    ${wk.exercises.map((ex, i) => `
      <div class="exercise-item${state.exDone[i] ? ' done' : ''}" data-ex="${i}">
        <span class="exercise-num">${i+1}</span>
        <span class="exercise-name">${ex}</span>
        <div class="exercise-check"></div>
      </div>`).join('')}`;

  c.querySelectorAll('.exercise-item').forEach(el => {
    el.addEventListener('click', () => toggleExercise(parseInt(el.dataset.ex)));
  });
}

// ============================================
// Render — Aba SEMANA
// ============================================

function renderWeek() {
  const c = document.getElementById('tab-semana');

  // Streak
  let streak = 0;
  for (let i = 0; i < 90; i++) {
    const d  = getDateStr(i);
    const wd = state.weekData[d];
    if (wd && wd.score >= 7) streak++;
    else if (i > 0) break;
  }
  const sEl = c.querySelector('#streak-num');
  if (sEl) sEl.textContent = streak;

  // Grid 7 dias
  const grid = c.querySelector('#week-grid');
  if (grid) {
    grid.innerHTML = '';
    for (let i = 6; i >= 0; i--) {
      const ds      = getDateStr(i);
      const wd      = state.weekData[ds];
      const dt      = new Date(ds + 'T12:00:00');
      const dn      = DAY_SHORT[dt.getDay()];
      const isToday = ds === state.today;
      const isView  = ds === state.viewDate;
      let cls = '';
      if (wd) { const p = (wd.score/wd.total)*100; cls = p>=70?'green':p>=40?'amber':'red'; }
      if (isToday) cls += ' today';
      if (isView && !isToday) cls += ' viewing';
      grid.innerHTML += `
        <div class="day-cell ${cls}" data-date="${ds}" style="cursor:pointer">
          <span class="day-name">${dn}</span>
          <span class="day-score">${wd ? wd.score : '-'}</span>
        </div>`;
    }
    grid.querySelectorAll('.day-cell').forEach(el => {
      el.addEventListener('click', () => jumpToDate(el.dataset.date));
    });
  }

  // Histórico de peso
  const hist = c.querySelector('#weight-history');
  if (hist) {
    hist.innerHTML = '';
    state.weightHistory.forEach((entry, i) => {
      const prev = state.weightHistory[i + 1];
      let diffHtml = '';
      if (prev) {
        const diff = entry.weight - prev.weight;
        const cls  = diff < 0 ? 'neg' : diff > 0 ? 'pos' : 'neu';
        diffHtml = `<span class="weight-diff ${cls}">${diff>0?'+':''}${diff.toFixed(1)} kg</span>`;
      }
      hist.innerHTML += `<li class="weight-entry"><span>${formatDatePT(entry.date)}</span><span class="weight-val">${entry.weight} kg</span>${diffHtml}</li>`;
    });
  }

  // Meta de peso
  const lastW = state.weightHistory[0]?.weight;
  if (lastW != null) {
    const goalStart = 89, goalEnd = 82;
    const prog = Math.max(0, Math.min(100, ((goalStart - lastW) / (goalStart - goalEnd)) * 100));
    const gf = c.querySelector('#goal-fill');
    const gc = c.querySelector('#goal-current');
    if (gf) gf.style.width = prog + '%';
    if (gc) gc.textContent = `${lastW} kg`;
  }
}

// ============================================
// Render — Calendário Mensal
// ============================================

function renderCalendar() {
  const c = document.getElementById('tab-semana');
  const grid  = c.querySelector('#cal-grid');
  const label = c.querySelector('#cal-month-label');
  if (!grid || !label) return;

  const { calYear: y, calMonth: m } = state;
  label.textContent = `${MONTH_NAMES[m]} ${y}`;

  const firstDay  = new Date(y, m, 1).getDay();   // 0=Dom
  const daysInMon = new Date(y, m + 1, 0).getDate();
  const todayStr  = state.today;

  grid.innerHTML = '';

  // Cabeçalho dos dias
  DAY_SHORT.forEach(d => {
    grid.innerHTML += `<div class="cal-dow">${d}</div>`;
  });

  // Células vazias antes do dia 1
  for (let i = 0; i < firstDay; i++) {
    grid.innerHTML += `<div class="cal-empty"></div>`;
  }

  // Dias do mês
  for (let day = 1; day <= daysInMon; day++) {
    const ds      = `${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const data    = state.monthData[ds];
    const isToday = ds === todayStr;
    const isView  = ds === state.viewDate;
    const isFut   = ds > todayStr;

    let cls = 'cal-day';
    if (isToday) cls += ' cal-today';
    if (isView)  cls += ' cal-viewing';
    if (isFut)   cls += ' cal-future';

    let xpBadge = '';
    if (data && !isFut) {
      const xpVal = data.xp;
      const color = xpVal >= 20 ? 'green' : xpVal >= 8 ? 'amber' : 'red';
      cls    += ' cal-has-data';
      xpBadge = `<span class="cal-xp ${color}">${xpVal}</span>`;
    }

    grid.innerHTML += `
      <div class="${cls}" data-date="${ds}" ${!isFut ? 'style="cursor:pointer"' : ''}>
        <span class="cal-day-num">${day}</span>
        ${xpBadge}
      </div>`;
  }

  // Clique nos dias para navegar
  grid.querySelectorAll('.cal-day:not(.cal-future)').forEach(el => {
    el.addEventListener('click', () => jumpToDate(el.dataset.date));
  });
}

// ============================================
// Render — Configuração de blocos por dia
// ============================================

function renderSchedule() {
  const tbody = document.querySelector('#schedule-table tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  BLOCKS.forEach(b => {
    const cells = Array.from({ length: 7 }, (_, dow) => {
      const active   = state.blockSchedule[dow]?.includes(b.id);
      const dayLabel = DAY_SHORT[dow];
      return `<td><label class="sched-check" title="${dayLabel}">
        <input type="checkbox" data-block="${b.id}" data-dow="${dow}" ${active ? 'checked' : ''}>
        <span></span>
      </label></td>`;
    });
    tbody.innerHTML += `<tr><td class="sched-name">${b.icon} ${b.name}</td>${cells.join('')}</tr>`;
  });

  // Listeners
  tbody.querySelectorAll('input[type=checkbox]').forEach(inp => {
    inp.addEventListener('change', () => {
      const blockId = inp.dataset.block;
      const dow     = parseInt(inp.dataset.dow);
      const arr     = state.blockSchedule[dow] || [];
      if (inp.checked) {
        if (!arr.includes(blockId)) arr.push(blockId);
      } else {
        const idx = arr.indexOf(blockId);
        if (idx > -1) arr.splice(idx, 1);
      }
      state.blockSchedule[dow] = arr;
      saveSchedule();
      // Se o dia visualizado tem esse dia da semana, rebuild
      const viewDow = new Date(state.viewDate + 'T12:00:00').getDay();
      if (viewDow === dow) { buildHoje(); renderHoje(); }
    });
  });
}

// ============================================
// Navegar para data específica
// ============================================

async function jumpToDate(dateStr) {
  if (dateStr > state.today) return;
  state.viewDate = dateStr;
  updateHeaderDate();
  buildHoje();
  await loadAllForDate(state.viewDate);
  renderHoje();
  renderComida();
  renderTreino();
  renderWeek();
  switchTab('hoje');
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
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.toggle('active', t.id === 'tab-' + name));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  if (name === 'semana') { renderWeek(); renderCalendar(); }
  if (name === 'treino') renderTreino();
}

// ============================================
// Build — Aba HOJE
// ============================================

function buildHoje() {
  const activeBlocks = getActiveBlocks(state.viewDate);
  const el = document.getElementById('tab-hoje');
  el.innerHTML = `
    <div class="stats-row">
      <div class="stat-pill"><div class="val" id="stat-meals">0/5</div><div class="lbl">Refeições</div></div>
      <div class="stat-pill"><div class="val" id="stat-water">0.00L</div><div class="lbl">Água</div></div>
    </div>
    ${activeBlocks.map(b => `
      <div class="block-item" data-block="${b.id}">
        <span class="block-icon">${b.icon}</span>
        <div class="block-info">
          <div class="block-name">${b.name}</div>
          <div class="block-xp">+${b.xp} XP</div>
        </div>
        <div class="block-check"></div>
      </div>`).join('')}
    <div class="card" style="margin-top:12px">
      <div class="card-title">Copos de água (250ml cada)</div>
      <div class="water-grid">
        ${Array.from({length:10},(_,i)=>`<div class="water-cup" data-cup="${i}">💧</div>`).join('')}
      </div>
    </div>`;

  el.querySelectorAll('.block-item').forEach(el => {
    el.addEventListener('click', () => toggleBlock(el.dataset.block));
  });
  el.querySelectorAll('.water-cup').forEach(cup => {
    cup.addEventListener('click', () => toggleCup(parseInt(cup.dataset.cup)));
  });
}

// ============================================
// Build — Aba COMIDA
// ============================================

function buildComida() {
  const el = document.getElementById('tab-comida');
  el.innerHTML = `
    <div class="card" style="margin-bottom:12px">
      <div class="card-title">Macros do dia</div>
      ${[
        {id:'prot', label:'Proteína',    cls:'prot'},
        {id:'carb', label:'Carboidrato', cls:'carb'},
        {id:'fat',  label:'Gordura',     cls:'fat'},
        {id:'kcal', label:'Calorias',    cls:'kcal'},
      ].map(m => `
        <div class="macro-row">
          <div class="macro-header"><span>${m.label}</span><span id="val-${m.id}"></span></div>
          <div class="macro-bar"><div class="macro-fill ${m.cls}" id="bar-${m.id}" style="width:0%"></div></div>
        </div>`).join('')}
    </div>
    ${MEALS.map(m => `
      <div class="meal-item" data-meal="${m.id}">
        <div class="meal-header"><span class="meal-name">${m.name}</span><span class="meal-time">${m.time}</span></div>
        <div class="meal-macros">${m.kcal}kcal · ${m.p}p · ${m.c}c · ${m.f}g</div>
        <div class="meal-desc">${m.desc}</div>
      </div>`).join('')}`;

  el.querySelectorAll('.meal-item').forEach(el => {
    el.addEventListener('click', () => toggleMeal(el.dataset.meal));
  });
}

// ============================================
// Build — Aba SEMANA
// ============================================

function buildSemana() {
  const el = document.getElementById('tab-semana');
  el.innerHTML = `
    <!-- Streak + 7 dias -->
    <div class="streak-box">
      <div class="streak-num" id="streak-num">0</div>
      <div class="streak-label">dias consecutivos (score ≥ 7)</div>
    </div>
    <div class="card">
      <div class="card-title">Últimos 7 dias <span style="font-size:11px;color:var(--muted)">(clique para ir ao dia)</span></div>
      <div class="week-grid" id="week-grid"></div>
    </div>

    <!-- Calendário mensal -->
    <div class="card">
      <div class="cal-nav">
        <button class="cal-nav-btn" id="prev-month">‹</button>
        <span class="cal-month-label" id="cal-month-label"></span>
        <button class="cal-nav-btn" id="next-month">›</button>
      </div>
      <div class="cal-grid" id="cal-grid"></div>
      <div class="cal-legend">
        <span class="cal-xp green">20+</span> Ótimo
        <span class="cal-xp amber" style="margin-left:8px">8+</span> Ok
        <span class="cal-xp red" style="margin-left:8px">0+</span> Fraco
        <span style="color:var(--muted);margin-left:8px">— sem dados</span>
      </div>
    </div>

    <!-- Peso -->
    <div class="card">
      <div class="card-title">Registrar peso</div>
      <div class="weight-form">
        <input type="number" id="weight-input" class="weight-input" placeholder="Ex: 89.5" step="0.1" min="40" max="200">
        <button class="btn-save" id="btn-save-weight">Salvar</button>
      </div>
      <ul class="weight-history" id="weight-history"></ul>
    </div>
    <div class="goal-box">
      <div class="goal-header">
        <span class="goal-label">Meta de peso</span>
        <span class="goal-vals"><span id="goal-current">—</span> → 82 kg</span>
      </div>
      <div class="goal-bar"><div class="goal-fill" id="goal-fill" style="width:0%"></div></div>
    </div>

    <!-- Configurar blocos por dia -->
    <div class="card" style="margin-top:10px">
      <div class="card-title">Configurar blocos por dia da semana</div>
      <div class="schedule-wrap">
        <table class="schedule-table" id="schedule-table">
          <thead>
            <tr>
              <th>Bloco</th>
              ${DAY_SHORT.map(d => `<th>${d}</th>`).join('')}
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>`;

  el.querySelector('#btn-save-weight').addEventListener('click', handleSaveWeight);
  el.querySelector('#prev-month').addEventListener('click', () => navigateMonth(-1));
  el.querySelector('#next-month').addEventListener('click', () => navigateMonth(1));
}

// ============================================
// Init
// ============================================

async function init() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = '/login'; return; }
  currentUser = session.user;

  // Header
  updateHeaderDate();

  // Build tabs
  buildHoje();
  buildComida();
  buildSemana();

  // Tab buttons
  document.querySelectorAll('.tab-btn').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
  document.querySelectorAll('.nav-btn').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));

  // Header navigation
  document.getElementById('prev-day').addEventListener('click', () => navigateDay(-1));
  document.getElementById('next-day').addEventListener('click', () => navigateDay(1));
  document.getElementById('btn-goto-today').addEventListener('click', goToToday);
  document.getElementById('btn-logout').addEventListener('click', logout);

  // Carrega dados
  await loadAllForDate(state.viewDate);
  await loadMonthData(state.calYear, state.calMonth);

  // Render inicial
  updateXpUI();
  renderHoje();
  renderComida();
  renderTreino();
  renderSchedule();

  sb.auth.onAuthStateChange(event => {
    if (event === 'SIGNED_OUT') window.location.href = '/login';
  });
}

document.addEventListener('DOMContentLoaded', init);
