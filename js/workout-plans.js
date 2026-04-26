// ── Workout plan definitions & diet calculator ────────────────────────────────

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ── BMR / TDEE ────────────────────────────────────────────────────────────────
function calcTDEE(user) {
  const { weight, height, age, gender, activity } = user;
  // Mifflin-St Jeor
  let bmr = 10 * weight + 6.25 * height - 5 * age;
  bmr += gender === 'male' ? 5 : -161;

  const mult = { sedentary:1.2, light:1.375, moderate:1.55, active:1.725 };
  return Math.round(bmr * (mult[activity] || 1.2));
}

function calcBMI(weight, height) {
  const h = height / 100;
  const bmi = weight / (h * h);
  let cat;
  if (bmi < 18.5)       cat = 'Underweight';
  else if (bmi < 25)    cat = 'Normal';
  else if (bmi < 30)    cat = 'Overweight';
  else                  cat = 'Obese';
  return { bmi: bmi.toFixed(1), cat };
}

// ── Diet plan generator ───────────────────────────────────────────────────────
function buildDietPlan(user) {
  const tdee = calcTDEE(user);
  let target, label;

  switch (user.goal) {
    case 'weightLoss': target = tdee - 500; label = 'Caloric Deficit (−500 kcal)'; break;
    case 'weightGain': target = tdee + 500; label = 'Caloric Surplus (+500 kcal)'; break;
    default:           target = tdee;       label = 'Maintenance'; break;
  }

  const diff = target - tdee;

  const goalDescriptions = {
    weightLoss:  'Lose weight by eating 500 kcal below your maintenance each day, creating a steady fat-loss deficit.',
    weightGain:  'Build muscle by eating 500 kcal above your maintenance each day to fuel growth and recovery.',
    fullBody:    'Maintain your current weight while fuelling full-body training at your maintenance calories.',
    eachMuscle:  'Maintain your current weight while fuelling targeted muscle training at your maintenance calories.',
  };

  const meals = buildMeals(user.goal);

  // Derive protein & calorie totals directly from meal items — single source of truth
  const vegTotal = meals.reduce(
    (a, m) => ({ kcal: a.kcal + m.veg.total.kcal, protein: a.protein + m.veg.total.protein }),
    { kcal: 0, protein: 0 }
  );
  const nonVegTotal = meals.reduce(
    (a, m) => ({ kcal: a.kcal + m.nonVeg.total.kcal, protein: a.protein + m.nonVeg.total.protein }),
    { kcal: 0, protein: 0 }
  );

  return { tdee, target, diff, label, goalDesc: goalDescriptions[user.goal] || '', vegTotal, nonVegTotal, meals };
}

// ── Indian meal database ──────────────────────────────────────────────────────
// Protein targets per day (from actual items):
//   Weight Loss  → Veg ~111g / Non-veg ~127g  | ~1460 kcal / ~1440 kcal
//   Weight Gain  → Veg ~138g / Non-veg ~186g  | ~3105 kcal / ~2924 kcal
//   Default      → Veg  ~95g / Non-veg ~111g  | ~1935 kcal / ~1815 kcal

