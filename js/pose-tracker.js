// ── Pose Tracker – MediaPipe Pose + Rep Counting ─────────────────────────────

// Landmark indices (MediaPipe Pose)
const LM = {
  NOSE:0, L_EYE:1, R_EYE:2, L_EAR:3, R_EAR:4,
  L_SHOULDER:11, R_SHOULDER:12,
  L_ELBOW:13,    R_ELBOW:14,
  L_WRIST:15,    R_WRIST:16,
  L_HIP:23,      R_HIP:24,
  L_KNEE:25,     R_KNEE:26,
  L_ANKLE:27,    R_ANKLE:28,
};

// ── Geometry helpers ──────────────────────────────────────────────────────────
function angle3(a, b, c) {
  const rad = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let deg = Math.abs(rad * 180 / Math.PI);
  return deg > 180 ? 360 - deg : deg;
}

function pt(lm, idx) {
  const p = lm[idx];
  return p ? { x: p.x, y: p.y, v: p.visibility || 0 } : null;
}

function visible(lm, ...indices) {
  return indices.every(i => {
    const p = lm[i];
    return p && (p.visibility == null || p.visibility > 0.4);
  });
}

function avgAngle(lm, a1, b1, c1, a2, b2, c2) {
  const ok1 = visible(lm, a1, b1, c1);
  const ok2 = visible(lm, a2, b2, c2);
  if (!ok1 && !ok2) return null;
  const angles = [];
  if (ok1) angles.push(angle3(pt(lm,a1), pt(lm,b1), pt(lm,c1)));
  if (ok2) angles.push(angle3(pt(lm,a2), pt(lm,b2), pt(lm,c2)));
  return angles.reduce((s,v) => s+v, 0) / angles.length;
}

// ── Exercise configs ──────────────────────────────────────────────────────────
// Each config defines how to measure angle and count reps.
// start = beginning angle (up/extended), end = bottom angle (down/contracted)
const EXERCISE_CONFIGS = {
  squat: {
    label: 'Squat',
    getAngle: lm => avgAngle(lm, LM.L_HIP,LM.L_KNEE,LM.L_ANKLE, LM.R_HIP,LM.R_KNEE,LM.R_ANKLE),
    startAngle: 170, endAngle: 95,   // 170°=standing, 95°=down
    direction: 'down',               // rep counted going down then back up
    formChecks: [
      { fn: (lm,ang) => {
          if (!visible(lm, LM.L_KNEE,LM.L_ANKLE)) return null;
          const knee = pt(lm,LM.L_KNEE), ankle = pt(lm,LM.L_ANKLE);
          // knee should not shoot far past toes horizontally
          return (knee.x - ankle.x) < 0.12 ? null : '⚠ Knee past toes';
        }},
      { fn: (lm,ang) => ang !== null && ang < 80 ? '✓ Good depth' : null, type:'good' },
      { fn: (lm,ang) => {
          if (!visible(lm, LM.L_SHOULDER,LM.L_HIP)) return null;
          const s = pt(lm,LM.L_SHOULDER), h = pt(lm,LM.L_HIP);
          const lean = Math.abs(s.x - h.x);
          return lean > 0.18 ? '⚠ Keep chest up' : null;
        }},
    ],
  },

  pushup: {
    label: 'Push-Up',
    getAngle: lm => avgAngle(lm, LM.L_SHOULDER,LM.L_ELBOW,LM.L_WRIST, LM.R_SHOULDER,LM.R_ELBOW,LM.R_WRIST),
    startAngle: 165, endAngle: 85,
    direction: 'down',
    formChecks: [
      { fn: (lm,ang) => {
          if (!visible(lm, LM.L_SHOULDER,LM.L_HIP,LM.L_ANKLE)) return null;
          const s = pt(lm,LM.L_SHOULDER), h = pt(lm,LM.L_HIP), a = pt(lm,LM.L_ANKLE);
          const midY = (s.y + a.y) / 2;
          const sag  = h.y - midY;       // positive = hips sagging
          if (sag >  0.08) return '⚠ Raise your hips';
          if (sag < -0.08) return '⚠ Lower your hips';
          return null;
        }},
      { fn: (lm,ang) => ang !== null && ang < 90 ? '✓ Full range!' : null, type:'good' },
    ],
  },

  lunge: {
    label: 'Lunge',
    getAngle: lm => avgAngle(lm, LM.L_HIP,LM.L_KNEE,LM.L_ANKLE, LM.R_HIP,LM.R_KNEE,LM.R_ANKLE),
    startAngle: 170, endAngle: 90,
    direction: 'down',
    formChecks: [
      { fn: (lm,ang) => {
          if (!visible(lm, LM.L_KNEE,LM.L_ANKLE)) return null;
          const knee = pt(lm,LM.L_KNEE), ankle = pt(lm,LM.L_ANKLE);
          return (knee.x - ankle.x) > 0.14 ? '⚠ Front knee past toes' : null;
        }},
    ],
  },

  jumpingJack: {
    label: 'Jumping Jack',
    // Use wrist height relative to shoulder to detect arms-up position
    getAngle: lm => {
      if (!visible(lm, LM.L_SHOULDER,LM.L_WRIST)) return null;
      const s = pt(lm,LM.L_SHOULDER), w = pt(lm,LM.L_WRIST);
      // Map wrist-above-shoulder to 0°, wrist-below-shoulder to 180°
      const diff = s.y - w.y;          // positive when wrist is above shoulder
      return 90 - diff * 400;           // rough degree approximation
    },
    startAngle: 120, endAngle: 40,     // 40 = arms up, 120 = arms down
    direction: 'down',
    formChecks: [
      { fn: (lm,ang) => ang !== null && ang < 50 ? '✓ Arms fully up!' : null, type:'good' },
    ],
  },

  bicepCurl: {
    label: 'Bicep Curl',
    getAngle: lm => avgAngle(lm, LM.L_SHOULDER,LM.L_ELBOW,LM.L_WRIST, LM.R_SHOULDER,LM.R_ELBOW,LM.R_WRIST),
    startAngle: 160, endAngle: 50,    // 160=extended, 50=curled
    direction: 'down',
    formChecks: [
      { fn: (lm,ang) => {
          if (!visible(lm, LM.L_SHOULDER,LM.L_ELBOW)) return null;
          const s = pt(lm,LM.L_SHOULDER), e = pt(lm,LM.L_ELBOW);
          // elbow should not swing forward (x shift)
          return Math.abs(s.x - e.x) > 0.15 ? '⚠ Keep elbows still' : null;
        }},
      { fn: (lm,ang) => ang !== null && ang < 60 ? '✓ Full curl!' : null, type:'good' },
    ],
  },

  shoulderPress: {
    label: 'Shoulder Press',
    getAngle: lm => avgAngle(lm, LM.L_ELBOW,LM.L_SHOULDER,LM.L_HIP, LM.R_ELBOW,LM.R_SHOULDER,LM.R_HIP),
    startAngle: 30, endAngle: 160,   // 30=arms down, 160=arms overhead
    direction: 'up',
    formChecks: [
      { fn: (lm,ang) => ang !== null && ang > 155 ? '✓ Full extension!' : null, type:'good' },
    ],
  },

  calfRaise: {
    label: 'Calf Raise',
    getAngle: lm => avgAngle(lm, LM.L_KNEE,LM.L_ANKLE,LM.L_HIP, LM.R_KNEE,LM.R_ANKLE,LM.R_HIP),
    startAngle: 80, endAngle: 110,
    direction: 'up',
    formChecks: [],
  },

  highKnees: {
    label: 'High Knees',
    getAngle: lm => {
      if (!visible(lm, LM.L_HIP,LM.L_KNEE)) return null;
      const h = pt(lm,LM.L_HIP), k = pt(lm,LM.L_KNEE);
      // knee higher than hip = good
      return (h.y - k.y) * 500; // rough proxy
    },
    startAngle: 10, endAngle: 60,
    direction: 'up',
    formChecks: [
      { fn: (lm,ang) => ang !== null && ang > 55 ? '✓ Knee up!' : '⚠ Drive knees higher' },
    ],
  },
};

