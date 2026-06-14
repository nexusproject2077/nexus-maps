/* ============================================================
   Nexus Maps — Scène spatiale (étoiles + planètes)
   Affichée en arrière-plan quand on dézoome (la Terre flotte
   dans l'espace). Canvas léger, animé uniquement quand visible.
   ============================================================ */
(function (global) {
  const cv = document.getElementById('spaceCanvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const TAU = Math.PI * 2;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let W = 0, H = 0, stars = [], comets = [], planets = [], raf = null, visible = false, t0 = performance.now();

  const rand = (a, b) => a + Math.random() * (b - a);

  function build() {
    // Étoiles (densité proportionnelle à la surface)
    const n = Math.min(620, Math.round(W * H / 2200));
    stars = [];
    for (let i = 0; i < n; i++)
      stars.push({ x: Math.random() * W, y: Math.random() * H, r: rand(0.3, 1.5),
        a: rand(0.25, 1), tw: rand(0.4, 1.8), ph: Math.random() * TAU,
        c: Math.random() < 0.12 ? '#bcd4ff' : (Math.random() < 0.1 ? '#ffe2c0' : '#ffffff') });
    // Planètes en orbite autour du centre (où se trouve le globe)
    const base = Math.min(W, H);
    planets = [
      { col: ['#ff9d6e', '#a8341a'], r: base * 0.018 + 6, orbit: base * 0.26, k: 0.018, ph: 0.6, tilt: 0.5, ring: false },
      { col: ['#f3dca0', '#9c7b3f'], r: base * 0.030 + 9, orbit: base * 0.40, k: 0.011, ph: 2.4, tilt: -0.6, ring: true },
      { col: ['#7fb0ff', '#143a9e'], r: base * 0.016 + 5, orbit: base * 0.50, k: 0.008, ph: 4.3, tilt: 0.3, ring: false },
      { col: ['#d7c4ff', '#5b3fa0'], r: base * 0.013 + 4, orbit: base * 0.585, k: 0.006, ph: 5.6, tilt: -0.2, ring: false },
    ];
    comets = [];
  }

  function resize() {
    W = cv.clientWidth || window.innerWidth;
    H = cv.clientHeight || window.innerHeight;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }

  function sun() {
    const x = W * 0.14, y = H * 0.16, R = Math.min(W, H) * 0.22;
    const g = ctx.createRadialGradient(x, y, 0, x, y, R);
    g.addColorStop(0, 'rgba(255,247,220,0.95)');
    g.addColorStop(0.18, 'rgba(255,210,140,0.55)');
    g.addColorStop(0.5, 'rgba(255,170,80,0.18)');
    g.addColorStop(1, 'rgba(255,160,70,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
  }

  function planet(p, t) {
    const cx = W / 2, cy = H / 2;
    const ang = p.ph + t * p.k;                 // temps réel (avance avec l'horloge)
    const x = cx + Math.cos(ang) * p.orbit;
    const y = cy + Math.sin(ang) * p.orbit * 0.55; // ellipse (plan orbital incliné)
    // anneau arrière
    if (p.ring) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(p.tilt); ctx.scale(1, 0.34);
      ctx.strokeStyle = 'rgba(243,220,160,0.55)'; ctx.lineWidth = Math.max(2, p.r * 0.18);
      ctx.beginPath(); ctx.arc(0, 0, p.r * 1.9, Math.PI, TAU); ctx.stroke(); ctx.restore();
    }
    // halo
    const hg = ctx.createRadialGradient(x, y, p.r * 0.6, x, y, p.r * 1.8);
    hg.addColorStop(0, 'rgba(255,255,255,0.10)'); hg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(x, y, p.r * 1.8, 0, TAU); ctx.fill();
    // corps (éclairé en haut-gauche, vers le soleil)
    const g = ctx.createRadialGradient(x - p.r * 0.35, y - p.r * 0.35, p.r * 0.15, x, y, p.r);
    g.addColorStop(0, p.col[0]); g.addColorStop(1, p.col[1]);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, p.r, 0, TAU); ctx.fill();
    // anneau avant
    if (p.ring) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(p.tilt); ctx.scale(1, 0.34);
      ctx.strokeStyle = 'rgba(243,220,160,0.85)'; ctx.lineWidth = Math.max(2, p.r * 0.18);
      ctx.beginPath(); ctx.arc(0, 0, p.r * 1.9, 0, Math.PI); ctx.stroke(); ctx.restore();
    }
  }

  function maybeComet() {
    if (comets.length < 1 && Math.random() < 0.004) {
      const y = rand(0, H * 0.5), x = rand(W * 0.4, W);
      comets.push({ x, y, vx: rand(-7, -4), vy: rand(2, 3.5), life: 1 });
    }
  }
  function comet(c) {
    c.x += c.vx; c.y += c.vy; c.life -= 0.008;
    const len = 80;
    const g = ctx.createLinearGradient(c.x, c.y, c.x - c.vx * 12, c.y - c.vy * 12);
    g.addColorStop(0, `rgba(255,255,255,${0.9 * c.life})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(c.x, c.y);
    ctx.lineTo(c.x - c.vx * (len / 8), c.y - c.vy * (len / 8)); ctx.stroke();
  }

  function frame(now) {
    if (!visible) { raf = null; return; }
    const t = (now - t0) / 1000;
    ctx.clearRect(0, 0, W, H);
    // étoiles scintillantes
    for (const s of stars) {
      ctx.globalAlpha = s.a * (0.55 + 0.45 * Math.sin(t * s.tw + s.ph));
      ctx.fillStyle = s.c;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    sun();
    for (const p of planets) planet(p, t);
    maybeComet();
    for (let i = comets.length - 1; i >= 0; i--) { comet(comets[i]); if (comets[i].life <= 0 || comets[i].x < -100) comets.splice(i, 1); }
    raf = requestAnimationFrame(frame);
  }

  function setVisible(v) {
    if (v === visible) return;
    visible = v;
    if (v && !raf) raf = requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize, { passive: true });
  resize();
  global.NexusSpace = { setVisible };
})(window);
