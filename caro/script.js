/* ============================================================
   Cờ caro (gomoku) 15×15 — 5 quân liền nhau là thắng
   ============================================================ */
(() => {
  "use strict";

  const SIZE = 15;
  const WIN_LEN = 5;
  const BLACK = 1;
  const WHITE = 2;
  const AI_DELAY = 260; // ms, để người chơi kịp thấy nước đi

  // Giới hạn thời gian mỗi lượt (0 = không giới hạn)
  const TURN_TIME_KEY = "caro-turn-time";
  const TURN_TIMES = [0, 30, 60, 120];
  const WARN_AT = 10; // giây: chuyển màu cảnh báo
  const URGENT_AT = 5; // giây: đếm ngược đỏ + tick mạnh

  const AI = window.CaroAI || {
    pickMove: () => -1,
    WIN_SCORE: 1e7,
  };

  const SFX = window.Sound || {
    ensure() {}, place() {}, error() {}, victory() {}, draw() {},
    click() {}, tick() {}, timeout() {},
    isMuted: () => false, toggle: () => false,
  };

  // ---------- DOM ----------
  const boardEl = document.getElementById("board");
  const statusEl = document.getElementById("status");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayText = document.getElementById("overlay-text");
  const overlayBtn = document.getElementById("overlay-btn");
  const undoBtn = document.getElementById("undo-btn");
  const restartBtn = document.getElementById("restart-btn");
  const soundBtn = document.getElementById("sound-btn");
  const diffWrap = document.getElementById("difficulty");
  const scoreBlackEl = document.getElementById("score-black");
  const scoreWhiteEl = document.getElementById("score-white");
  const pBlack = document.getElementById("p-black");
  const pWhite = document.getElementById("p-white");

  const timeBtns = document.querySelectorAll(".time-btn");
  const clockEl = document.getElementById("clock");
  const clockFill = document.getElementById("clock-fill");
  const clockText = document.getElementById("clock-text");

  const onlinePanel = document.getElementById("online-panel");
  const serverInput = document.getElementById("server-url");
  const roomInput = document.getElementById("room-input");
  const createRoomBtn = document.getElementById("create-room-btn");
  const joinRoomBtn = document.getElementById("join-room-btn");
  const shareRoomBtn = document.getElementById("share-room-btn");
  const leaveRoomBtn = document.getElementById("leave-room-btn");
  const onlineStatusEl = document.getElementById("online-status");

  const NET = window.CaroNet || null;

  // ---------- Trạng thái ----------
  let board = new Uint8Array(SIZE * SIZE);
  let cells = [];         // [{el, ghost, stone}] theo index
  let turn = BLACK;
  let history = [];       // [{ index, player }]
  let gameOver = false;
  let winLine = [];
  let thinking = false;
  let mode = "ai";        // "ai" | "pvp" | "online"
  let difficulty = "normal";
  let aiTimer = 0;

  // Đồng hồ mỗi lượt
  let turnTime = loadTurnTime(); // giây, 0 = không giới hạn
  let timeLeftMs = 0;
  let clockTimer = 0;
  let clockDeadline = 0;
  let clockKey = "";
  let lastTickSecond = -1;
  let roundId = 0;         // tăng sau mỗi ván để đếm giờ lại từ đầu

  // Trạng thái online
  let netRoom = null;     // mã phòng hiện tại
  let myPlayer = 0;       // 0 = chưa vào phòng, 1 = Đen, 2 = Trắng
  let peerOnline = false;

  function loadScores() {
    try {
      const raw = JSON.parse(localStorage.getItem("caro-score") || "null");
      if (raw && typeof raw.black === "number" && typeof raw.white === "number") {
        return { black: raw.black, white: raw.white };
      }
    } catch {
      /* dữ liệu hỏng thì bỏ qua */
    }
    return { black: 0, white: 0 };
  }

  function loadTurnTime() {
    const n = Number(localStorage.getItem(TURN_TIME_KEY));
    return TURN_TIMES.includes(n) ? n : 0;
  }

  function saveTurnTime(value) {
    turnTime = TURN_TIMES.includes(value) ? value : 0;
    try {
      localStorage.setItem(TURN_TIME_KEY, String(turnTime));
    } catch {
      /* chế độ riêng tư có thể chặn localStorage */
    }
    for (const b of timeBtns) {
      b.classList.toggle("active", Number(b.dataset.time) === turnTime);
    }
  }

  const scores = loadScores();

  // ---------- Tiện ích ----------
  const other = (p) => (p === BLACK ? WHITE : BLACK);
  const nameOf = (p) => (p === BLACK ? "Đen" : "Trắng");
  const colorOfSeat = (seat) => (seat === 1 ? BLACK : WHITE);
  const myColor = () => (myPlayer === 1 ? BLACK : WHITE);
  const isOnline = () => mode === "online";
  const onlineReady = () => Boolean(netRoom && peerOnline && myPlayer);

  function updateScores() {
    scoreBlackEl.textContent = `🏆 ${scores.black}`;
    scoreWhiteEl.textContent = `🏆 ${scores.white}`;
    localStorage.setItem("caro-score", JSON.stringify(scores));
  }

  function setOnlineStatus(text, kind) {
    onlineStatusEl.textContent = text;
    onlineStatusEl.classList.toggle("ok", kind === "ok");
    onlineStatusEl.classList.toggle("err", kind === "err");
  }

  function setOnlineStatusHtml(html, kind) {
    onlineStatusEl.innerHTML = html;
    onlineStatusEl.classList.toggle("ok", kind === "ok");
    onlineStatusEl.classList.toggle("err", kind === "err");
  }

  function updateTurnUi() {
    pBlack.classList.toggle("active", turn === BLACK && !gameOver);
    pWhite.classList.toggle("active", turn === WHITE && !gameOver);

    let text;
    if (gameOver) {
      text = "Ván đấu đã kết thúc";
    } else if (thinking) {
      text = "Máy đang suy nghĩ…";
    } else if (isOnline()) {
      if (!netRoom) text = "Chưa vào phòng";
      else if (!peerOnline) text = "Đang chờ đối thủ…";
      else text = turn === myColor() ? "Lượt của bạn" : "Lượt của đối thủ";
    } else {
      text = `Lượt của ${nameOf(turn)}`;
    }

    statusEl.textContent = text;
    statusEl.classList.toggle(
      "thinking",
      thinking || (isOnline() && !onlineReady())
    );

    undoBtn.disabled = history.length === 0 || thinking || isOnline();

    syncClock();
  }

  // ---------- Giới hạn thời gian mỗi lượt ----------
  function formatClock(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
  }

  function renderClock() {
    clockEl.classList.remove("warn", "danger");

    // Không giới hạn
    if (!turnTime) {
      clockEl.classList.add("idle");
      clockFill.style.width = "0%";
      clockText.textContent = "Không giới hạn · chọn 30s / 60s / 120s để bật";
      return;
    }

    // Đã chọn giới hạn nhưng chưa đánh nước nào
    if (!history.length && !gameOver) {
      clockEl.classList.add("idle");
      clockFill.style.width = "0%";
      clockText.textContent = `⏱ ${turnTime}s mỗi lượt · bắt đầu từ nước đầu tiên`;
      return;
    }

    clockEl.classList.remove("idle");
    const ratio = Math.max(0, Math.min(1, timeLeftMs / (turnTime * 1000)));
    clockFill.style.width = `${(ratio * 100).toFixed(1)}%`;
    clockText.textContent = `⏱ ${formatClock(timeLeftMs)} còn lại`;

    const secs = Math.ceil(timeLeftMs / 1000);
    clockEl.classList.toggle("danger", secs <= URGENT_AT);
    clockEl.classList.toggle("warn", secs > URGENT_AT && secs <= WARN_AT);
  }

  function stopClock() {
    if (clockTimer) {
      clearInterval(clockTimer);
      clockTimer = 0;
    }
    lastTickSecond = -1;
  }

  /** Đồng hồ có đang phải chạy không? */
  function clockActive() {
    if (gameOver || !turnTime || !history.length) return false;
    if (mode === "ai" && turn === WHITE) return false; // máy nghĩ thì không tính giờ của mình
    if (isOnline() && !onlineReady()) return false;    // chưa có đối thủ
    return true;
  }

  /**
   * Đồng bộ lại đồng hồ theo trạng thái ván.
   * Gọi sau mỗi thay đổi (nước đi, ván mới, đổi chế độ...) — tự bỏ qua nếu
   * trạng thái không đổi để không reset giờ liên tục.
   */
  function syncClock() {
    const key = [roundId, history.length, turn, gameOver ? 1 : 0, turnTime,
      mode, peerOnline ? 1 : 0, myPlayer].join("|");

    if (key === clockKey) {
      renderClock();
      return;
    }
    clockKey = key;
    stopClock();

    if (!gameOver) timeLeftMs = turnTime > 0 ? turnTime * 1000 : 0;
    renderClock();

    if (!clockActive()) return;

    clockDeadline = performance.now() + timeLeftMs;
    clockTimer = window.setInterval(tickClock, 100);
  }

  function tickClock() {
    timeLeftMs = Math.max(0, clockDeadline - performance.now());
    const secs = Math.ceil(timeLeftMs / 1000);

    if (secs > 0 && secs <= URGENT_AT && secs !== lastTickSecond) {
      lastTickSecond = secs;
      if (SFX.tick) SFX.tick(secs <= 3);
    }

    renderClock();

    if (timeLeftMs <= 0) {
      stopClock();
      onTurnTimeout();
    }
  }

  /** Người đang đến lượt hết thời gian chờ */
  function onTurnTimeout() {
    if (gameOver) return;

    if (isOnline()) {
      // Chỉ chính người hết giờ mới được tuyên bố (đồng hồ của họ là chuẩn),
      // tránh hai bên cùng xử lý lệch nhau.
      if (!onlineReady() || turn !== myColor()) return;
      finishWithTimeout(turn);
      if (NET) NET.sendTimeout();
      return;
    }

    finishWithTimeout(turn);
  }

  /** Đối thủ báo họ đã hết giờ */
  function applyRemoteTimeout(seat) {
    if (!isOnline() || gameOver) return;
    const color = colorOfSeat(seat);
    if (color !== turn) return; // thông tin cũ / không hợp lệ
    finishWithTimeout(color);
  }

  function finishWithTimeout(loser) {
    gameOver = true;
    winLine = [];
    timeLeftMs = 0;
    thinking = false;
    updateTurnUi();
    renderClock();
    paintTurnGhosts();

    const winner = other(loser);
    let title;
    let text;
    let variant = "";

    if (isOnline()) {
      if (loser === myColor()) {
        variant = "lose";
        title = "Bạn hết giờ 😢";
        text = `Bạn vượt quá ${turnTime}s cho lượt của mình. Đối thủ thắng.`;
        SFX.gameOver();
      } else {
        title = "Đối thủ hết giờ 🎉";
        text = `Đối thủ vượt quá ${turnTime}s. Bạn thắng!`;
        SFX.victory();
      }
    } else {
      SFX.timeout ? SFX.timeout() : SFX.gameOver();
      if (mode === "ai") {
        variant = "lose";
        title = "Bạn hết giờ 😢";
        text = `Quá ${turnTime}s cho lượt của bạn. Máy thắng.`;
      } else {
        title = `${nameOf(winner)} thắng ⏱`;
        text = `${nameOf(loser)} hết ${turnTime}s cho lượt của mình.`;
      }
      // Điểm chỉ tính khi không chơi online
      if (winner === BLACK) scores.black++;
      else scores.white++;
      updateScores();
    }

    showOverlay(title, text, "Ván mới", variant);
  }

  /** Người chơi bấm chọn 30s / 60s / 120s */
  function setTurnTime(value, broadcast = true) {
    if (value === turnTime) return;
    saveTurnTime(value);
    timeLeftMs = turnTime > 0 ? turnTime * 1000 : 0;
    clockKey = ""; // buộc đếm lại từ đầu
    updateTurnUi();

    if (broadcast && isOnline() && netRoom && NET) {
      NET.sendConfig(turnTime);
      setOnlineStatusHtml(
        turnTime
          ? `Đã đổi giới hạn thời gian: <b>${turnTime}s</b> mỗi lượt`
          : "Đã tắt giới hạn thời gian",
        "ok"
      );
    }
  }

  /** Ô trống xung quanh quân đã đánh (bán kính 1 để vẽ quân xem trước) */
  function hasNeighbour(index, radius = 2) {
    const x = index % SIZE;
    const y = (index / SIZE) | 0;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= SIZE || ny < 0 || ny >= SIZE) continue;
        if (board[ny * SIZE + nx] !== 0) return true;
      }
    }
    return false;
  }

  // ---------- Dựng bàn ----------
  function buildBoard() {
    const fragment = document.createDocumentFragment();
    cells = new Array(SIZE * SIZE);

    for (let i = 0; i < SIZE * SIZE; i++) {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "cell";
      el.dataset.index = String(i);
      el.setAttribute("role", "gridcell");
      el.setAttribute("aria-label", `Ô ${(i % SIZE) + 1}, ${((i / SIZE) | 0) + 1}`);

      const ghost = document.createElement("span");
      ghost.className = "ghost black";
      el.appendChild(ghost);

      cells[i] = { el, ghost, stone: null };
      fragment.appendChild(el);
    }

    boardEl.appendChild(fragment);
  }

  function paintTurnGhosts() {
    const ghostColor = isOnline() && myPlayer ? myColor() : turn;
    const cls = ghostColor === BLACK ? "ghost black" : "ghost white";

    const canPlay =
      !gameOver &&
      !thinking &&
      (!isOnline() || (onlineReady() && turn === myColor()));

    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      if (board[i] !== 0 || !c.ghost) continue;
      if (c.ghost.className !== cls) c.ghost.className = cls;
      c.el.style.cursor = canPlay && hasNeighbour(i, 1) ? "pointer" : "default";
    }
  }

  function setStone(index, player) {
    const c = cells[index];
    if (c.stone) c.stone.remove();

    const stone = document.createElement("span");
    stone.className = `stone ${player === BLACK ? "black" : "white"}`;
    c.el.appendChild(stone);
    c.stone = stone;
  }

  function clearStone(index) {
    const c = cells[index];
    if (c.stone) {
      c.stone.remove();
      c.stone = null;
    }
  }

  function markLast(index) {
    for (const c of cells) {
      if (c.stone) c.stone.classList.remove("last");
    }
    if (index >= 0 && cells[index].stone) cells[index].stone.classList.add("last");
  }

  function highlightWin() {
    for (const i of winLine) {
      if (cells[i].stone) cells[i].stone.classList.add("win");
    }
  }

  // ---------- Luật chơi ----------
  const DIRS = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];

  /** Trả về mảng index của 5+ quân liền nhau đi qua `index`, hoặc null */
  function findWinLine(index, player) {
    const x = index % SIZE;
    const y = (index / SIZE) | 0;
    board[index] = player;

    for (const [dx, dy] of DIRS) {
      const line = [index];

      for (const sign of [1, -1]) {
        let step = 1;
        for (;;) {
          const nx = x + dx * step * sign;
          const ny = y + dy * step * sign;
          if (nx < 0 || nx >= SIZE || ny < 0 || ny >= SIZE) break;
          if (board[ny * SIZE + nx] !== player) break;
          line.push(ny * SIZE + nx);
          step++;
        }
      }

      if (line.length >= WIN_LEN) return line.sort((a, b) => a - b);
    }
    return null;
  }

  function isFull() {
    for (let i = 0; i < board.length; i++) if (board[i] === 0) return false;
    return true;
  }

  // ---------- Kết thúc ----------
  function showOverlay(title, text, btnLabel, variant = "") {
    overlayTitle.textContent = title;
    overlayText.textContent = text;
    overlayBtn.textContent = btnLabel;
    overlay.classList.remove("hidden");
    overlay.classList.toggle("lose", variant === "lose");
  }

  function hideOverlay() {
    overlay.classList.add("hidden");
  }

  function finishWithWin(player, line) {
    gameOver = true;
    winLine = line;
    highlightWin();
    updateTurnUi();

    let variant = "";
    let title = `${nameOf(player)} thắng! 🎉`;

    if (mode === "ai") {
      if (player === WHITE) {
        variant = "lose";
        title = "Máy thắng 😢";
        SFX.gameOver();
      } else {
        SFX.victory();
      }
    } else if (isOnline()) {
      if (player === myColor()) {
        title = "Bạn thắng! 🎉";
        SFX.victory();
      } else {
        variant = "lose";
        title = "Đối thủ thắng 😢";
        SFX.gameOver();
      }
    } else {
      SFX.victory();
    }

    // Chỉ tính điểm khi chơi với máy hoặc chung một máy
    if (!isOnline()) {
      if (player === BLACK) scores.black++;
      else scores.white++;
      updateScores();
    }

    showOverlay(title, `${line.length} quân liên tiếp.`, "Ván mới", variant);
  }

  function finishWithDraw() {
    gameOver = true;
    updateTurnUi();
    SFX.draw();
    showOverlay("Hoà", "Bàn cờ đã kín mà không ai có 5 quân liền.", "Ván mới");
  }

  // ---------- Nước đi ----------
  function applyMove(index, player) {
    board[index] = player;
    history.push({ index, player });
    setStone(index, player);
    clearCellGhost(index);
    markLast(index);
  }

  function clearCellGhost(index) {
    const g = cells[index].ghost;
    if (g) g.remove();
  }

  function afterMove(index, player) {
    const line = findWinLine(index, player);
    if (line) {
      finishWithWin(player, line);
      return true;
    }
    if (isFull()) {
      finishWithDraw();
      return true;
    }
    return false;
  }

  function placeHuman(index) {
    if (gameOver || thinking) return;
    if (board[index] !== 0) {
      SFX.error();
      return;
    }

    if (isOnline()) {
      if (!onlineReady() || turn !== myColor()) {
        SFX.error();
        return;
      }
      const color = myColor();
      applyMove(index, color);
      SFX.place(color === BLACK);
      if (NET) NET.sendMove(index, myPlayer);

      if (afterMove(index, color)) {
        paintTurnGhosts();
        return;
      }
      turn = other(color);
      updateTurnUi();
      return;
    }

    applyMove(index, turn);
    SFX.place(turn === BLACK);

    if (afterMove(index, turn)) return;

    turn = other(turn);
    updateTurnUi();

    if (mode === "ai" && turn === WHITE) scheduleAi();
  }

  /** Nước đi của đối thủ gửi qua server */
  function applyRemoteMove(index, seat) {
    if (!isOnline() || gameOver) return;
    if (typeof index !== "number" || index < 0 || index >= board.length) return;
    if (board[index] !== 0) return;

    const color = colorOfSeat(seat);
    if (turn !== color) turn = color; // đồng bộ nếu hai bên lệch trạng thái

    applyMove(index, color);
    SFX.place(color === BLACK);

    if (afterMove(index, color)) {
      paintTurnGhosts();
      return;
    }

    turn = other(color);
    updateTurnUi();
    paintTurnGhosts();
  }

  function scheduleAi() {
    thinking = true;
    updateTurnUi();

    clearTimeout(aiTimer);
    aiTimer = window.setTimeout(() => {
      if (gameOver) {
        thinking = false;
        updateTurnUi();
        return;
      }

      let move = -1;
      try {
        move = AI.pickMove(board, SIZE, WHITE, difficulty);
      } catch (err) {
        console.error(err);
      }

      // Dự phòng: chọn ô trống gần quân bất kỳ
      if (move < 0 || board[move] !== 0) {
        move = -1;
        for (let i = 0; i < board.length; i++) {
          if (board[i] === 0) {
            move = i;
            break;
          }
        }
      }

      thinking = false;
      if (move < 0) {
        finishWithDraw();
        return;
      }

      applyMove(move, WHITE);
      SFX.place(false);

      if (afterMove(move, WHITE)) return;

      turn = BLACK;
      updateTurnUi();
      paintTurnGhosts();
    }, AI_DELAY);
  }

  // ---------- Ván mới / hoàn tác ----------
  function restart(broadcast = true) {
    clearTimeout(aiTimer);
    stopClock();
    board = new Uint8Array(SIZE * SIZE);
    history = [];
    turn = BLACK;
    gameOver = false;
    thinking = false;
    winLine = [];
    roundId += 1;
    timeLeftMs = turnTime > 0 ? turnTime * 1000 : 0;

    for (let i = 0; i < cells.length; i++) {
      clearStone(i);
      // dựng lại ghost nếu đã bị xoá
      if (!cells[i].el.querySelector(".ghost")) {
        const ghost = document.createElement("span");
        ghost.className = "ghost black";
        cells[i].el.appendChild(ghost);
        cells[i].ghost = ghost;
      }
      cells[i].el.style.cursor = "pointer";
    }

    hideOverlay();
    updateTurnUi();
    paintTurnGhosts();

    // Báo cho đối thủ cùng làm mới bàn cờ
    if (broadcast && isOnline() && onlineReady() && NET) NET.sendRestart();
  }

  function undo() {
    if (isOnline()) return;
    if (thinking || history.length === 0) return;

    clearTimeout(aiTimer);
    hideOverlay();
    gameOver = false;
    winLine = [];
    for (const c of cells) if (c.stone) c.stone.classList.remove("win");

    const pop = () => {
      const move = history.pop();
      if (!move) return;
      board[move.index] = 0;
      clearStone(move.index);
      turn = move.player;
    };

    pop();
    // Nếu vừa lùi vào lượt của máy thì lùi thêm nước của người chơi
    if (mode === "ai" && turn === WHITE) pop();

    markLast(history.length ? history[history.length - 1].index : -1);
    updateTurnUi();
    paintTurnGhosts();
  }

  // ---------- Chơi online ----------
  const SERVER_STORAGE_KEY = "caro-server-url";

  function defaultServerUrl() {
    // Mở bằng file:// → server local mặc định
    if (location.protocol === "file:") return "ws://localhost:8080/ws";
    // Cùng domain với trang (server gộp static + websocket)
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${location.host}/ws`;
  }

  function currentServerUrl() {
    const typed = serverInput.value.trim();
    return typed || defaultServerUrl();
  }

  /** Gợi ý thêm khi kết nối thất bại (hay gặp nhất: host tĩnh như GitHub Pages) */
  function explainConnectError(err) {
    const msg = (err && err.message) || String(err);
    if (/(^|\.)github\.io$/i.test(location.hostname)) {
      return `${msg}. GitHub Pages chỉ chứa file tĩnh, không chạy được WebSocket — hãy deploy thêm thư mục server/ (xem README mục 4) rồi dán địa chỉ wss://… vào ô Server trên.`;
    }
    return msg;
  }

  async function ensureConnected() {
    if (!NET) throw new Error("Chưa tải net.js — không chơi online được");
    if (NET.isOnline) return;
    setOnlineStatus("Đang kết nối…");
    try {
      await NET.connect(currentServerUrl());
    } catch (err) {
      throw new Error(explainConnectError(err));
    }
    localStorage.setItem(SERVER_STORAGE_KEY, currentServerUrl());
  }

  function resetOnlineState() {
    netRoom = null;
    myPlayer = 0;
    peerOnline = false;
  }

  /** Hiện/ẩn hai nút chỉ có ý nghĩa khi đã ở trong phòng */
  function updateRoomButtons() {
    const inRoom = Boolean(netRoom);
    shareRoomBtn.classList.toggle("hidden", !inRoom);
    leaveRoomBtn.classList.toggle("hidden", !inRoom);
  }

  function buildInviteLink() {
    const url = new URL(location.href);
    url.searchParams.set("room", netRoom);
    return url.toString();
  }

  async function copyInviteLink() {
    const link = buildInviteLink();
    try {
      await navigator.clipboard.writeText(link);
      setOnlineStatusHtml(`Đã copy link mời: <b>${netRoom}</b>`, "ok");
    } catch {
      // Trình duyệt chặn clipboard (file:// hoặc không có HTTPS)
      window.prompt("Copy link này gửi cho bạn của bạn:", link);
    }
  }

  function leaveRoom() {
    if (NET) NET.disconnect();
    resetOnlineState();
    updateRoomButtons();
    roomInput.value = "";
    restart(false);
    setOnlineStatus("Đã rời phòng. Tạo phòng mới hoặc nhập mã để vào phòng khác.");
  }

  async function createRoom() {
    createRoomBtn.disabled = true;
    joinRoomBtn.disabled = true;
    try {
      await ensureConnected();
      const data = await NET.createRoom(turnTime);
      netRoom = data.room;
      myPlayer = data.player;
      peerOnline = NET.peerOnline;
      if (typeof data.turnTime === "number") saveTurnTime(data.turnTime);
      restart(false);
      roomInput.value = netRoom;
      updateRoomButtons();
      setOnlineStatusHtml(
        `Mã phòng: <b>${netRoom}</b> · bạn là ${nameOf(colorOfSeat(myPlayer))} · bấm «Copy link mời» rồi gửi cho bạn`,
        "ok"
      );
    } catch (err) {
      resetOnlineState();
      setOnlineStatus(`Lỗi: ${err.message || err}`, "err");
    } finally {
      createRoomBtn.disabled = false;
      joinRoomBtn.disabled = false;
      updateTurnUi();
      paintTurnGhosts();
    }
  }

  async function joinRoom() {
    const code = roomInput.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
    if (code.length < 4) {
      setOnlineStatus("Nhập mã phòng (5 ký tự) do bạn của bạn gửi.", "err");
      return;
    }

    createRoomBtn.disabled = true;
    joinRoomBtn.disabled = true;
    try {
      await ensureConnected();
      const data = await NET.joinRoom(code);
      netRoom = data.room;
      myPlayer = data.player;
      peerOnline = NET.peerOnline;
      // Phòng do người khác tạo → theo giới hạn thời gian của phòng đó
      if (typeof data.turnTime === "number") saveTurnTime(data.turnTime);
      roomInput.value = netRoom;
      restart(false);
      updateRoomButtons();
      setOnlineStatusHtml(
        `Đã vào phòng <b>${netRoom}</b> · bạn là ${nameOf(colorOfSeat(myPlayer))}`,
        "ok"
      );
    } catch (err) {
      resetOnlineState();
      setOnlineStatus(`Lỗi: ${err.message || err}`, "err");
    } finally {
      createRoomBtn.disabled = false;
      joinRoomBtn.disabled = false;
      updateTurnUi();
      paintTurnGhosts();
    }
  }

  function setupNetListeners() {
    if (!NET) return;

    NET.on("peer", (online) => {
      peerOnline = online;
      if (netRoom) {
        setOnlineStatusHtml(
          online
            ? `Đang chơi ở phòng <b>${netRoom}</b>`
            : `Đối thủ đã rời phòng <b>${netRoom}</b> — chờ người mới…`,
          online ? "ok" : ""
        );
      }
      // Hai bên cùng reset để chắc chắn có chung một trạng thái bàn cờ
      if (online) restart(false);
      updateTurnUi();
      paintTurnGhosts();
    });

    NET.on("move", ({ index, player }) => applyRemoteMove(index, player));

    NET.on("restart", () => {
      restart(false);
      setOnlineStatusHtml(`Đối thủ xin ván mới · phòng <b>${netRoom}</b>`, "ok");
    });

    NET.on("config", (value) => {
      if (typeof value !== "number") return;
      saveTurnTime(value);
      timeLeftMs = turnTime > 0 ? turnTime * 1000 : 0;
      clockKey = "";
      updateTurnUi();
      setOnlineStatusHtml(
        turnTime
          ? `Đối thủ đặt giới hạn <b>${turnTime}s</b> mỗi lượt`
          : "Đối thủ đã tắt giới hạn thời gian",
        "ok"
      );
    });

    NET.on("timeout", (seat) => applyRemoteTimeout(seat));

    NET.on("close", () => {
      resetOnlineState();
      updateRoomButtons();
      setOnlineStatus("Mất kết nối tới server.", "err");
      updateTurnUi();
      paintTurnGhosts();
    });

    NET.on("error", (message) => {
      setOnlineStatus(`Lỗi: ${message}`, "err");
    });
  }

  function setMode(next) {
    if (next === mode) return;
    mode = next;

    document.querySelectorAll(".mode").forEach((b) => {
      b.classList.toggle("active", b.dataset.mode === mode);
    });
    diffWrap.classList.toggle("hidden", mode !== "ai");
    onlinePanel.classList.toggle("hidden", mode !== "online");

    if (mode === "online") {
      if (!serverInput.value) {
        serverInput.value = localStorage.getItem(SERVER_STORAGE_KEY) || "";
      }
      if (!NET) {
        setOnlineStatus("Không tìm thấy net.js — chỉ chơi offline được.", "err");
      } else if (netRoom) {
        setOnlineStatusHtml(
          `Đang ở phòng <b>${netRoom}</b>${peerOnline ? " · đối thủ đã vào" : " · chờ đối thủ"}`,
          "ok"
        );
      } else {
        setOnlineStatus("Bấm «Tạo phòng» rồi gửi mã cho bạn, hoặc nhập mã để vào phòng.");
      }
    } else {
      resetOnlineState();
    }

    restart(false);
  }

  // ---------- Sự kiện ----------
  boardEl.addEventListener("click", (e) => {
    const cell = e.target.closest(".cell");
    if (!cell) return;
    SFX.ensure();
    placeHuman(Number(cell.dataset.index));
    paintTurnGhosts();
  });

  document.querySelectorAll(".mode").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.mode === mode) return;
      SFX.click();
      setMode(btn.dataset.mode);
    });
  });

  createRoomBtn.addEventListener("click", () => {
    SFX.ensure();
    createRoom();
  });

  joinRoomBtn.addEventListener("click", () => {
    SFX.ensure();
    joinRoom();
  });

  shareRoomBtn.addEventListener("click", () => {
    SFX.click();
    copyInviteLink();
  });

  leaveRoomBtn.addEventListener("click", () => {
    SFX.click();
    leaveRoom();
  });

  roomInput.addEventListener("input", () => {
    roomInput.value = roomInput.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
  });

  roomInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      joinRoom();
    }
  });

  serverInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      serverInput.blur();
    }
  });

  document.querySelectorAll(".diff").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.diff === difficulty) return;
      SFX.click();
      difficulty = btn.dataset.diff;
      document.querySelectorAll(".diff").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      restart();
    });
  });

  overlayBtn.addEventListener("click", () => {
    SFX.click();
    restart();
  });

  for (const btn of timeBtns) {
    btn.addEventListener("click", () => {
      SFX.ensure();
      const value = Number(btn.dataset.time);
      if (value === turnTime) return;
      SFX.click();
      setTurnTime(value);
    });
  }

  undoBtn.addEventListener("click", () => {
    SFX.click();
    undo();
  });

  restartBtn.addEventListener("click", () => {
    SFX.click();
    restart();
  });

  function toggleSound() {
    const nowMuted = SFX.toggle();
    soundBtn.textContent = nowMuted ? "🔇" : "🔊";
    soundBtn.classList.toggle("off", nowMuted);
    soundBtn.setAttribute("aria-pressed", String(!nowMuted));
    if (!nowMuted) SFX.click();
  }

  soundBtn.addEventListener("click", () => {
    SFX.ensure();
    toggleSound();
  });

  window.addEventListener("keydown", (e) => {
    // Không cướp phím khi đang gõ vào ô nhập liệu
    const tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable) return;

    const k = e.key.toLowerCase();
    if (k === "u") {
      e.preventDefault();
      undo();
    } else if (k === "r") {
      e.preventDefault();
      restart();
    } else if (k === "m") {
      e.preventDefault();
      toggleSound();
    }
  });

  // ---------- Khởi động ----------
  function init() {
    buildBoard();
    updateScores();
    saveTurnTime(turnTime); // đồng bộ nút đang chọn + localStorage
    timeLeftMs = turnTime > 0 ? turnTime * 1000 : 0;
    updateTurnUi();
    paintTurnGhosts();
    setupNetListeners();

    if (serverInput) {
      serverInput.placeholder = defaultServerUrl();
      const saved = localStorage.getItem(SERVER_STORAGE_KEY);
      if (saved) serverInput.value = saved;
    }

    const muted = SFX.isMuted();
    soundBtn.textContent = muted ? "🔇" : "🔊";
    soundBtn.classList.toggle("off", muted);
    soundBtn.setAttribute("aria-pressed", String(!muted));

    // Link mời: .../caro/?room=K7M2Q
    const invited = (new URLSearchParams(location.search).get("room") || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 5);

    if (invited) {
      setMode("online");
      roomInput.value = invited;
      joinRoom();
    }
  }

  init();
})();
