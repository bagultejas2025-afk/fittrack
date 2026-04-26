// ── App State ─────────────────────────────────────────────────────────────────
const state = {
  user:     null,   // { name, gender, age, height, weight, activity, goal }
  plan:     null,   // workout plan
  diet:     null,   // diet plan
  session:  null,   // active workout session
};

// ── Onboarding ─────────────────────────────────────────────────────────────────
let selectedGender   = 'male';
let selectedActivity = null;
let selectedGoal     = null;

function pickGender(btn) {
  document.querySelectorAll('.toggle').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedGender = btn.dataset.gender;
}

function pickOption(el, listId) {
  document.querySelectorAll(`#${listId} .option-card, #${listId} .goal-card`)
    .forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  if (listId === 'activityList') selectedActivity = el.dataset.value;
  if (listId === 'goalList')     selectedGoal     = el.dataset.value;
}

function goStep(from, to) {
  // Validate current step
  if (from === 1) {
    const name = document.getElementById('inp-name').value.trim();
    const age  = parseInt(document.getElementById('inp-age').value);
    if (!name)          return alert('Please enter your name.');
    if (!age || age<10) return alert('Please enter a valid age.');
  }
  if (from === 2) {
    const h = parseFloat(document.getElementById('inp-height').value);
    const w = parseFloat(document.getElementById('inp-weight').value);
    if (!h || h < 100)  return alert('Please enter a valid height (cm).');
    if (!w || w < 30)   return alert('Please enter a valid weight (kg).');
    // Show BMI preview
    const { bmi, cat } = calcBMI(w, h);
    document.getElementById('bmiNum').textContent = bmi;
    document.getElementById('bmiCat').textContent = cat;
    document.getElementById('bmiBadge').classList.remove('hidden');
  }
  if (from === 3 && !selectedActivity) return alert('Please select your activity level.');

  document.getElementById(`step${from}`).classList.remove('active');
  document.getElementById(`step${to}`).classList.add('active');

  const pct = (to / 4) * 100;
  document.getElementById('stepFill').style.width  = pct + '%';
  document.getElementById('stepLabel').textContent = `Step ${to} of 4`;
}

function generatePlan() {
  if (!selectedGoal) return alert('Please select a fitness goal.');

  const name     = document.getElementById('inp-name').value.trim();
  const age      = parseInt(document.getElementById('inp-age').value);
  const height   = parseFloat(document.getElementById('inp-height').value);
  const weight   = parseFloat(document.getElementById('inp-weight').value);

  state.user = { name, gender: selectedGender, age, height, weight, activity: selectedActivity, goal: selectedGoal };
  state.plan = getWorkoutPlan(selectedGoal);
  state.diet = buildDietPlan(state.user);

  renderDashboard();
  showScreen('screen-dashboard');
}

