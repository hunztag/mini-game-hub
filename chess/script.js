/* ============================================================
   Cờ Vua — UI + luật chơi (engine nằm trong engine.js)
   ============================================================ */
(() => {
  "use strict";

  const E = window.ChessEngine;

  const SFX = window.Sound || {
    ensure() {}, place() {}, error() {}, victory() {}, draw() {}, click() {},
    gameOver() {}, tick() {}, timeout() {},
    isMuted: () => false,
    toggle: () => false,
  };

  const GLYPH = { K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟" };
  const PIECE_NAME = { K: "Vua", Q: "Hậu", R: "Xe", B: "Tượng", N: "Mã", P: "Tốt" };
  const NAMES = { w: "Trắng", b: "Đen" };
  const FILES = "abcdefgh";
  const STORE_KEY = "chess-score";

  const boardEl = document.getElementById("board");
  const statusEl = document.getElementById("status");
  const overlayEl = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayText = document.getElementById("overlay-text");
  const overlayBtn = document.getElementById("overlay-btn");
  const promoEl = document.getElementById("promo");
  const promoOpts = document.getElementById("promo-opts");
  const undoBtn = document.getElementById("undo-btn");
  const restartBtn = document.getElementById("restart-btn");
  const soundBtn = document.getElementById("sound-btn");
  const diffWrap = document.getElementById("difficulty");
  const pWhite = document.getElementById("p-white");
  const pBlack = document.getElementById("p-black");
  const pNameWhite = pWhite.querySelector(".pname");
  const pNameBlack = pBlack.querySelector(".pname");
  const scoreWhiteEl = document.getElementById("score-white");
  const scoreBlackEl = document.getElementById("score-black");
  const modeBtns = Array.from(document.querySelectorAll(".mode"));
  const diffBtns = Array.from(document.querySelectorAll(".diff"));
  const timeBtns = Array.from(document.querySelectorAll(".time-btn"));

  let state = E.startState();
  let mode = "ai"; // "ai" | "pvp" | "online"
  let difficulty = "normal";
  let selected = null; // ô đang chọn
  let history = []; // các bản ghi undo (LIFO)
  let lastMove = null; // { from, to }
  let over = false;
  let busy = false; // AI đang tính
  let aiToken = 0; // chống AI đi vào ván mới
  let pendingPromo = null; // danh sách nước phong cấp đang chờ chọn
  let roundId = 0; // tăng mỗi ván mới → đồng hồ biết phải đếm lại
  let scores = loadScores();
  let online = null; // transport + bảng phòng (assets/online.js)

  /* ---------- Điểm số (localStorage) ---------- */

  function loadScores() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
      return { w: Number(raw.w) || 0, b: Number(raw.b) || 0, d: Number(raw.d) || 0 };
    } catch {
      return { w: 0, b: 0, d: 0 };
    }
  }

  function saveScores() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(scores));
    } catch {
      /* bỏ qua */
    }
  }

  function paintScores() {
    scoreWhiteEl.textContent = scores.w;
    scoreBlackEl.textContent = scores.b;
    scoreWhiteEl.title = `${scores.w} thắng · ${scores.d} hòa`;
    scoreBlackEl.title = `${scores.b} thắng · ${scores.d} hòa`;
  }

  /* ---------- Phía của người chơi (chế độ online) ---------- */

  /** Ghế 1 = chủ phòng = Trắng (đi trước) · ghế 2 = khách = Đen */
  function seatColor() {
    return online && online.seat === 2 ? "b" : "w";
  }

  function isOnlineMode() {
    return mode === "online";
  }

  function onlineReady() {
    return isOnlineMode() && Boolean(online) && online.ready();
  }

  /** Lật bàn 180° khi mình cầm quân Đen để quân mình luôn ở phía dưới */
  function flipped() {
    return isOnlineMode() && seatColor() === "b";
  }

  /** Vị trí hiển thị ↔ chỉ số ô trong engine */
  const toBoard = (d) => (flipped() ? 63 - d : d);

  /* ---------- Đồng hồ mỗi lượt ---------- */

  const clock = window.GameClock
    ? window.GameClock.create({
        els: {
          bar: document.getElementById("clock"),
          fill: document.getElementById("clock-fill"),
          text: document.getElementById("clock-text"),
          btns: timeBtns,
        },
        storeKey: "chess-turn-time",
        isOver: () => over,
        hasStarted: () => history.length > 0,
        shouldRun: () => {
          if (over || !clock.turnTime || !history.length) return false;
          if (mode === "ai") return state.turn === "w";
          if (mode === "online") return onlineReady() && state.turn === seatColor();
          return true;
        },
        key: () =>
          [
            roundId,
            history.length,
            state.turn,
            over ? 1 : 0,
            clock.turnTime,
            mode,
            onlineReady() ? 1 : 0,
            seatColor(),
          ].join("|"),
        onTimeout: () => onTurnTimeout(),
        onChange: (value) => {
          if (online && online.room) online.sendConfig(value);
        },
      })
    : {
        sync() {},
        restart() {},
        set() {},
        paintButtons() {},
        get turnTime() {
          return 0;
        },
        get leftMs() {
          return 0;
        },
      };

  /* ---------- Chơi online (P2P hoặc server riêng) ---------- */

  online = window.GameOnline
    ? window.GameOnline.create({
        game: "chess",
        seatName: (seat) => (seat === 1 ? "Trắng (đi trước)" : "Đen"),
        els: {
          panel: document.getElementById("online-panel"),
          serverRow: document.getElementById("server-row"),
          serverInput: document.getElementById("server-url"),
          roomInput: document.getElementById("room-input"),
          createBtn: document.getElementById("create-room-btn"),
          joinBtn: document.getElementById("join-room-btn"),
          shareBtn: document.getElementById("share-room-btn"),
          leaveBtn: document.getElementById("leave-room-btn"),
          status: document.getElementById("online-status"),
          connBtns: Array.from(document.querySelectorAll(".conn-btn")),
        },
        getTurnTime: () => clock.turnTime,
        onReset: () => restart(false),
        onPeerChange: () => {
          paintPlayerNames();
          render();
          updateTurnUI();
        },
        onMove: (payload) => applyRemoteMove(payload),
        onRemoteRestart: () => restart(false),
        onRemoteConfig: (turnTime) => {
          clock.set(turnTime, false);
          updateTurnUI();
        },
        onRemoteTimeout: (seat) => applyRemoteTimeout(seat),
      })
    : null;

  /* ---------- Dựng bàn cờ ---------- */

  const squares = [];
  const pieceEls = [];
  const isLight = [];
  const coordFiles = [];
  const coordRanks = [];

  function buildBoard() {
    for (let i = 0; i < 64; i++) {
      const row = i >> 3;
      const col = i & 7;
      const light = (row + col) % 2 === 0;
      isLight[i] = light;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "square " + (light ? "light" : "dark");
      btn.dataset.i = String(i);
      btn.setAttribute("role", "gridcell");

      const piece = document.createElement("span");
      piece.className = "piece";
      btn.appendChild(piece);
      pieceEls[i] = piece;

      if (row === 7) {
        const c = document.createElement("i");
        c.className = "coord file";
        c.setAttribute("aria-hidden", "true");
        btn.appendChild(c);
        coordFiles[i] = c;
      }
      if (col === 0) {
        const c = document.createElement("i");
        c.className = "coord rank";
        c.setAttribute("aria-hidden", "true");
        btn.appendChild(c);
        coordRanks[i] = c;
      }

      boardEl.appendChild(btn);
      squares[i] = btn;
    }

    paintCoords();
  }

  /** Toạ độ vẽ ở cạnh dưới / cạnh trái màn hình, giá trị theo bàn thật (đổi khi lật) */
  let flipPainted = null;

  function paintCoords() {
    const nowFlipped = flipped();
    if (flipPainted === nowFlipped) return;
    flipPainted = nowFlipped;

    for (let d = 0; d < 64; d++) {
      const i = toBoard(d);
      const file = coordFiles[d];
      const rank = coordRanks[d];
      if (file) file.textContent = FILES[i & 7];
      if (rank) rank.textContent = String(8 - (i >> 3));
    }
  }

  /* ---------- Vẽ lại ---------- */

  function render() {
    paintCoords();

    const legal = E.genLegalMoves(state);
    const inChk = E.inCheck(state, state.turn);
    const checkSq = inChk ? state.kings[state.turn] : -1;

    const targets = new Map(); // to -> có ăn quân?
    if (selected !== null && !over) {
      const sel = state.board[selected];
      for (const m of legal) {
        if (m.from !== selected) continue;
        const enPassant = sel && sel[1] === "P" && m.to === state.ep && !state.board[m.to];
        targets.set(m.to, Boolean(state.board[m.to]) || enPassant);
      }
    }

    for (let d = 0; d < 64; d++) {
      const i = toBoard(d);
      const sq = squares[d];
      const p = state.board[i];

      sq.className = "square " + (isLight[d] ? "light" : "dark");
      if (lastMove && (i === lastMove.from || i === lastMove.to)) sq.classList.add("last");
      if (i === selected) sq.classList.add("sel");
      if (targets.has(i)) sq.classList.add(targets.get(i) ? "cap" : "mv");
      if (i === checkSq) sq.classList.add("check");

      const el = pieceEls[d];
      const glyph = p ? GLYPH[p[1]] : "";
      const label = p ? (p[0] === "w" ? "Trắng " : "Đen ") + PIECE_NAME[p[1]] : "";

      if (el.textContent !== glyph) {
        el.textContent = glyph;
        el.className = "piece" + (p ? " " + p[0] : "");
        if (p) {
          void el.offsetWidth; // ép chạy lại animation
          el.classList.add("pop");
        }
      }
      if (label) el.setAttribute("aria-label", label);
      else el.removeAttribute("aria-label");
    }
  }

  /* ---------- Trạng thái / thanh lượt ---------- */

  function paintPlayerNames() {
    const mine = isOnlineMode() ? seatColor() : null;
    pNameWhite.textContent = mine === "w" ? "Trắng · bạn" : "Trắng";
    pNameBlack.textContent = mine === "b" ? "Đen · bạn" : "Đen";
  }

  function updateTurnUI(status) {
    const st = status || E.getStatus(state);

    pWhite.classList.toggle("active", !st.over && state.turn === "w");
    pBlack.classList.toggle("active", !st.over && state.turn === "b");

    statusEl.classList.remove("thinking", "check");

    if (st.over) {
      statusEl.textContent = "Ván đã kết thúc";
    } else if (busy) {
      statusEl.textContent = "🤖 Máy đang tính...";
      statusEl.classList.add("thinking");
    } else if (isOnlineMode()) {
      if (!online || !online.room) {
        statusEl.textContent = "Chưa vào phòng";
        statusEl.classList.add("thinking");
      } else if (!online.ready()) {
        statusEl.textContent = "Đang chờ đối thủ…";
        statusEl.classList.add("thinking");
      } else if (state.turn === seatColor()) {
        statusEl.textContent = st.check ? "Chiếu! Lượt của bạn" : "Lượt của bạn";
        if (st.check) statusEl.classList.add("check");
      } else {
        statusEl.textContent = st.check ? "Chiếu! Lượt đối thủ" : "Lượt đối thủ";
        statusEl.classList.add("thinking");
      }
    } else {
      const name = NAMES[state.turn];
      statusEl.textContent = st.check ? `Chiếu! Lượt của ${name}` : `Lượt của ${name}`;
      if (st.check) statusEl.classList.add("check");
    }

    undoBtn.disabled = busy || history.length === 0 || isOnlineMode();
    clock.sync();
  }

  /* ---------- Đi quân ---------- */

  function applyMove(move, remote = false) {
    const moving = state.board[move.from];
    const enPassant = moving && moving[1] === "P" && move.to === state.ep && !state.board[move.to];
    const capture = Boolean(state.board[move.to]) || enPassant;

    const undo = E.makeMove(state, move);
    history.push(undo);

    lastMove = { from: move.from, to: move.to };
    selected = null;

    if (capture) SFX.place(false);
    else SFX.place(true);

    // Gửi cho đối thủ sau khi đã áp dụng ở máy mình (remote = nước của họ, không gửi lại)
    if (!remote && isOnlineMode() && online && online.ready()) {
      online.sendMove({ from: move.from, to: move.to, promo: move.promo || "" });
    }

    render();

    const st = E.getStatus(state);
    if (st.over) {
      finish(st);
      return;
    }
    updateTurnUI(st);

    if (mode === "ai" && state.turn === "b") scheduleAI();
  }

  /** Nước đi của đối thủ gửi tới — kiểm tra hợp lệ rồi mới áp dụng */
  function applyRemoteMove(payload) {
    if (!isOnlineMode() || over || !payload) return;

    const from = Number(payload.from);
    const to = Number(payload.to);
    const promo = payload.promo ? String(payload.promo) : "";

    if (!Number.isInteger(from) || !Number.isInteger(to)) return;
    if (from < 0 || from > 63 || to < 0 || to > 63) return;

    const move = E.genLegalMoves(state).find(
      (m) => m.from === from && m.to === to && (m.promo || "") === promo
    );
    if (!move) return; // lệch trạng thái → bỏ qua, không phá ván

    busy = false;
    SFX.ensure();
    applyMove(move, true);
  }

  function scheduleAI() {
    const token = ++aiToken;
    busy = true;
    updateTurnUI();

    window.setTimeout(() => {
      // Ván đã đổi trong lúc chờ → bỏ qua
      if (token !== aiToken || over || mode !== "ai" || state.turn !== "b") {
        busy = false;
        updateTurnUI();
        return;
      }
      busy = false;
      const move = E.findBestMove(state, difficulty);
      if (move) applyMove(move);
      else updateTurnUI();
    }, 200);
  }

  /* ---------- Chọn ô ---------- */

  function onSquare(i) {
    if (over || busy || pendingPromo) return;
    if (mode === "ai" && state.turn !== "w") return;
    if (isOnlineMode()) {
      if (!onlineReady()) return;
      if (state.turn !== seatColor()) return;
    }

    const p = state.board[i];
    const mine = Boolean(p) && p[0] === state.turn;

    if (selected !== null) {
      if (i === selected) {
        selected = null;
        SFX.click();
        render();
        return;
      }

      const opts = E.genLegalMoves(state).filter((m) => m.from === selected && m.to === i);
      if (opts.length === 1) {
        applyMove(opts[0]);
        return;
      }
      if (opts.length > 1) {
        askPromotion(opts);
        return;
      }
    }

    if (mine) {
      selected = i;
      SFX.click();
      render();
      return;
    }

    if (selected !== null) {
      selected = null;
      SFX.error();
      render();
    }
  }

  /* ---------- Phong cấp ---------- */

  function askPromotion(opts) {
    pendingPromo = opts;
    const color = state.board[opts[0].from][0];

    promoOpts.innerHTML = "";
    for (const type of ["Q", "R", "B", "N"]) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "promo-btn" + (color === "b" ? " dark" : "");
      btn.textContent = GLYPH[type];
      btn.title = PIECE_NAME[type];
      btn.setAttribute("aria-label", "Phong cấp thành " + PIECE_NAME[type]);
      btn.addEventListener("click", () => {
        const pick = opts.find((m) => m.promo === type) || opts[0];
        pendingPromo = null;
        promoEl.classList.add("hidden");
        SFX.click();
        applyMove(pick);
      });
      promoOpts.appendChild(btn);
    }

    promoEl.classList.remove("hidden");
  }

  /* ---------- Kết thúc ván ---------- */

  function showOverlay({ title, text, lose }) {
    overlayTitle.textContent = title;
    overlayText.textContent = text;
    overlayEl.classList.toggle("lose", Boolean(lose));
    overlayEl.classList.remove("hidden");
    render();
    updateTurnUI();
  }

  function finish(st) {
    over = true;
    busy = false;
    selected = null;

    let title;
    let text;
    let lose = false;

    if (isOnlineMode()) {
      if (st.result === "checkmate" && st.winner) {
        const win = st.winner === seatColor();
        title = win ? "Bạn thắng! 🏆" : "Bạn thua 😢";
        text = win ? "Đối thủ bị chiếu bí." : "Vua của bạn bị chiếu bí.";
        lose = !win;
        if (win) SFX.victory();
        else SFX.gameOver();
      } else if (st.result === "stalemate") {
        title = "Hòa cờ 🤝";
        text = "Bên đi không còn nước hợp lệ nào (hết nước đi).";
        SFX.draw();
      } else {
        title = "Hòa cờ 🤝";
        text = "Hòa do luật 50 nước hoặc hai bên không đủ quân chiếu bí.";
        SFX.draw();
      }
      // Online không cộng điểm lưu trên máy
      showOverlay({ title, text, lose });
      return;
    }

    if (st.result === "checkmate") {
      if (mode === "ai") {
        if (st.winner === "w") {
          title = "Bạn thắng! 🏆";
          text = "Chiếu bí Vua Đen. Quá đỉnh!";
          SFX.victory();
        } else {
          title = "Máy thắng 😢";
          text = "Vua Trắng bị chiếu bí. Thử lại nhé!";
          lose = true;
          SFX.gameOver();
        }
      } else {
        title = `${NAMES[st.winner]} thắng! 🏆`;
        text = `Vua ${NAMES[st.winner === "w" ? "b" : "w"]} bị chiếu bí.`;
        SFX.victory();
      }
    } else if (st.result === "stalemate") {
      title = "Hòa cờ 🤝";
      text = "Bên đi không còn nước hợp lệ nào (hết nước đi).";
      SFX.draw();
    } else {
      title = "Hòa cờ 🤝";
      text = "Hòa do luật 50 nước hoặc hai bên không đủ quân chiếu bí.";
      SFX.draw();
    }

    if (st.winner === "w") scores.w++;
    else if (st.winner === "b") scores.b++;
    else scores.d++;
    saveScores();
    paintScores();

    overlayTitle.textContent = title;
    overlayText.textContent = text;
    overlayEl.classList.toggle("lose", lose);
    overlayEl.classList.remove("hidden");

    render();
    updateTurnUI(st);
  }

  /* ---------- Hết giờ ---------- */

  /** Kết thúc ván vì bên `loser` (màu quân) dùng hết thời gian của lượt */
  function finishTimeout(loser) {
    if (over) return;
    over = true;
    busy = false;
    selected = null;
    pendingPromo = null;
    promoEl.classList.add("hidden");

    const winner = loser === "w" ? "b" : "w";
    let title;
    let text;
    let lose = false;

    if (isOnlineMode()) {
      const win = loser !== seatColor();
      title = win ? "Đối thủ hết giờ 🎉" : "Bạn hết giờ 😢";
      text = win ? "Đối thủ đã dùng hết thời gian của lượt." : "Bạn đã dùng hết thời gian của lượt.";
      lose = !win;
    } else if (mode === "ai") {
      const win = loser === "b";
      title = win ? "Máy hết giờ 😅" : "Bạn hết giờ 😢";
      text = win ? "Máy đã dùng hết thời gian của lượt." : "Bạn đã dùng hết thời gian của lượt.";
      lose = !win;
    } else {
      title = `${NAMES[winner]} thắng ⏱`;
      text = `${NAMES[loser]} đã dùng hết thời gian của lượt.`;
    }

    if (typeof SFX.timeout === "function") SFX.timeout();
    else SFX.gameOver();

    showOverlay({ title, text, lose });
  }

  /** Đồng hồ của lượt đang chạy vừa về 0 */
  function onTurnTimeout() {
    if (over) return;

    if (isOnlineMode()) {
      // Chỉ bên có đồng hồ vừa hết mới tuyên bố, tránh xử lý hai lần
      if (!onlineReady() || state.turn !== seatColor()) return;
      finishTimeout(state.turn);
      if (online) online.sendTimeout();
      return;
    }

    finishTimeout(state.turn);
  }

  /** Đối thủ báo họ hết giờ (ghế do server/đối thủ xác nhận) */
  function applyRemoteTimeout(seat) {
    if (!isOnlineMode() || over) return;
    const loser = seat === 1 ? "w" : "b";
    if (loser !== state.turn) return; // lệch trạng thái → bỏ qua
    finishTimeout(loser);
  }

  /* ---------- Hoàn tác / ván mới ---------- */

  function undo() {
    if (busy || pendingPromo || history.length === 0) return;
    if (isOnlineMode()) return; // online không cho hoàn tác (dễ lệch trạng thái hai máy)

    overlayEl.classList.add("hidden");
    over = false;

    do {
      const record = history.pop();
      E.undoMove(state, record);
    } while (mode === "ai" && history.length > 0 && state.turn !== "w");

    const prev = history[history.length - 1];
    lastMove = prev ? { from: prev.move.from, to: prev.move.to } : null;
    selected = null;

    render();
    updateTurnUI();
  }

  function restart(broadcast = true) {
    aiToken++;
    roundId += 1;
    state = E.startState();
    history = [];
    selected = null;
    lastMove = null;
    over = false;
    busy = false;
    pendingPromo = null;
    promoEl.classList.add("hidden");
    overlayEl.classList.add("hidden");

    clock.restart();

    if (broadcast && isOnlineMode() && online && online.ready()) online.sendRestart();

    render();
    updateTurnUI();
  }

  /* ---------- Sự kiện ---------- */

  function setMode(next) {
    if (mode === next) return;
    mode = next;
    for (const b of modeBtns) b.classList.toggle("active", b.dataset.mode === mode);
    diffWrap.classList.toggle("hidden", mode !== "ai");

    if (online) online.setActive(mode === "online");

    paintPlayerNames();
    restart(false);
  }

  function setDifficulty(next) {
    difficulty = next;
    for (const b of diffBtns) b.classList.toggle("active", b.dataset.diff === difficulty);
  }

  function toggleSound() {
    const nowMuted = SFX.toggle();
    soundBtn.textContent = nowMuted ? "🔇" : "🔊";
    soundBtn.classList.toggle("off", nowMuted);
    soundBtn.setAttribute("aria-pressed", String(!nowMuted));
    if (!nowMuted) SFX.click();
  }

  boardEl.addEventListener("click", (e) => {
    SFX.ensure();
    const btn = e.target.closest(".square");
    if (!btn) return;
    onSquare(toBoard(Number(btn.dataset.i)));
  });

  for (const btn of modeBtns) {
    btn.addEventListener("click", () => {
      SFX.ensure();
      if (btn.dataset.mode === mode) return;
      SFX.click();
      setMode(btn.dataset.mode);
    });
  }

  for (const btn of diffBtns) {
    btn.addEventListener("click", () => {
      SFX.ensure();
      if (btn.dataset.diff === difficulty) return;
      SFX.click();
      setDifficulty(btn.dataset.diff);
    });
  }

  for (const btn of timeBtns) {
    btn.addEventListener("click", () => {
      SFX.ensure();
      if (Number(btn.dataset.time) === clock.turnTime) return;
      SFX.click();
      clock.set(Number(btn.dataset.time));
    });
  }

  undoBtn.addEventListener("click", () => {
    SFX.ensure();
    SFX.click();
    undo();
  });

  restartBtn.addEventListener("click", () => {
    SFX.ensure();
    SFX.click();
    restart();
  });

  overlayBtn.addEventListener("click", () => {
    SFX.click();
    restart();
  });

  soundBtn.addEventListener("click", () => {
    SFX.ensure();
    toggleSound();
  });

  window.addEventListener("keydown", (e) => {
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
    } else if (k === "escape" && pendingPromo) {
      pendingPromo = null;
      promoEl.classList.add("hidden");
    }
  });

  /* ---------- Khởi động ---------- */

  function init() {
    buildBoard();
    paintScores();
    paintPlayerNames();

    const muted = SFX.isMuted();
    soundBtn.textContent = muted ? "🔇" : "🔊";
    soundBtn.classList.toggle("off", muted);
    soundBtn.setAttribute("aria-pressed", String(!muted));

    if (online) online.init();
    clock.paintButtons();

    render();
    updateTurnUI();

    // Vào từ link mời: /chess/?room=ABCDE
    const invited = online ? online.invitedCode() : "";
    if (invited) {
      setMode("online");
      if (online) {
        online.setStatus(`Đang vào phòng ${invited}…`);
        online.joinRoom(invited);
      }
    }
  }

  init();
})();