// Exercises not in this map get manual tracking
function getExerciseConfig(key) {
  return EXERCISE_CONFIGS[key] || null;
}

// ── RepCounter ────────────────────────────────────────────────────────────────
class RepCounter {
  constructor(config) {
    this.cfg = config;
    this.reps = 0;
    this.stage = 'start';   // 'start' | 'end'
    this.history = [];      // angle smoothing buffer
    this.SMOOTH = 5;
  }

  reset() {
    this.reps = 0;
    this.stage = 'start';
    this.history = [];
  }

  update(landmarks) {
    const rawAngle = this.cfg.getAngle(landmarks);
    if (rawAngle === null) return { angle: null, reps: this.reps };

    this.history.push(rawAngle);
    if (this.history.length > this.SMOOTH) this.history.shift();
    const angle = this.history.reduce((s,v) => s+v, 0) / this.history.length;

    const { startAngle, endAngle, direction } = this.cfg;
    const going = direction === 'down'
      ? (angle < endAngle + 10)  // going towards end (smaller for 'down')
      : (angle > endAngle - 10); // going towards end (larger for 'up')

    const atStart = direction === 'down'
      ? angle > startAngle - 15
      : angle < startAngle + 15;

    if (this.stage === 'start' && going) {
      this.stage = 'end';
    } else if (this.stage === 'end' && atStart) {
      this.stage = 'start';
      this.reps++;
    }

    return { angle: Math.round(angle), reps: this.reps };
  }
}

// ── PoseTracker ───────────────────────────────────────────────────────────────
class PoseTracker {
  constructor(videoEl, canvasEl) {
    this.video  = videoEl;
    this.canvas = canvasEl;
    this.ctx    = canvasEl.getContext('2d');
    this.active = false;
    this.counter = null;
    this.exerciseKey = null;
    this.config  = null;
    this.lastLandmarks = null;

    this.onRep      = null;   // callback(repCount)
    this.onFeedback = null;   // callback(text, level)  level: 'good'|'warn'|'bad'|'neutral'
    this.onAngle    = null;   // callback(angle, pct)

    this._setupMediaPipe();
  }