const INDIAN_MEALS = {

  // ── BREAKFAST ──────────────────────────────────────────────────────────────
  breakfast: {
    weightLoss: [
      { type:'veg', name:'Moong Dal Chilla + Hung Curd + Green Tea',
        items:[
          { name:'3 Moong Dal Chilla (with green chilli & coriander)', kcal:180, protein:12 },
          { name:'150g hung curd / thick dahi (low-fat)',              kcal:120, protein:13 },
          { name:'1 cup green tea (no sugar)',                          kcal:5,   protein:0  },
        ]},
      { type:'non-veg', name:'Egg White Omelette + Brown Bread + Black Coffee',
        items:[
          { name:'4 egg whites omelette (spinach & onion)',            kcal:120, protein:20 },
          { name:'2 slices brown bread',                               kcal:140, protein:6  },
          { name:'1 tsp olive oil / ghee (cooking)',                   kcal:45,  protein:0  },
          { name:'1 cup black coffee (no sugar)',                      kcal:5,   protein:0  },
        ]},
    ],
    weightGain: [
      { type:'veg', name:'Paneer Paratha + Curd + Full-fat Milk',
        items:[
          { name:'2 Paneer Parathas (whole wheat, desi ghee)',         kcal:420, protein:18 },
          { name:'150g full-fat curd with jaggery',                    kcal:130, protein:5  },
          { name:'1 glass full-fat milk (250 ml)',                     kcal:150, protein:8  },
        ]},
      { type:'non-veg', name:'Egg Bhurji + Whole-wheat Paratha + Milk',
        items:[
          { name:'3 whole eggs bhurji (desi ghee, onion, tomato)',     kcal:270, protein:21 },
          { name:'2 whole-wheat parathas',                             kcal:300, protein:8  },
          { name:'1 glass full-fat milk (250 ml)',                     kcal:150, protein:8  },
        ]},
    ],
    default: [
      { type:'veg', name:'Besan Chilla + Poha + Masala Chai',
        items:[
          { name:'2 Besan (chickpea flour) Chilla',                    kcal:180, protein:10 },
          { name:'1 cup Poha with peas & peanuts',                     kcal:200, protein:5  },
          { name:'1 cup masala chai (less sugar)',                     kcal:60,  protein:2  },
        ]},
      { type:'non-veg', name:'2-Egg Omelette + Upma + Masala Chai',
        items:[
          { name:'2-egg omelette (onion, tomato, green chilli)',       kcal:180, protein:14 },
          { name:'1 cup Upma (semolina, veggies)',                     kcal:180, protein:5  },
          { name:'1 cup masala chai',                                  kcal:60,  protein:2  },
        ]},
    ],
  },

  // ── LUNCH ──────────────────────────────────────────────────────────────────
  lunch: {
    weightLoss: [
      { type:'veg', name:'Masoor Dal + Soya Chunks + Brown Rice + Salad',
        items:[
          { name:'1 cup Masoor Dal (no ghee tadka)',                   kcal:150, protein:12 },
          { name:'50g dry soya chunks, cooked (~150g)',                kcal:175, protein:26 },
          { name:'100g cooked brown rice',                             kcal:110, protein:3  },
          { name:'Cucumber-tomato-onion salad',                        kcal:40,  protein:1  },
        ]},
      { type:'non-veg', name:'Chicken Breast Curry + Roti + Salad',
        items:[
          { name:'150g chicken breast curry (light tomato gravy)',     kcal:250, protein:35 },
          { name:'2 whole-wheat rotis',                                kcal:160, protein:5  },
          { name:'Cucumber-tomato-onion salad',                        kcal:40,  protein:1  },
        ]},
    ],
    weightGain: [
      { type:'veg', name:'Rajma + Paneer Bhurji + Rice + Roti',
        items:[
          { name:'1.5 cups Rajma curry',                               kcal:270, protein:14 },
          { name:'100g Paneer bhurji (desi ghee)',                     kcal:265, protein:18 },
          { name:'200g cooked white rice',                             kcal:220, protein:4  },
          { name:'2 whole-wheat rotis',                                kcal:160, protein:5  },
        ]},
      { type:'non-veg', name:'Chicken Curry + Rice + Toor Dal + Ghee',
        items:[
          { name:'200g Chicken curry (bone-in, masala)',               kcal:380, protein:50 },
          { name:'200g cooked white rice',                             kcal:220, protein:4  },
          { name:'1 cup Toor Dal with ghee tadka',                     kcal:180, protein:10 },
          { name:'1 tbsp desi ghee (on roti)',                         kcal:112, protein:0  },
        ]},
    ],
    default: [
      { type:'veg', name:'Dal Tadka + Soya Chunks + Rice + Sabzi + Roti',
        items:[
          { name:'1 cup Dal Tadka (toor/chana dal)',                   kcal:180, protein:10 },
          { name:'40g dry soya chunks, cooked',                        kcal:140, protein:20 },
          { name:'150g cooked rice',                                   kcal:165, protein:3  },
          { name:'1 cup Aloo Gobi / Bhindi sabzi',                    kcal:110, protein:3  },
          { name:'1 whole-wheat roti',                                 kcal:80,  protein:3  },
        ]},
      { type:'non-veg', name:'Egg Curry + Rice + Roti + Salad',
        items:[
          { name:'3 boiled eggs in masala curry',                      kcal:310, protein:22 },
          { name:'150g cooked rice',                                   kcal:165, protein:3  },
          { name:'2 whole-wheat rotis',                                kcal:160, protein:5  },
          { name:'Mixed green salad',                                  kcal:30,  protein:1  },
        ]},
    ],
  },

  // ── EVENING SNACK ──────────────────────────────────────────────────────────
  snack: {
    weightLoss: [
      { type:'veg', name:'Apple + Roasted Chana + Low-fat Curd',
        items:[
          { name:'1 medium apple',                                     kcal:70,  protein:0  },
          { name:'30g roasted chana (oil-free)',                       kcal:100, protein:6  },
          { name:'100g low-fat curd (dahi)',                           kcal:60,  protein:4  },
        ]},
      { type:'non-veg', name:'2 Boiled Eggs + Spiced Chaas',
        items:[
          { name:'2 boiled eggs',                                      kcal:140, protein:12 },
          { name:'1 glass spiced buttermilk (chaas)',                  kcal:35,  protein:2  },
        ]},
    ],
    weightGain: [
      { type:'veg', name:'Banana + Peanut Butter + Full-fat Milk',
        items:[
          { name:'2 ripe bananas',                                     kcal:180, protein:2  },
          { name:'2 tbsp peanut butter',                               kcal:190, protein:8  },
          { name:'1 glass full-fat milk (250 ml)',                     kcal:150, protein:8  },
        ]},
      { type:'non-veg', name:'Grilled Chicken Sandwich + Sweet Lassi',
        items:[
          { name:'Grilled chicken sandwich (2 whole-wheat slices)',    kcal:320, protein:28 },
          { name:'1 glass sweet lassi',                                kcal:200, protein:7  },
        ]},
    ],
    default: [
      { type:'veg', name:'Mixed Nuts + Banana + Curd',
        items:[
          { name:'20g mixed nuts (almonds, walnuts)',                  kcal:125, protein:4  },
          { name:'1 medium banana',                                    kcal:90,  protein:1  },
          { name:'100g curd (dahi)',                                   kcal:60,  protein:4  },
        ]},
      { type:'non-veg', name:'2 Boiled Eggs + Apple',
        items:[
          { name:'2 boiled eggs',                                      kcal:140, protein:12 },
          { name:'1 medium apple',                                     kcal:70,  protein:0  },
        ]},
    ],
  },

  // ── DINNER ─────────────────────────────────────────────────────────────────
  dinner: {
    weightLoss: [
      { type:'veg', name:'Paneer Tikka + Moong Dal Soup + Sabzi + Roti',
        items:[
          { name:'120g low-fat Paneer Tikka (grilled)',                kcal:200, protein:21 },
          { name:'1 cup sautéed mixed veggies (minimal oil)',          kcal:80,  protein:3  },
          { name:'1 bowl Moong Dal soup',                              kcal:90,  protein:6  },
          { name:'1 small whole-wheat roti',                           kcal:80,  protein:3  },
        ]},
      { type:'non-veg', name:'Tandoori Chicken + Dal Soup + Roti + Salad',
        items:[
          { name:'2 pcs Tandoori Chicken (skinless, ~200g)',           kcal:220, protein:34 },
          { name:'1 bowl Moong Dal soup',                              kcal:90,  protein:6  },
          { name:'2 whole-wheat rotis',                                kcal:160, protein:5  },
          { name:'Cucumber + carrot salad',                            kcal:40,  protein:1  },
        ]},
    ],
    weightGain: [
      { type:'veg', name:'Paneer Curry + Dal Makhani + Rotis + Lassi',
        items:[
          { name:'150g Paneer curry (cream-based masala)',             kcal:380, protein:22 },
          { name:'1 cup Dal Makhani',                                  kcal:220, protein:12 },
          { name:'3 whole-wheat rotis',                                kcal:240, protein:9  },
          { name:'1 glass plain lassi',                                kcal:130, protein:5  },
        ]},
      { type:'non-veg', name:'Fish Curry + Rice + Toor Dal + Ghee',
        items:[
          { name:'200g Rohu / Surmai fish curry',                      kcal:300, protein:36 },
          { name:'200g cooked white rice',                             kcal:220, protein:4  },
          { name:'1 cup Toor Dal',                                     kcal:160, protein:10 },
          { name:'1 tbsp desi ghee',                                   kcal:112, protein:0  },
        ]},
    ],
    default: [
      { type:'veg', name:'Moong Dal Khichdi + Paneer Sabzi + Curd',
        items:[
          { name:'1.5 cups Moong Dal Khichdi (ghee tadka)',            kcal:280, protein:12 },
          { name:'70g Paneer in mixed vegetable sabzi',                kcal:185, protein:13 },
          { name:'100g curd (dahi)',                                   kcal:60,  protein:4  },
        ]},
      { type:'non-veg', name:'Chicken Tikka + Clear Soup + Roti + Sabzi',
        items:[
          { name:'150g Chicken Tikka (grilled, boneless)',             kcal:220, protein:30 },
          { name:'1 bowl clear chicken soup',                          kcal:120, protein:14 },
          { name:'2 whole-wheat rotis',                                kcal:160, protein:5  },
          { name:'1 cup mixed vegetable sabzi',                        kcal:80,  protein:2  },
        ]},
    ],
  },
};

