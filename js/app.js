// ── App State ─────────────────────────────────────────────────────────────────
const state = {
  user:     null,
  plan:     null,
  diet:     null,
  session:  null,
};

// ── Voice Coach ────────────────────────────────────────────────────────────────
const NUM_WORDS = ['','one','two','three','four','five','six','seven','eight','nine','ten',
  'eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty',
  'twenty one','twenty two','twenty three','twenty four','twenty five',
  'twenty six','twenty seven','twenty eight','twenty nine','thirty',
  'thirty one','thirty two','thirty three','thirty four','thirty five',
  'thirty six','thirty seven','thirty eight','thirty nine','forty'];

const EX_TIPS = {
  squat:          'Feet shoulder width apart, chest up, and drive through your heels.',
  pushup:         'Hands under your shoulders, core tight, body in one straight line.',
  lunge:          'Step forward and keep that front knee above your ankle, not past your toes.',
  jumpingJack:    'Stay light on your feet and find a nice steady rhythm.',
  bicepCurl:      'Pin your elbows to your sides and control the whole movement.',
  shoulderPress:  'Brace your core and press straight overhead. No arching your back.',
  calfRaise:      'Full range of motion. All the way up and squeeze hard at the top.',
  highKnees:      'Drive those knees up to hip height and pump your arms with energy.',
  plank:          'Flat back, hips level, breathe steadily and hold strong.',
  deadlift:       'Hinge at the hips, keep your back flat, and push the floor away as you stand.',
  benchPress:     'Retract your shoulder blades and lower the bar to your chest with control.',
  pullUp:         'Start from a dead hang and drive your elbows down to pull yourself up.',
  row:            'Keep your back flat and pull the weight towards your hip.',
  latPulldown:    'Lean back slightly, pull to your upper chest, and squeeze your lats.',
  tricepDip:      'Keep your body close to the bench and lower until elbows hit ninety degrees.',
  lateralRaise:   'Slight bend in the elbows, raise to shoulder height, control the descent.',
  mountainClimber:'Keep your hips down, core tight, and drive those knees fast.',
  burpee:         'Explosive movement, land softly, and keep a steady pace throughout.',
  default:        'Focus on your form, stay controlled, and give it everything you have.',
};

const MOTIVATE = [
  "You're doing great, keep it up!",
  "Stay strong, you've got this!",
  "Looking good, push through!",
  "Excellent work, keep that form!",
  "Don't slow down, you're crushing it!",
  "Breathe and push, you have more in you!",
  "Awesome work, stay focused!",
  "Keep that energy going, almost there!",
  "Come on, dig deep!",
  "That is the spirit, keep moving!",
];

const FINISH_LINES = [
  "Incredible work! You have completed your workout. That is what champions are made of!",
  "Workout done! You absolutely crushed it today. Recovery starts now, great job.",
  "Amazing effort! Every single rep made you stronger. Be proud of that!",
  "That is a wrap! Fantastic session. Rest up and come back even stronger tomorrow.",
];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const Coach = (() => {
  let _voices   = [];
  let _lastForm = 0;
  let _lastRep  = 0;
  const FORM_GAP = 5000;

  function loadVoices() { _voices = window.speechSynthesis.getVoices(); }
  if (window.speechSynthesis) {
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }

  function bestVoice() {
    return _voices.find(v => v.name === 'Google UK English Female') ||
           _voices.find(v => v.name === 'Google US English')         ||
           _voices.find(v => v.lang === 'en-US' && !v.localService)  ||
           _voices.find(v => v.lang === 'en-US')                     ||
           _voices.find(v => v.lang && v.lang.startsWith('en'))      ||
           null;
  }

  function say(text, opts = {}) {
    if (!window.speechSynthesis) return;
    if (opts.interrupt !== false) window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    const u    = new SpeechSynthesisUtterance(text);
    u.voice    = bestVoice();
    u.rate     = opts.rate  ?? 1.05;
    u.pitch    = opts.pitch ?? 1.0;
    u.volume   = 1.0;
    window.speechSynthesis.speak(u);
  }

  function formCue(text) {
    const now = Date.now();
    if (now - _lastForm < FORM_GAP) return;
    _lastForm = now;
    const clean = text.replace(/^[⚠✓]\s*/, '').trim();
    say(clean, { interrupt: false, rate: 0.95 });
  }

  function repCount(n, target) {
    if (n <= _lastRep) return;
    _lastRep = n;
    const word = NUM_WORDS[n] || String(n);
    if (target && n === target) {
      say(`${word}! Great set!`, { rate: 1.1 });
    } else if (target && n === target - 1) {
      say(`${word}! One more!`, { rate: 1.1 });
    } else if (target && n === Math.floor(target / 2) && n > 1) {
      say(`${word}! Halfway there, keep pushing!`, { rate: 1.0 });
    } else if (!target && n > 0 && n % 5 === 0) {
      say(`${word}! ${rand(MOTIVATE)}`, { rate: 1.05 });
    } else {
      say(word, { rate: 1.2 });
    }
  }

  function resetReps() { _lastRep = 0; }

  function stop() { if (window.speechSynthesis) window.speechSynthesis.cancel(); }

  return { say, formCue, repCount, resetReps, stop };
})();

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
    Coach.repCount(reps, target);
    if (target && reps >= target) {
      autoCompleteSet();
    }
  };

  tracker.onFeedback = (text, level) => {
    const dot  = document.querySelector('#feedbackBar .fb-dot');
    dot.className = `fb-dot ${level}`;
    document.getElementById('fbText').textContent = text;
    if (level === 'warn' || level === 'bad') Coach.formCue(text);
  };

  tracker.onAngle = (angle, pct) => {
    const row = document.getElementById('angleRow');
    row.classList.remove('hidden');
    document.getElementById('angleLabel').textContent = angle + '°';
    document.getElementById('angleThumb').style.left = (pct * 100) + '%';
  };

  loadExercise();
  const firstEx = state.session.exercises[0];
  const firstTip = EX_TIPS[firstEx.key] || EX_TIPS.default;
  Coach.say(`Let's go! Today's workout is ${today.label}. Starting with ${firstEx.name}. ${firstTip}`);

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

  // Announce exercise for all except the very first (startWorkout handles that one)
  if (sess.currentIdx > 0) {
    const tip = EX_TIPS[ex.key] || EX_TIPS.default;
    Coach.say(`Next up, ${ex.name}. ${tip}`, { interrupt: true });
  }
  Coach.resetReps();

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
  Coach.say(`Good set! Rest for ${seconds} seconds.`, { interrupt: true });
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
  Coach.resetReps();
  const sess = state.session;
  const ex   = currentExercise();
  Coach.say(`Set ${sess.currentSet} of ${ex.sets}. Let's go!`, { interrupt: true });
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
  Coach.say(rand(FINISH_LINES), { interrupt: true });
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
  Coach.stop();
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