// ── Dashboard ──────────────────────────────────────────────────────────────────
function renderDashboard() {
  const { user, plan, diet } = state;
  document.getElementById('topbarUser').textContent = `Hi, ${user.name} 👋`;

  // Stats strip
  const { bmi, cat } = calcBMI(user.weight, user.height);
  document.getElementById('statsStrip').innerHTML = `
    <div class="stat-chip">
      <div class="sc-label">Weight</div>
      <div class="sc-val">${user.weight}<span class="sc-unit"> kg</span></div>
    </div>
    <div class="stat-chip">
      <div class="sc-label">Height</div>
      <div class="sc-val">${user.height}<span class="sc-unit"> cm</span></div>
    </div>
    <div class="stat-chip">
      <div class="sc-label">BMI</div>
      <div class="sc-val">${bmi}<span class="sc-unit"> (${cat})</span></div>
    </div>
    <div class="stat-chip">
      <div class="sc-label">Daily Target</div>
      <div class="sc-val">${diet.target}<span class="sc-unit"> kcal</span></div>
    </div>
    <div class="stat-chip">
      <div class="sc-label">Goal</div>
      <div class="sc-val" style="font-size:14px">${plan.title}</div>
    </div>
  `;

  // Today's workout
  const today = getTodaySchedule(user.goal);
  const dayName = DAYS[new Date().getDay()];
  document.getElementById('todayChip').textContent = `${dayName} – ${today.label}`;

  if (today.rest) {
    document.getElementById('todayExercises').innerHTML = `
      <div class="ex-row"><span class="ex-row-icon">😴</span>
        <span class="ex-row-name">Rest Day</span>
        <span class="ex-row-meta">Recovery is part of training</span>
      </div>`;
    document.querySelector('.btn-start').style.display = 'none';
  } else {
    document.getElementById('todayExercises').innerHTML = today.exercises.map(e => `
      <div class="ex-row">
        <span class="ex-row-icon">${e.icon}</span>
        <span class="ex-row-name">${e.name}</span>
        <span class="ex-row-meta">${e.sets}×${e.reps || e.label || 'reps'}</span>
        ${e.tracked ? '<span class="ex-row-badge">📷 AI Tracked</span>' : ''}
      </div>`).join('');
    document.querySelector('.btn-start').style.display = 'block';
  }

  // Weekly schedule — auto-open today
  selectedWeekDay = new Date().getDay();
  renderWeekGrid();
  renderWeekDayDetail();

  // Diet tab – calorie summary banner
  const diffAbs   = Math.abs(diet.diff);
  const diffSign  = diet.diff > 0 ? '+' : diet.diff < 0 ? '−' : '';
  const diffColor = diet.diff < 0 ? 'var(--red)' : diet.diff > 0 ? 'var(--green)' : 'var(--muted)';
  const arrowIcon = diet.diff < 0 ? '📉' : diet.diff > 0 ? '📈' : '⚖️';

  const calSummaryHTML = `
    <div class="cal-summary-card">
      <div class="cal-summary-header">
        <span class="cal-summary-icon">${arrowIcon}</span>
        <div>
          <div class="cal-summary-label">Calorie Strategy – <em>${diet.label}</em></div>
          <div class="cal-summary-desc">${diet.goalDesc}</div>
        </div>
      </div>
      <div class="cal-summary-row">
        <div class="cal-col">
          <div class="cal-col-label">Current Intake<br><small>(Maintenance / TDEE)</small></div>
          <div class="cal-col-val">${diet.tdee} <span>kcal</span></div>
        </div>
        <div class="cal-arrow" style="color:${diffColor}">
          ${diet.diff !== 0 ? `${diffSign}${diffAbs} kcal` : '='}
        </div>
        <div class="cal-col highlight">
          <div class="cal-col-label">Daily Target<br><small>(To reach your goal)</small></div>
          <div class="cal-col-val" style="color:${diffColor}">${diet.target} <span>kcal</span></div>
        </div>
      </div>
    </div>
  `;

  // Meal plan actual totals — derived from food item data, not formula
  const planTotalsHTML = `
    <div class="plan-totals-card">
      <div class="plan-totals-header">
        <span class="plan-totals-title">📊 Your Meal Plan Provides (all 4 meals)</span>
        <span class="plan-totals-note">Numbers reflect actual food items in the plan below</span>
      </div>
      <div class="plan-totals-row">
        <div class="plan-col veg-col">
          <div class="plan-col-badge">🥦 Full Veg Day</div>
          <div class="plan-col-main">${diet.vegTotal.kcal} <span>kcal</span></div>
          <div class="plan-col-sub">${diet.vegTotal.protein}g protein</div>
        </div>
        <div class="plan-divider">vs</div>
        <div class="plan-col nonveg-col">
          <div class="plan-col-badge">🍗 Full Non-Veg Day</div>
          <div class="plan-col-main">${diet.nonVegTotal.kcal} <span>kcal</span></div>
          <div class="plan-col-sub">${diet.nonVegTotal.protein}g protein</div>
        </div>
      </div>
      <div class="plan-totals-tip">
        ℹ️ Mix veg and non-veg meals freely — toggle each meal card below independently.
      </div>
    </div>
  `;

  document.getElementById('dietMacros').innerHTML = calSummaryHTML + planTotalsHTML;

  document.getElementById('mealsList').innerHTML = diet.meals.map((m, mi) => `
    <div class="meal-card" id="meal-${mi}">
      <div class="meal-head">
        <div>
          <div class="meal-label">${m.label}</div>
          <div class="meal-target">${m.veg.total.kcal}–${m.nonVeg.total.kcal} kcal · ${m.veg.total.protein}–${m.nonVeg.total.protein}g protein</div>
        </div>
        <div class="meal-type-toggle">
          <button class="mtype-btn active" onclick="switchMealType(${mi},'veg')"  id="mt-veg-${mi}">🥦 Veg</button>
          <button class="mtype-btn"        onclick="switchMealType(${mi},'nonveg')" id="mt-nv-${mi}">🍗 Non-Veg</button>
        </div>
      </div>

      <!-- Veg option -->
      <div class="meal-option" id="mopt-veg-${mi}">
        <div class="meal-option-name">${m.veg.name}</div>
        <div class="meal-items-table">
          <div class="mit-header">
            <span>Food Item</span><span>Kcal</span><span>Protein</span>
          </div>
          ${m.veg.items.map(it => `
            <div class="mit-row">
              <span class="mit-name">${it.name}</span>
              <span class="mit-kcal">${it.kcal}</span>
              <span class="mit-prot">${it.protein}g</span>
            </div>`).join('')}
          <div class="mit-total">
            <span>Total</span>
            <span>${m.veg.total.kcal} kcal</span>
            <span>${m.veg.total.protein}g protein</span>
          </div>
        </div>
      </div>

      <!-- Non-veg option -->
      <div class="meal-option hidden" id="mopt-nv-${mi}">
        <div class="meal-option-name">${m.nonVeg.name}</div>
        <div class="meal-items-table">
          <div class="mit-header">
            <span>Food Item</span><span>Kcal</span><span>Protein</span>
          </div>
          ${m.nonVeg.items.map(it => `
            <div class="mit-row">
              <span class="mit-name">${it.name}</span>
              <span class="mit-kcal">${it.kcal}</span>
              <span class="mit-prot">${it.protein}g</span>
            </div>`).join('')}
          <div class="mit-total">
            <span>Total</span>
            <span>${m.nonVeg.total.kcal} kcal</span>
            <span>${m.nonVeg.total.protein}g protein</span>
          </div>
        </div>
      </div>
    </div>`).join('');
}