function pickMealSet(slot, goal) {
  const s = INDIAN_MEALS[slot];
  return s[goal] || s['default'];
}

function buildMeals(goal) {
  const TIME_LABELS = { breakfast:'Breakfast', lunch:'Lunch', snack:'Evening Snack', dinner:'Dinner' };
  const order = ['breakfast', 'lunch', 'snack', 'dinner'];

  return order.map(slot => {
    const [veg, nonVeg] = pickMealSet(slot, goal);
    const sum = items => items.reduce(
      (a, i) => ({ kcal: a.kcal + i.kcal, protein: a.protein + i.protein }),
      { kcal: 0, protein: 0 }
    );
    return {
      label:  TIME_LABELS[slot],
      veg:    { ...veg,    total: sum(veg.items)    },
      nonVeg: { ...nonVeg, total: sum(nonVeg.items) },
    };
  });
}

// ── Exercise library ──────────────────────────────────────────────────────────
const EX = {
  // camera-trackable
  squat:          { name:'Squats',          icon:'🦵', sets:3, reps:12, rest:60, tracked:true,  cat:'Legs'       },
  pushup:         { name:'Push-Ups',        icon:'💪', sets:3, reps:12, rest:60, tracked:true,  cat:'Chest'      },
  lunge:          { name:'Lunges',          icon:'🚶', sets:3, reps:10, rest:60, tracked:true,  cat:'Legs'       },
  jumpingJack:    { name:'Jumping Jacks',   icon:'⭐', sets:3, reps:30, rest:45, tracked:true,  cat:'Cardio'     },
  bicepCurl:      { name:'Bicep Curls',     icon:'💪', sets:3, reps:12, rest:60, tracked:true,  cat:'Arms'       },
  highKnees:      { name:'High Knees',      icon:'🏃', sets:3, reps:40, rest:45, tracked:true,  cat:'Cardio'     },
  shoulderPress:  { name:'Shoulder Press',  icon:'🏋️', sets:3, reps:12, rest:60, tracked:true,  cat:'Shoulders'  },
  // manual
  plank:          { name:'Plank',           icon:'🧘', sets:3, reps:0,  rest:60, tracked:false, cat:'Core', duration:45, label:'45 sec' },
  pullUp:         { name:'Pull-Ups',        icon:'🔝', sets:3, reps:8,  rest:90, tracked:false, cat:'Back'       },
  dip:            { name:'Dips',            icon:'↓',  sets:3, reps:10, rest:75, tracked:false, cat:'Chest'      },
  row:            { name:'Dumbbell Row',    icon:'🏋️', sets:3, reps:12, rest:60, tracked:false, cat:'Back'       },
  deadlift:       { name:'Deadlift',        icon:'🏋️', sets:4, reps:8,  rest:120, tracked:false, cat:'Back'      },
  benchPress:     { name:'Bench Press',     icon:'🏋️', sets:4, reps:8,  rest:90, tracked:false, cat:'Chest'      },
  latPulldown:    { name:'Lat Pulldown',    icon:'🏋️', sets:3, reps:12, rest:60, tracked:false, cat:'Back'       },
  calfRaise:      { name:'Calf Raises',     icon:'🦵', sets:3, reps:20, rest:45, tracked:true,  cat:'Legs'       },
  mountainClimber:{ name:'Mountain Climbers',icon:'🧗', sets:3, reps:30, rest:45, tracked:false, cat:'Cardio'    },
  burpee:         { name:'Burpees',         icon:'🔥', sets:3, reps:10, rest:60, tracked:false, cat:'Cardio'     },
  tricepDip:      { name:'Tricep Dips',     icon:'💪', sets:3, reps:12, rest:60, tracked:false, cat:'Arms'       },
  lateralRaise:   { name:'Lateral Raises',  icon:'🏋️', sets:3, reps:15, rest:45, tracked:false, cat:'Shoulders' },
};

