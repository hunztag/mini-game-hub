(() => {
  "use strict";

  // ---------- Cấu hình ----------
  const COLS = 20;        // số ô theo chiều ngang
  const ROWS = 20;        // số ô theo chiều dọc
  const MIN_SPEED = 60;   // giới hạn tốc độ nhanh nhất (ms/bước)

  // Nếu audio.js không tải được, game vẫn chạy (im lặng)
  const SFX = window.Sound || {
    ensure() {}, eat() {}, turn() {}, pause() {}, click() {},
    levelUp() {}, win() {}, gameOver() {},
    isMuted: () => false, toggle: () => false,
  };

  const DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };

  // Tạo danh sách ô tường từ một hình chữ nhật (bao gồm cả hai đầu)
  const rect = (x0, y0, x1, y1) => {
    const out = [];
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) out.push({ x, y });
    }
    return out;
  };

  // ---------- Các màn chơi ----------
  // target: số mồi cần ăn để qua màn
  // speed : ms mỗi bước lúc bắt đầu màn (nhỏ = nhanh)
  // step  : mỗi lần ăn thì nhanh thêm bao nhiêu ms
  // hue   : màu tường của màn
  const LEVELS = [
    {
      name: "Khởi động",
      target: 5,
      speed: 155,
      step: 5,
      hue: 190,
      walls: () => [],
    },
    {
      name: "Hai cột",
      target: 6,
      speed: 145,
      step: 5,
      hue: 200,
      walls: () => [
        ...rect(5, 3, 5, 7),
        ...rect(5, 12, 5, 16),
        ...rect(14, 3, 14, 7),
        ...rect(14, 12, 14, 16),
      ],
    },
    {
      name: "Hành lang",
      target: 7,
      speed: 135,
      step: 5,
      hue: 215,
      walls: () => [
        ...rect(3, 6, 8, 6),
        ...rect(11, 6, 16, 6),
        ...rect(3, 13, 8, 13),
        ...rect(11, 13, 16, 13),
      ],
    },
    {
      name: "Cổng hẹp",
      target: 8,
      speed: 125,
      step: 6,
      hue: 240,
      walls: () => [
        ...rect(6, 4, 6, 8),
        ...rect(13, 4, 13, 8),
        ...rect(6, 11, 6, 15),
        ...rect(13, 11, 13, 15),
        ...rect(9, 2, 10, 2),
        ...rect(9, 17, 10, 17),
      ],
    },
    {
      name: "Nanh vuốt",
      target: 9,
      speed: 115,
      step: 6,
      hue: 268,
      walls: () => [
        ...rect(3, 3, 3, 16),
        ...rect(16, 3, 16, 16),
        ...rect(8, 7, 11, 7),
        ...rect(8, 12, 11, 12),
      ],
    },
    {
      name: "Tốc độ",
      target: 10,
      speed: 95,
      step: 6,
      hue: 305,
      walls: () => [],
    },
  ];

  // ---------- DOM ----------
  const canvas = document.getElementById("board");
  const ctx = canvas.getContext("2d");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayText = document.getElementById("overlay-text");
  const startBtn = document.getElementById("start-btn");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const levelNameEl = document.getElementById("level-name");
  const progressBar = document.getElementById("progress-bar");
  const progressText = document.getElementById("progress-text");
  const soundBtn = document.getElementById("sound-btn");

  // ---------- Trạng thái ----------
  let cell;           // kích thước 1 ô (px, theo độ phân giải canvas)
  let snake;          // [{x, y}, ...] đầu ở index 0
  let dir;            // hướng hiện tại
  let queue;          // hướng chờ áp dụng (tránh quay đầu trong 1 bước)
  let food;           // {x, y}
  let score;
  let best = Number(localStorage.getItem("snake-best") || 0);
  let speed;
  let acc;            // thời gian tích luỹ
  let lastTime;
  let running;
  let paused;
  let rafId;
  let prevSnake = null;   // vị trí bước trước — dùng để nội suy chuyển động
  let particles = [];     // hạt bắn ra khi ăn mồi
  let popups = [];        // chữ "+1" bay lên
  let shake = 0;          // rung màn hình
  let flash = 0;          // nháy đỏ khi thua
  let clock = 0;          // thời gian chạy (ms) cho các hiệu ứng tuần hoàn
  let renderT = 1;        // hệ số nội suy 0..1 của frame hiện tại

  // --- Màn chơi ---
  let levelIndex = 0;
  let level = LEVELS[0];
  let walls = [];                 // [{x, y}] tường của màn hiện tại
  let wallSet = new Set();        // để tra cứu va chạm O(1)
  let totalScore = 0;             // tổng điểm qua các màn
  let overlayAction = "start";    // start | next | resume | restart

  // ---------- Tiện ích ----------
  const sameCell = (a, b) => a.x === b.x && a.y === b.y;

  function randomFreeCell() {
    const taken = new Set(snake.map((s) => `${s.x},${s.y}`));
    for (const w of walls) taken.add(`${w.x},${w.y}`);
    const free = [];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (!taken.has(`${x},${y}`)) free.push({ x, y });
      }
    }
    return free.length ? free[Math.floor(Math.random() * free.length)] : null;
  }

  // ---------- Khởi tạo màn chơi ----------
  // Vùng xuất phát của rắn — không bao giờ đặt tường ở đây
  const START_ZONE = new Set([
    "7,10", "8,10", "9,10", "10,10", "11,10", "9,9", "9,11",
  ]);

  function buildWalls(index) {
    const seen = new Set();
    const out = [];
    for (const c of LEVELS[index].walls()) {
      if (c.x < 0 || c.x >= COLS || c.y < 0 || c.y >= ROWS) continue;
      const k = `${c.x},${c.y}`;
      if (seen.has(k) || START_ZONE.has(k)) continue;
      seen.add(k);
      out.push({ x: c.x, y: c.y });
    }
    return out;
  }

  function updateHud() {
    scoreEl.textContent = score;
    bestEl.textContent = best;
    const target = level ? level.target : 1;
    progressBar.style.width = `${Math.min(100, (score / target) * 100)}%`;
    progressText.textContent = `${score} / ${target}`;
    if (level) {
      levelNameEl.textContent = `Màn ${levelIndex + 1}/${LEVELS.length} · ${level.name}`;
      document.documentElement.style.setProperty("--level-hue", String(level.hue));
    }
  }

  function resetLevel(index) {
    levelIndex = Math.max(0, Math.min(index, LEVELS.length - 1));
    level = LEVELS[levelIndex];
    walls = buildWalls(levelIndex);
    wallSet = new Set(walls.map((w) => `${w.x},${w.y}`));

    snake = [
      { x: 9, y: 10 },
      { x: 8, y: 10 },
      { x: 7, y: 10 },
    ];
    dir = DIRS.right;
    queue = [];
    score = 0;
    speed = level.speed;
    acc = 0;
    lastTime = 0;
    paused = false;
    prevSnake = snake.map((s) => ({ ...s }));
    particles = [];
    popups = [];
    shake = 0;
    flash = 0;
    renderT = 1;
    food = randomFreeCell();
    updateHud();
  }

  // ---------- Vẽ ----------
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const size = canvas.clientWidth || 400;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cell = size / COLS;
  }

  // ---------- Nội suy ----------
  const cellCenter = (p) => ({ x: (p.x + 0.5) * cell, y: (p.y + 0.5) * cell });
  const lerp = (a, b, t) => a + (b - a) * t;

  // Danh sách điểm của thân rắn, nội suy giữa bước trước và bước hiện tại
  function snakePoints(t) {
    const prev = prevSnake && prevSnake.length ? prevSnake : snake;
    const pts = [];
    for (let i = 0; i < snake.length; i++) {
      const a = cellCenter(prev[Math.min(i, prev.length - 1)]);
      const b = cellCenter(snake[i]);
      pts.push({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
    }
    return pts;
  }

  // ---------- Tường ----------
  function roundRect(x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function drawWalls() {
    if (!walls.length) return;
    const hue = level ? level.hue : 200;
    const pad = cell * 0.05;
    const w = cell - pad * 2;

    ctx.save();
    ctx.shadowColor = `hsla(${hue}, 95%, 62%, 0.75)`;
    ctx.shadowBlur = cell * 0.55;

    for (const wall of walls) {
      const x = wall.x * cell + pad;
      const y = wall.y * cell + pad;

      const g = ctx.createLinearGradient(x, y, x + w, y + w);
      g.addColorStop(0, `hsl(${hue} 72% 46%)`);
      g.addColorStop(0.55, `hsl(${hue} 66% 32%)`);
      g.addColorStop(1, `hsl(${hue} 74% 20%)`);

      ctx.fillStyle = g;
      roundRect(x, y, w, w, cell * 0.18);
      ctx.fill();
    }
    ctx.restore();

    // viền sáng mảnh trên đỉnh mỗi khối
    ctx.save();
    ctx.strokeStyle = `hsla(${hue}, 100%, 78%, 0.45)`;
    ctx.lineWidth = Math.max(1, cell * 0.05);
    for (const wall of walls) {
      const x = wall.x * cell + pad;
      const y = wall.y * cell + pad;
      ctx.beginPath();
      ctx.moveTo(x + cell * 0.14, y + cell * 0.1);
      ctx.lineTo(x + w - cell * 0.14, y + cell * 0.1);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- Nền ----------
  function drawBackground(size) {
    const hue = level ? level.hue : 190;
    const bg = ctx.createRadialGradient(
      size * 0.5, size * 0.42, size * 0.05,
      size * 0.5, size * 0.5, size * 0.85
    );
    bg.addColorStop(0, "#0b1224");
    bg.addColorStop(1, "#04060f");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);

    // lưới ô mờ
    ctx.strokeStyle = "rgba(148, 163, 184, 0.06)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < COLS; i++) {
      const p = Math.round(i * cell) + 0.5;
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
    }
    for (let i = 1; i < ROWS; i++) {
      const p = Math.round(i * cell) + 0.5;
      ctx.moveTo(0, p);
      ctx.lineTo(size, p);
    }
    ctx.stroke();

    // quầng sáng bám theo đầu rắn
    if (snake && snake.length) {
      const h = cellCenter(snake[0]);
      const glow = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, cell * 5);
      glow.addColorStop(0, `hsla(${hue}, 90%, 60%, 0.16)`);
      glow.addColorStop(1, `hsla(${hue}, 90%, 60%, 0)`);
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, size, size);
    }

    // viền trong
    ctx.strokeStyle = `hsla(${hue}, 90%, 60%, 0.14)`;
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, size - 2, size - 2);
  }

  // ---------- Mồi ----------
  function drawFood(time) {
    if (!food) return;
    const { x, y } = cellCenter(food);
    const pulse = 0.86 + Math.sin(time / 200) * 0.14;
    const r = cell * 0.3 * pulse;

    const halo = ctx.createRadialGradient(x, y, 0, x, y, cell * 1.5);
    halo.addColorStop(0, "rgba(244, 63, 94, 0.42)");
    halo.addColorStop(1, "rgba(244, 63, 94, 0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, cell * 1.5, 0, Math.PI * 2);
    ctx.fill();

    const orb = ctx.createRadialGradient(
      x - r * 0.35, y - r * 0.4, r * 0.1,
      x, y, r
    );
    orb.addColorStop(0, "#fda4af");
    orb.addColorStop(0.55, "#f43f5e");
    orb.addColorStop(1, "#9f1239");
    ctx.fillStyle = orb;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.beginPath();
    ctx.arc(x - r * 0.32, y - r * 0.36, r * 0.22, 0, Math.PI * 2);
    ctx.fill();

    // tia sáng xoay quanh mồi
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(time / 700);
    ctx.strokeStyle = "rgba(253, 164, 175, 0.5)";
    ctx.lineWidth = Math.max(1, cell * 0.05);
    ctx.lineCap = "round";
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(r * 1.3, 0);
      ctx.lineTo(r * 1.7, 0);
      ctx.stroke();
      ctx.rotate(Math.PI / 2);
    }
    ctx.restore();
  }

  // ---------- Rắn ----------
  function tracePath(pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  }

  function drawSnake(t) {
    if (!snake || !snake.length) return;
    const pts = snakePoints(t);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // 1) quầng neon
    ctx.save();
    ctx.shadowColor = "rgba(34, 211, 238, 0.9)";
    ctx.shadowBlur = cell * 1.1;
    ctx.strokeStyle = "rgba(34, 211, 238, 0.22)";
    ctx.lineWidth = cell * 0.92;
    tracePath(pts);
    ctx.stroke();
    ctx.restore();

    // 2) thân chính (gradient đầu → đuôi)
    const head = pts[0];
    const tail = pts[pts.length - 1];
    const grad = ctx.createLinearGradient(head.x, head.y, tail.x, tail.y);
    grad.addColorStop(0, "#7dd3fc");
    grad.addColorStop(0.35, "#22d3ee");
    grad.addColorStop(0.72, "#0ea5e9");
    grad.addColorStop(1, "#10b981");
    ctx.strokeStyle = grad;
    ctx.lineWidth = cell * 0.72;
    tracePath(pts);
    ctx.stroke();

    // 3) vệt sáng dọc thân
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = cell * 0.24;
    tracePath(pts);
    ctx.stroke();

    // 4) đầu rắn
    const headR = cell * 0.4;
    const hg = ctx.createRadialGradient(
      head.x - headR * 0.3, head.y - headR * 0.3, headR * 0.15,
      head.x, head.y, headR
    );
    hg.addColorStop(0, "#bae6fd");
    hg.addColorStop(1, "#22d3ee");

    ctx.save();
    ctx.shadowColor = "rgba(34, 211, 238, 0.9)";
    ctx.shadowBlur = cell * 0.8;
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.arc(head.x, head.y, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 5) mắt (luôn hướng theo chiều đang bò)
    const dirVec = pts.length > 1
      ? { x: head.x - pts[1].x, y: head.y - pts[1].y }
      : { x: dir.x, y: dir.y };
    const len = Math.hypot(dirVec.x, dirVec.y) || 1;
    const dx = dirVec.x / len;
    const dy = dirVec.y / len;
    const eyeOff = cell * 0.16;
    const eyeR = cell * 0.1;

    for (const s of [1, -1]) {
      const ex = head.x + dx * eyeOff - dy * eyeOff * 0.85 * s;
      const ey = head.y + dy * eyeOff + dx * eyeOff * 0.85 * s;

      ctx.fillStyle = "#03121a";
      ctx.beginPath();
      ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.beginPath();
      ctx.arc(ex - eyeR * 0.3, ey - eyeR * 0.3, eyeR * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ---------- Hiệu ứng ----------
  function burst(from, count) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = cell * (0.04 + Math.random() * 0.13);
      particles.push({
        x: from.x,
        y: from.y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 1,
        size: cell * (0.05 + Math.random() * 0.08),
        hue: 335 + Math.random() * 35,
      });
    }
  }

  function updateEffects(delta) {
    const dt = Math.min(delta, 40) / 16.67;

    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.life -= 0.022 * dt;
    }
    particles = particles.filter((p) => p.life > 0);

    for (const p of popups) {
      p.y -= cell * 0.022 * dt;
      p.life -= 0.018 * dt;
    }
    popups = popups.filter((p) => p.life > 0);

    if (shake > 0) shake = Math.max(0, shake - 0.6 * dt);
    if (flash > 0) flash = Math.max(0, flash - 0.05 * dt);
  }

  function drawEffects(size) {
    for (const p of particles) {
      ctx.globalAlpha = Math.max(p.life, 0);
      ctx.fillStyle = `hsl(${p.hue} 90% 66%)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (popups.length) {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `700 ${Math.round(cell * 0.62)}px "Segoe UI", system-ui, sans-serif`;
      ctx.shadowColor = "rgba(163, 230, 53, 0.85)";
      ctx.shadowBlur = cell * 0.5;
      for (const p of popups) {
        ctx.globalAlpha = Math.max(p.life, 0);
        ctx.fillStyle = "#a3e635";
        ctx.fillText(p.text, p.x, p.y);
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.textBaseline = "alphabetic";
    }

    if (flash > 0) {
      ctx.fillStyle = `rgba(244, 63, 94, ${flash * 0.35})`;
      ctx.fillRect(0, 0, size, size);
    }
  }

  // ---------- Vẽ tổng ----------
  function draw(t = renderT) {
    const size = canvas.clientWidth || 400;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    ctx.save();
    if (shake > 0.1) {
      const m = shake * 0.5;
      ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
    }

    drawBackground(size);
    drawWalls();
    drawFood(clock);
    drawSnake(t);
    drawEffects(size);

    ctx.restore();
  }

  // ---------- Logic ----------
  function step() {
    prevSnake = snake.map((s) => ({ ...s }));

    if (queue.length) dir = queue.shift();

    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    // Va chạm biên
    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
      return gameOver();
    }

    // Va chạm tường của màn
    if (wallSet.has(`${head.x},${head.y}`)) {
      return gameOver();
    }

    const willGrow = food && sameCell(head, food);
    // Va chạm thân (bỏ qua đuôi nếu đuôi sẽ di chuyển đi)
    const body = willGrow ? snake : snake.slice(0, -1);
    if (body.some((s) => sameCell(s, head))) {
      return gameOver();
    }

    snake.unshift(head);

    if (willGrow) {
      score += 1;
      totalScore += 1;
      speed = Math.max(MIN_SPEED, speed - level.step);
      SFX.eat(score);
      burst(cellCenter(food), 18);
      popups.push({ ...cellCenter(food), text: "+1", life: 1 });
      shake = Math.min(shake + 2.5, 6);
      updateHud();

      // Đủ mục tiêu -> qua màn
      if (score >= level.target) return completeLevel();

      food = randomFreeCell();
      if (!food) return completeLevel();
    } else {
      snake.pop();
    }
  }

  function loop(time) {
    if (!running) return;
    rafId = requestAnimationFrame(loop);

    if (paused) {
      lastTime = time;
      return;
    }

    if (!lastTime) lastTime = time;
    let delta = time - lastTime;
    lastTime = time;
    if (delta > 200) delta = 200; // tránh nhảy bước khi tab bị treo
    clock += delta;

    acc += delta;
    while (acc >= speed) {
      acc -= speed;
      step();
      if (!running) return;
    }

    renderT = Math.min(acc / speed, 1);
    updateEffects(delta);
    draw(renderT);
  }

  // ---------- Vòng đời ----------
  function showOverlay(title, text, btnLabel, variant = "") {
    overlayTitle.textContent = title;
    overlayText.textContent = text;
    startBtn.textContent = btnLabel;
    overlay.classList.remove("hidden");
    overlay.classList.toggle("game-over", variant === "game-over");
  }

  function hideOverlay() {
    overlay.classList.add("hidden");
  }

  function begin(index) {
    cancelAnimationFrame(rafId);
    if (index <= 0) totalScore = 0;
    resetLevel(Math.max(0, index));
    running = true;
    paused = false;
    overlayAction = "restart";
    hideOverlay();
    draw();
    rafId = requestAnimationFrame(loop);
  }

  /** Hành động của nút chính / phím Space */
  function primaryAction() {
    SFX.ensure();
    if (running) {
      togglePause();
      return;
    }
    if (overlayAction === "next") begin(levelIndex + 1);
    else if (overlayAction === "resume") togglePause();
    else begin(0);
  }

  function toggleSound() {
    const nowMuted = SFX.toggle();
    if (soundBtn) {
      soundBtn.textContent = nowMuted ? "🔇" : "🔊";
      soundBtn.classList.toggle("off", nowMuted);
      soundBtn.setAttribute("aria-pressed", String(!nowMuted));
    }
    if (!nowMuted) SFX.click();
    return nowMuted;
  }

  // Chạy hiệu ứng "chết" thêm ~0.6s sau khi dừng game
  function playDeathFx() {
    const tick = () => {
      updateEffects(16.7);
      draw(1);
      if (particles.length || popups.length || shake > 0.1 || flash > 0.01) {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  }

  // ---------- Kết thúc ----------
  function commitBest() {
    if (totalScore > best) {
      best = totalScore;
      localStorage.setItem("snake-best", String(best));
      return true;
    }
    return false;
  }

  function gameOver() {
    running = false;
    cancelAnimationFrame(rafId);
    SFX.gameOver();
    shake = 14;
    flash = 1;
    burst(cellCenter(snake[0]), 26);
    playDeathFx();

    const isRecord = commitBest();
    bestEl.textContent = best;
    overlayAction = "restart";

    // Hiện bảng sau khi hiệu ứng va chạm chạy xong
    setTimeout(() => {
      if (running) return; // người chơi đã bấm chơi lại
      showOverlay(
        isRecord ? "Kỷ lục mới! 🏆" : "Game over",
        `Dừng ở màn ${levelIndex + 1} · Tổng ${totalScore} điểm.`,
        "Chơi lại từ màn 1",
        "game-over"
      );
    }, 520);
  }

  function completeLevel() {
    running = false;
    cancelAnimationFrame(rafId);
    acc = 0;
    renderT = 1;

    const isLast = levelIndex >= LEVELS.length - 1;

    // Màn cuối -> phá đảo
    if (isLast) {
      SFX.win();
      const isRecord = commitBest();
      bestEl.textContent = best;
      overlayAction = "restart";
      burst(cellCenter(snake[0]), 30);
      setTimeout(() => {
        showOverlay(
          isRecord ? "Phá đảo & kỷ lục mới! 🏆" : "Phá đảo! 🎉",
          `Hoàn thành ${LEVELS.length} màn với ${totalScore} điểm.`,
          "Chơi lại từ màn 1",
          "celebrate"
        );
      }, 460);
      return;
    }

    // Còn màn tiếp theo
    SFX.levelUp();
    commitBest();
    bestEl.textContent = best;
    overlayAction = "next";
    burst(cellCenter(snake[0]), 26);

    setTimeout(() => {
      if (running) return;
      const nextLevel = LEVELS[levelIndex + 1];
      showOverlay(
        `Màn ${levelIndex + 1} hoàn thành! ✨`,
        `Tiếp theo: ${nextLevel.name} — cần ${nextLevel.target} điểm.`,
        "Màn tiếp theo",
        "celebrate"
      );
    }, 560);
  }

  function togglePause() {
    if (!running) return;
    paused = !paused;
    SFX.pause();
    if (paused) {
      overlayAction = "resume";
      showOverlay("Tạm dừng", "Nhấn Space hoặc nút bên dưới để tiếp tục.", "Tiếp tục");
    } else {
      overlayAction = "restart";
      hideOverlay();
    }
  }

  // ---------- Điều khiển ----------
  function changeDir(name) {
    const next = DIRS[name];
    if (!next) return;

    // Hướng đang chờ áp dụng (hoặc hướng hiện tại nếu không có hàng đợi)
    const ref = queue.length ? queue[queue.length - 1] : dir;

    // Bỏ qua nếu trùng hướng hoặc ngược hướng
    if (next === ref || (next.x === -ref.x && next.y === -ref.y)) return;

    if (queue.length < 2) {
      queue.push(next);
      SFX.turn();
    }
  }

  const KEY_MAP = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    w: "up",
    s: "down",
    a: "left",
    d: "right",
    W: "up",
    S: "down",
    A: "left",
    D: "right",
  };

  window.addEventListener("keydown", (e) => {
    if (e.key === " " || e.code === "Space") {
      e.preventDefault();
      primaryAction();
      return;
    }

    if (e.key === "m" || e.key === "M") {
      e.preventDefault();
      toggleSound();
      return;
    }

    const name = KEY_MAP[e.key];
    if (name) {
      e.preventDefault();
      changeDir(name);
    }
  });

  document.querySelectorAll(".pad").forEach((btn) => {
    btn.addEventListener("click", () => changeDir(btn.dataset.dir));
  });

  startBtn.addEventListener("click", () => {
    SFX.click();
    primaryAction();
  });

  // Vuốt trên mobile
  let touchStart = null;
  canvas.addEventListener("touchstart", (e) => {
    const t = e.changedTouches[0];
    touchStart = { x: t.clientX, y: t.clientY };
  }, { passive: true });

  canvas.addEventListener("touchend", (e) => {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (Math.max(absX, absY) > 24) {
      if (absX > absY) changeDir(dx > 0 ? "right" : "left");
      else changeDir(dy > 0 ? "down" : "up");
    }
    touchStart = null;
  }, { passive: true });

  // Tự tạm dừng khi rời tab
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && running && !paused) togglePause();
  });

  window.addEventListener("resize", () => {
    resize();
    if (snake) draw();
  });

  // ---------- Boot ----------
  if (soundBtn) {
    const mutedAtBoot = SFX.isMuted();
    soundBtn.textContent = mutedAtBoot ? "🔇" : "🔊";
    soundBtn.classList.toggle("off", mutedAtBoot);
    soundBtn.setAttribute("aria-pressed", String(!mutedAtBoot));
    soundBtn.addEventListener("click", () => {
      SFX.ensure();
      toggleSound();
    });
  }

  resize();
  totalScore = 0;
  resetLevel(0);
  draw();
  overlayAction = "start";
  showOverlay(
    "Sẵn sàng?",
    `${LEVELS.length} màn · Mũi tên/WASD để di chuyển · Space tạm dừng · M tắt âm thanh.`,
    "Bắt đầu"
  );
})();
