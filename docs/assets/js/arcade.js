/* ============================================
   街机小游戏 · ORBIT BREACH
   背景星空 + 鼠标操控飞船 + 自动射击
   击碎数据碎片得分，被撞 3 次重启
   ============================================ */

window.initArcade = function (canvas, opts) {
  if (!canvas) return null;
  opts = opts || {};

  var ctx = canvas.getContext("2d");
  var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  var W = 0, H = 0;
  var running = false;
  var raf = 0;

  var ship = { x: 0, y: 0, tx: 0, ty: 0, r: 13 };
  var bullets = [];
  var foes = [];
  var parts = [];
  var stars = [];

  var score = 0;
  var lives = 3;
  var combo = 0;
  var lastShot = 0;
  var lastSpawn = 0;
  var shake = 0;
  var dead = false;
  var deadAt = 0;

  /* ---------- 尺寸（固定全屏层，直接用视口） ---------- */
  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var want = Math.round(Math.min(200, (W * H) / 12000));
    while (stars.length < want) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        z: Math.random() * 0.8 + 0.2,
        s: Math.random() * 1.4 + 0.4
      });
    }
    stars.length = Math.min(stars.length, want);

    if (!ship.x) { ship.x = ship.tx = W / 2; ship.y = ship.ty = H * 0.72; }
  }

  /* ---------- 输入 ---------- */
  function onMove(e) {
    ship.tx = e.clientX;
    ship.ty = e.clientY;
  }

  /* 触屏：手指拖到哪，飞船追到哪（不拦截默认行为，页面照常滚动） */
  function onTouch(e) {
    var t = e.touches && e.touches[0];
    if (!t) return;
    ship.tx = t.clientX;
    ship.ty = t.clientY;
  }

  /* ---------- 逻辑 ---------- */
  function spawn() {
    foes.push({
      x: Math.random() * (W - 60) + 30,
      y: -30,
      vx: (Math.random() - 0.5) * 40,
      vy: Math.random() * 55 + 45,
      r: Math.random() * 10 + 12,
      a: Math.random() * Math.PI,
      va: (Math.random() - 0.5) * 2,
      hp: 2
    });
  }

  function burst(x, y, color, n) {
    for (var i = 0; i < (n || 12); i++) {
      var ang = Math.random() * Math.PI * 2;
      var sp = Math.random() * 130 + 40;
      parts.push({
        x: x, y: y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        life: Math.random() * 0.5 + 0.3,
        c: color
      });
    }
  }

  function reset() {
    score = 0; lives = 3; combo = 0; dead = false;
    bullets = []; foes = []; parts = [];
    if (opts.onStats) opts.onStats(score, lives);
  }

  function kill() {
    dead = true;
    deadAt = performance.now();
    burst(ship.x, ship.y, "#ff2e88", 26);
    shake = 14;
    if (opts.onDead) opts.onDead(score);
  }

  function step(dt) {
    var now = performance.now();

    /* 飞船缓动 */
    ship.x += (ship.tx - ship.x) * Math.min(1, dt * 9);
    ship.y += (ship.ty - ship.y) * Math.min(1, dt * 9);

    /* 星空视差 */
    for (var i = 0; i < stars.length; i++) {
      var st = stars[i];
      st.y += st.z * 14 * dt;
      st.x -= (ship.x - W / 2) * 0.0006 * st.z;
      if (st.y > H) { st.y = -2; st.x = Math.random() * W; }
      if (st.x < 0) st.x += W;
      if (st.x > W) st.x -= W;
    }

    if (dead) {
      if (now - deadAt > 2200) reset();
      return;
    }

    /* 射击 */
    if (now - lastShot > 170) {
      lastShot = now;
      bullets.push({ x: ship.x, y: ship.y - 14, vy: -520 });
    }

    /* 生成敌人 */
    if (now - lastSpawn > Math.max(420, 1000 - score * 3)) {
      lastSpawn = now;
      spawn();
    }

    /* 子弹 */
    for (var b = bullets.length - 1; b >= 0; b--) {
      var bu = bullets[b];
      bu.y += bu.vy * dt;
      if (bu.y < -20) { bullets.splice(b, 1); continue; }

      for (var f = foes.length - 1; f >= 0; f--) {
        var fo = foes[f];
        var dx = bu.x - fo.x, dy = bu.y - fo.y;
        if (dx * dx + dy * dy < (fo.r + 6) * (fo.r + 6)) {
          bullets.splice(b, 1);
          fo.hp--;
          burst(bu.x, bu.y, "#00f0ff", 6);
          if (fo.hp <= 0) {
            burst(fo.x, fo.y, "#ff2e88", 16);
            foes.splice(f, 1);
            combo++;
            score += 10 + Math.min(combo, 10);
            if (opts.onStats) opts.onStats(score, lives);
            if (opts.onKill) opts.onKill(score);
          }
          break;
        }
      }
    }

    /* 敌人 */
    for (var k = foes.length - 1; k >= 0; k--) {
      var e = foes[k];
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.a += e.va * dt;
      if (e.x < 20 || e.x > W - 20) e.vx *= -1;

      var ddx = e.x - ship.x, ddy = e.y - ship.y;
      if (ddx * ddx + ddy * ddy < (e.r + ship.r) * (e.r + ship.r)) {
        foes.splice(k, 1);
        burst(e.x, e.y, "#ff2e88", 18);
        combo = 0;
        lives--;
        shake = 10;
        if (opts.onStats) opts.onStats(score, lives);
        if (lives <= 0) kill();
        continue;
      }
      if (e.y > H + 40) { foes.splice(k, 1); combo = 0; }
    }

    /* 粒子 */
    for (var p = parts.length - 1; p >= 0; p--) {
      var pa = parts[p];
      pa.x += pa.vx * dt;
      pa.y += pa.vy * dt;
      pa.vx *= 0.94;
      pa.vy *= 0.94;
      pa.life -= dt;
      if (pa.life <= 0) parts.splice(p, 1);
    }

    if (shake > 0) shake = Math.max(0, shake - dt * 40);
  }

  /* ---------- 绘制 ---------- */
  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (shake > 0) {
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    }

    /* 星空 */
    for (var i = 0; i < stars.length; i++) {
      var st = stars[i];
      ctx.globalAlpha = 0.18 + st.z * 0.5;
      ctx.fillStyle = "#8fd8ff";
      ctx.fillRect(st.x, st.y, st.s, st.s);
    }
    ctx.globalAlpha = 1;

    /* 飞船 */
    if (!dead) {
      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(11, 12);
      ctx.lineTo(0, 6);
      ctx.lineTo(-11, 12);
      ctx.closePath();
      ctx.fillStyle = "rgba(0,240,255,.16)";
      ctx.fill();
      ctx.strokeStyle = "#00f0ff";
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-4, 8);
      ctx.lineTo(0, 16 + Math.random() * 6);
      ctx.lineTo(4, 8);
      ctx.closePath();
      ctx.fillStyle = "rgba(255,46,136,.7)";
      ctx.fill();
      ctx.restore();
    }

    /* 子弹 */
    ctx.strokeStyle = "#00f0ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var b = 0; b < bullets.length; b++) {
      ctx.moveTo(bullets[b].x, bullets[b].y);
      ctx.lineTo(bullets[b].x, bullets[b].y + 12);
    }
    ctx.stroke();

    /* 敌人 */
    ctx.lineWidth = 1.4;
    for (var f = 0; f < foes.length; f++) {
      var e = foes[f];
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(e.a);
      ctx.beginPath();
      var r = e.r;
      ctx.moveTo(-r, -r * 0.7);
      ctx.lineTo(r * 0.6, -r);
      ctx.lineTo(r, r * 0.6);
      ctx.lineTo(-r * 0.5, r);
      ctx.closePath();
      ctx.fillStyle = "rgba(255,46,136,.12)";
      ctx.fill();
      ctx.strokeStyle = "#ff2e88";
      ctx.stroke();
      ctx.restore();
    }

    /* 粒子 */
    for (var p = 0; p < parts.length; p++) {
      var pa = parts[p];
      ctx.globalAlpha = Math.max(0, pa.life * 1.6);
      ctx.fillStyle = pa.c;
      ctx.fillRect(pa.x, pa.y, 2.4, 2.4);
    }
    ctx.globalAlpha = 1;

    /* 死亡提示 */
    if (dead) {
      ctx.fillStyle = "#ff2e88";
      ctx.font = "600 22px Consolas, monospace";
      ctx.textAlign = "center";
      ctx.fillText("SYSTEM REBOOT", W / 2, H / 2 - 6);
      ctx.fillStyle = "#7ba6c2";
      ctx.font = "13px Consolas, monospace";
      ctx.fillText("SCORE " + score + " // 正在重启", W / 2, H / 2 + 22);
      ctx.textAlign = "left";
    }

    ctx.restore();
  }

  /* ---------- 主循环 ---------- */
  var last = 0;
  var MIN_FRAME = 30; /* 限帧约 33fps，给页面 3D 动画留出 GPU */

  function loop(ts) {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    if (ts - last < MIN_FRAME) return;
    var dt = Math.min(0.06, (ts - last) / 1000 || 0.016);
    last = ts;
    step(dt);
    draw();
  }

  /* ---------- 控制 ---------- */
  function start() {
    if (running) return;
    running = true;
    resize();
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
    ctx.clearRect(0, 0, W, H);
  }

  window.addEventListener("resize", function () { if (running) resize(); });
  window.addEventListener("mousemove", onMove);
  window.addEventListener("touchstart", onTouch, { passive: true });
  window.addEventListener("touchmove", onTouch, { passive: true });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { cancelAnimationFrame(raf); }
    else if (running) { last = performance.now(); raf = requestAnimationFrame(loop); }
  });

  return {
    start: start,
    stop: stop,
    isRunning: function () { return running; },
    getScore: function () { return score; }
  };
};