function ex(key, overrides = {}) {
  return { key, ...EX[key], ...overrides };
}

// ── Workout plan templates ─────────────────────────────────────────────────────
const PLANS = {

  fullBody: {
    title: 'Full Body Workout',
    frequency: '3 days/week',
    schedule: [
      { label:'Full Body A', exercises:[ ex('squat'), ex('pushup'), ex('row'), ex('lunge'), ex('shoulderPress'), ex('plank') ] },
      { label:'Rest Day',       rest:true },
      { label:'Full Body B', exercises:[ ex('deadlift'), ex('benchPress'), ex('bicepCurl'), ex('jumpingJack'), ex('lunge'), ex('plank') ] },
      { label:'Rest Day',       rest:true },
      { label:'Full Body C', exercises:[ ex('squat',{reps:15}), ex('pushup',{reps:15}), ex('latPulldown'), ex('calfRaise'), ex('highKnees'), ex('plank') ] },
      { label:'Rest Day',       rest:true },
      { label:'Rest Day',       rest:true },
    ],
  },

  eachMuscle: {
    title: 'Muscle Split (PPL)',
    frequency: '6 days/week',
    schedule: [
      { label:'Push – Chest/Shoulders/Tris', exercises:[ ex('benchPress'), ex('pushup'), ex('shoulderPress'), ex('lateralRaise'), ex('dip'), ex('tricepDip') ] },
      { label:'Pull – Back/Biceps',          exercises:[ ex('pullUp'), ex('row'), ex('latPulldown'), ex('bicepCurl'), ex('bicepCurl',{sets:4}) ] },
      { label:'Legs',                        exercises:[ ex('squat'), ex('lunge'), ex('deadlift'), ex('calfRaise'), ex('plank') ] },
      { label:'Push – Repeat',               exercises:[ ex('pushup',{sets:4}), ex('shoulderPress'), ex('lateralRaise'), ex('dip'), ex('tricepDip') ] },
      { label:'Pull – Repeat',               exercises:[ ex('row'), ex('latPulldown'), ex('bicepCurl'), ex('pullUp') ] },
      { label:'Legs – Repeat',               exercises:[ ex('squat',{reps:15}), ex('lunge',{reps:12}), ex('jumpingJack'), ex('plank') ] },
      { label:'Rest Day', rest:true },
    ],
  },

  weightLoss: {
    title: 'Weight Loss HIIT',
    frequency: '5 days/week',
    schedule: [
      { label:'HIIT Cardio',     exercises:[ ex('jumpingJack'), ex('highKnees'), ex('burpee'), ex('mountainClimber'), ex('squat',{reps:20}) ] },
      { label:'Circuit Upper',   exercises:[ ex('pushup',{reps:15}), ex('row'), ex('shoulderPress'), ex('tricepDip'), ex('plank') ] },
      { label:'HIIT Lower',      exercises:[ ex('squat',{reps:20}), ex('lunge',{reps:15}), ex('jumpingJack',{reps:40}), ex('calfRaise'), ex('highKnees') ] },
      { label:'Active Recovery', exercises:[ ex('plank'), ex('lunge'), ex('pushup',{sets:2, reps:10}) ] },
      { label:'Full Circuit',    exercises:[ ex('burpee'), ex('jumpingJack'), ex('pushup'), ex('squat'), ex('mountainClimber'), ex('plank') ] },
      { label:'Rest Day', rest:true },
      { label:'Rest Day', rest:true },
    ],
  },

  weightGain: {
    title: 'Muscle Building',
    frequency: '5 days/week',
    schedule: [
      { label:'Chest & Triceps', exercises:[ ex('benchPress',{sets:4,reps:8}), ex('pushup',{sets:4,reps:15}), ex('dip',{sets:4}), ex('tricepDip'), ex('lateralRaise') ] },
      { label:'Back & Biceps',   exercises:[ ex('deadlift',{sets:4,reps:6}), ex('pullUp',{sets:4}), ex('row',{sets:4}), ex('latPulldown'), ex('bicepCurl',{sets:4}) ] },
      { label:'Legs',            exercises:[ ex('squat',{sets:4,reps:8}), ex('lunge',{sets:4}), ex('deadlift',{reps:8}), ex('calfRaise',{sets:4,reps:20}) ] },
      { label:'Shoulders & Arms',exercises:[ ex('shoulderPress',{sets:4}), ex('lateralRaise',{sets:4}), ex('bicepCurl',{sets:4}), ex('tricepDip',{sets:4}), ex('pushup',{reps:15}) ] },
      { label:'Full Compound',   exercises:[ ex('squat',{sets:4,reps:10}), ex('deadlift',{sets:4,reps:6}), ex('benchPress',{sets:4,reps:8}), ex('pullUp',{sets:3}), ex('plank') ] },
      { label:'Rest Day', rest:true },
      { label:'Rest Day', rest:true },
    ],
  },
};

// ── Public API ─────────────────────────────────────────────────────────────────
function getWorkoutPlan(goal)  { return PLANS[goal] || PLANS.fullBody; }
function getTodaySchedule(goal) {
  const plan = getWorkoutPlan(goal);
  const dayIdx = new Date().getDay(); // 0-6
  return plan.schedule[dayIdx] || plan.schedule[0];
}