function switchMealType(idx, type) {
  const isVeg = type === 'veg';
  document.getElementById(`mopt-veg-${idx}`).classList.toggle('hidden',  !isVeg);
  document.getElementById(`mopt-nv-${idx}`).classList.toggle('hidden',    isVeg);
  document.getElementById(`mt-veg-${idx}`).classList.toggle('active',    isVeg);
  document.getElementById(`mt-nv-${idx}`).classList.toggle('active',    !isVeg);
}

function showTab(name, btn) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${name}`).classList.add('active');
  btn.classList.add('active');
}

// ── Weekly schedule toggle ─────────────────────────────────────────────────────
let selectedWeekDay = null;

function renderWeekGrid() {
  const { plan } = state;
  const todayIdx = new Date().getDay();
  document.getElementById('weekGrid').innerHTML = plan.schedule.map((day, i) => `
    <div class="day-cell ${i === todayIdx ? 'today' : ''} ${day.rest ? 'rest' : ''} ${selectedWeekDay === i ? 'selected' : ''}"
         onclick="toggleWeekDay(${i})">
      <div class="dc-day">${DAYS[i]}</div>
      <div class="dc-name">${day.rest ? 'Rest' : day.label}</div>
      ${!day.rest ? '<div class="dc-dot"></div>' : ''}
    </div>`).join('');
}

function toggleWeekDay(idx) {
  selectedWeekDay = selectedWeekDay === idx ? null : idx;
  renderWeekGrid();
  renderWeekDayDetail();
}

function renderWeekDayDetail() {
  const detail = document.getElementById('weekDayDetail');
  if (selectedWeekDay === null) {
    detail.classList.add('hidden');
    return;
  }
  const day     = state.plan.schedule[selectedWeekDay];
  const dayName = DAYS[selectedWeekDay];
  const isToday = selectedWeekDay === new Date().getDay();

  if (day.rest) {
    detail.innerHTML = `
      <div class="wdd-header">
        <span class="wdd-day">${dayName}</span>
        <span class="wdd-label">Rest Day</span>
        ${isToday ? '<span class="wdd-today-badge">Today</span>' : ''}
      </div>
      <div class="wdd-rest">😴 Recovery day — light stretching and walking recommended</div>`;
  } else {
    detail.innerHTML = `
      <div class="wdd-header">
        <span class="wdd-day">${dayName}</span>
        <span class="wdd-label">${day.label}</span>
        ${isToday ? '<span class="wdd-today-badge">Today</span>' : ''}
        <span class="wdd-count">${day.exercises.length} exercises</span>
      </div>
      <div class="wdd-exercises">
        ${day.exercises.map(e => `
          <div class="wdd-ex">
            <span class="wdd-ex-icon">${e.icon}</span>
            <span class="wdd-ex-name">${e.name}</span>
            <span class="wdd-ex-meta">${e.sets}×${e.reps || e.label || 'reps'}</span>
            ${e.tracked ? '<span class="wdd-ex-badge">📷 AI</span>' : ''}
          </div>`).join('')}
      </div>`;
  }
  detail.classList.remove('hidden');
}

// ── Workout Session ────────────────────────────────────────────────────────────
let tracker = null;
let clockInterval = null;
let restInterval  = null;
let sessionStart  = null;

function startWorkout() {
  const today = getTodaySchedule(state.user.goal);
  if (today.rest || !today.exercises?.length) return;

  state.session = {
    exercises:   today.exercises.map(e => ({ ...e })),
    currentIdx:  0,
    currentSet:  1,
    reps:        0,
    completed:   [],
    totalReps:   0,
  };

  showScreen('screen-workout');
  document.getElementById('sessionTitle').textContent = today.label;

  // Start session clock
  sessionStart = Date.now();
  clearInterval(clockInterval);
  clockInterval = setInterval(updateClock, 1000);

  // Setup tracker
  const videoEl  = document.getElementById('videoEl');
  const canvasEl = document.getElementById('poseCanvas');
  tracker = new PoseTracker(videoEl, canvasEl);

  tracker.onRep = (reps) => {
    state.session.reps = reps;
    document.getElementById('statReps').textContent = reps;
    const target = currentExercise().reps;
    if (target && reps >= target) {
      autoCompleteSet();
    }
  };

  tracker.onFeedback = (text, level) => {
    const dot  = document.querySelector('#feedbackBar .fb-dot');
    dot.className = `fb-dot ${level}`;
    document.getElementById('fbText').textContent = text;
  };

  tracker.onAngle = (angle, pct) => {
    const row = document.getElementById('angleRow');
    row.classList.remove('hidden');
    document.getElementById('angleLabel').textContent = angle + '°';
    document.getElementById('angleThumb').style.left = (pct * 100) + '%';
  };

  loadExercise();
  tracker.start().then(() => {
    document.getElementById('camInit').style.display = 'none';
  }).catch(() => {
    document.getElementById('camInitMsg').textContent = 'Camera unavailable – manual tracking mode';
  });
}

function currentExercise() {
  return state.session.exercises[state.session.currentIdx];
}

function loadExercise() {
  const sess = state.session;
  const ex   = currentExercise();

  document.getElementById('exName').textContent   = ex.name;
  document.getElementById('statSet').textContent  = `${sess.currentSet}/${ex.sets}`;
  document.getElementById('statReps').textContent = '0';
  document.getElementById('statTarget').textContent = ex.reps ? `/${ex.reps}` : (ex.label || '');
  document.getElementById('statRest').textContent  = `${ex.rest}s`;

  // Reset tracker for new exercise
  if (tracker) {
    tracker.setExercise(ex.key);
    tracker.resetReps();
  }
  sess.reps = 0;

  // Show/hide angle bar
  const hasTracking = ex.tracked && getExerciseConfig(ex.key);
  document.getElementById('angleRow').classList.toggle('hidden', !hasTracking);

  // Feedback
  if (!ex.tracked) {
    document.querySelector('#feedbackBar .fb-dot').className = 'fb-dot neutral';
    document.getElementById('fbText').textContent = 'Tap "Complete Set" when done';
  }

  renderQueue();
}

function renderQueue() {
  const { exercises, currentIdx } = state.session;
  document.getElementById('exQueueList').innerHTML = exercises.map((e, i) => {
    const cls = i < currentIdx ? 'done' : i === currentIdx ? 'current' : '';
    const mark = i < currentIdx ? '✓' : i + 1;
    return `
      <div class="queue-item ${cls}">
        <div class="qi-num">${mark}</div>
        <div class="qi-name">${e.name}</div>
        <div class="qi-meta">${e.sets}×${e.reps || e.label || ''}</div>
      </div>`;
  }).join('');
}

let autoCompleteDebounce = null;
function autoCompleteSet() {
  if (autoCompleteDebounce) return;
  autoCompleteDebounce = setTimeout(() => {
    autoCompleteDebounce = null;
    completeSet();
  }, 800);
}

function completeSet() {
  const sess = state.session;
  const ex   = currentExercise();

  sess.totalReps += sess.reps || ex.reps || 0;
  sess.completed.push({ name: ex.name, set: sess.currentSet, reps: sess.reps || ex.reps || 0 });

  if (sess.currentSet < ex.sets) {
    sess.currentSet++;
    startRest(ex.rest);
  } else {
    sess.currentSet = 1;
    nextExercise();
  }
}

function nextExercise() {
  const sess = state.session;
  sess.currentIdx++;

  if (sess.currentIdx >= sess.exercises.length) {
    finishSession();
    return;
  }
  loadExercise();
}

function skipExercise() {
  state.session.currentIdx++;
  if (state.session.currentIdx >= state.session.exercises.length) {
    finishSession();
    return;
  }
  state.session.currentSet = 1;
  loadExercise();
}

// ── Rest timer ─────────────────────────────────────────────────────────────────
function startRest(seconds) {
  const overlay = document.getElementById('restOverlay');
  overlay.style.display = 'flex';
  let remaining = seconds;
  document.getElementById('restCount').textContent = remaining;

  clearInterval(restInterval);
  restInterval = setInterval(() => {
    remaining--;
    document.getElementById('restCount').textContent = remaining;
    if (remaining <= 0) endRest();
  }, 1000);
}

function endRest() {
  clearInterval(restInterval);
  document.getElementById('restOverlay').style.display = 'none';
  if (tracker) { tracker.resetReps(); }
  state.session.reps = 0;
  document.getElementById('statReps').textContent = '0';
  document.getElementById('statSet').textContent =
    `${state.session.currentSet}/${currentExercise().sets}`;
}

function skipRest() { endRest(); }

// ── Session clock ──────────────────────────────────────────────────────────────
function updateClock() {
  const elapsed = Math.floor((Date.now() - sessionStart) / 1000);
  const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const s = String(elapsed % 60).padStart(2, '0');
  document.getElementById('sessionClock').textContent = `${m}:${s}`;
}

// ── Finish session ─────────────────────────────────────────────────────────────
function finishSession() {
  clearInterval(clockInterval);
  const elapsed = Math.floor((Date.now() - sessionStart) / 1000);
  const m = Math.floor(elapsed / 60), s = elapsed % 60;

  const sumHTML = `
    <strong>Duration:</strong> ${m}m ${s}s<br>
    <strong>Exercises:</strong> ${state.session.exercises.length}<br>
    <strong>Total Reps:</strong> ${state.session.totalReps}<br>
    <strong>Sets Completed:</strong> ${state.session.completed.length}
  `;
  document.getElementById('doneSummary').innerHTML = sumHTML;
  document.getElementById('doneOverlay').style.display = 'flex';
}

function finishWorkout() {
  document.getElementById('doneOverlay').style.display = 'none';
  cleanupSession();
  showScreen('screen-dashboard');
}

function exitWorkout() {
  if (confirm('Exit this workout session?')) {
    clearInterval(clockInterval);
    clearInterval(restInterval);
    cleanupSession();
    showScreen('screen-dashboard');
  }
}

function cleanupSession() {
  if (tracker) { tracker.stop(); tracker = null; }
  clearInterval(clockInterval);
  clearInterval(restInterval);
  document.getElementById('restOverlay').style.display = 'none';
  document.getElementById('doneOverlay').style.display = 'none';
}

// ── Screen navigation ──────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ── BMI preview during onboarding ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const hEl = document.getElementById('inp-height');
  const wEl = document.getElementById('inp-weight');
  function updateBMI() {
    const h = parseFloat(hEl.value), w = parseFloat(wEl.value);
    if (h > 100 && w > 30) {
      const { bmi, cat } = calcBMI(w, h);
      document.getElementById('bmiNum').textContent = bmi;
      document.getElementById('bmiCat').textContent = cat;
      document.getElementById('bmiBadge').classList.remove('hidden');
    }
  }
  if (hEl) hEl.addEventListener('input', updateBMI);
  if (wEl) wEl.addEventListener('input', updateBMI);
});