  _setupMediaPipe() {
    if (typeof Pose === 'undefined') {
      console.warn('MediaPipe Pose not loaded');
      return;
    }
    this.pose = new Pose({
      locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}`,
    });
    this.pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    this.pose.onResults(r => this._onResults(r));
  }

  setExercise(key) {
    this.exerciseKey = key;
    this.config  = getExerciseConfig(key);
    this.counter = this.config ? new RepCounter(this.config) : null;
  }

  resetReps() {
    if (this.counter) this.counter.reset();
  }

  async start() {
    if (!this.pose) { this._emitFeedback('MediaPipe unavailable – manual tracking', 'warn'); return; }
    this.active = true;
    this._sizeCavas();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width:640, height:480, facingMode:'user' } });
      this.video.srcObject = stream;
      this.stream = stream;
      this.mpCamera = new Camera(this.video, {
        onFrame: async () => {
          if (this.active && this.pose) await this.pose.send({ image: this.video });
        },
        width:640, height:480,
      });
      this.mpCamera.start();
    } catch(e) {
      this._emitFeedback('Camera access denied – manual tracking', 'bad');
    }
  }

  stop() {
    this.active = false;
    if (this.mpCamera) this.mpCamera.stop();
    if (this.stream)   this.stream.getTracks().forEach(t => t.stop());
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  _sizeCavas() {
    const rect = this.video.getBoundingClientRect();
    this.canvas.width  = rect.width  || 640;
    this.canvas.height = rect.height || 480;
  }

  _onResults(results) {
    if (!this.active) return;
    this._sizeCavas();
    const { width: W, height: H } = this.canvas;
    this.ctx.clearRect(0, 0, W, H);

    if (!results.poseLandmarks) {
      this._emitFeedback('No person detected – step back', 'neutral');
      return;
    }

    const lm = results.poseLandmarks;
    this.lastLandmarks = lm;

    // Draw skeleton
    if (typeof drawConnectors !== 'undefined') {
      drawConnectors(this.ctx, lm, POSE_CONNECTIONS, { color:'rgba(124,58,237,.6)', lineWidth:3 });
      drawLandmarks(this.ctx, lm, { color:'#a855f7', lineWidth:1, radius:4 });
    }

    // Draw angle arc for active joint
    this._drawAngleArc(lm);

    // Count reps
    if (this.counter) {
      const { angle, reps } = this.counter.update(lm);
      if (this.onRep) this.onRep(reps);
      if (angle !== null && this.onAngle) {
        const cfg = this.config;
        const lo = Math.min(cfg.startAngle, cfg.endAngle);
        const hi = Math.max(cfg.startAngle, cfg.endAngle);
        const pct = Math.max(0, Math.min(1, (angle - lo) / (hi - lo)));
        this.onAngle(angle, pct);
      }
      this._runFormChecks(lm, angle);
    } else {
      this._emitFeedback('Tracking: position yourself clearly', 'neutral');
    }
  }

  _runFormChecks(lm, angle) {
    if (!this.config) return;
    let feedback = null;
    let level    = 'good';

    for (const check of this.config.formChecks) {
      const result = check.fn(lm, angle);
      if (result) {
        feedback = result;
        level    = check.type === 'good' ? 'good' : 'warn';
        break;
      }
    }

    if (!feedback) {
      feedback = '✓ Good form – keep it up!';
      level    = 'good';
    }
    this._emitFeedback(feedback, level);
  }

  _emitFeedback(text, level) {
    if (this.onFeedback) this.onFeedback(text, level);
  }

  // Draw a small arc to visualise the angle at the primary joint
  _drawAngleArc(lm) {
    if (!this.config) return;
    const { W, H } = { W: this.canvas.width, H: this.canvas.height };
    let joint = null;

    // Pick the most visible primary joint
    const jointMap = {
      squat: [LM.L_KNEE, LM.R_KNEE],
      pushup: [LM.L_ELBOW, LM.R_ELBOW],
      lunge: [LM.L_KNEE, LM.R_KNEE],
      bicepCurl: [LM.L_ELBOW, LM.R_ELBOW],
      shoulderPress: [LM.L_SHOULDER, LM.R_SHOULDER],
    };

    const candidates = jointMap[this.exerciseKey];
    if (!candidates) return;

    for (const idx of candidates) {
      const p = lm[idx];
      if (p && (p.visibility == null || p.visibility > 0.5)) {
        joint = p; break;
      }
    }
    if (!joint) return;

    const cx = joint.x * W;
    const cy = joint.y * H;
    const r  = 30;

    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
    this.ctx.strokeStyle = 'rgba(168,85,247,.5)';
    this.ctx.lineWidth = 3;
    this.ctx.stroke();
  }
}
