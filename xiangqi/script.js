/* ============================================================
   Cờ Tướng — UI + luật chơi (engine nằm trong engine.js)
   ============================================================ */
(() => {
  "use strict";

  const X = window.XiangqiEngine;

  const SFX = window.Sound || {
    ensure() {}, place() {}, error() {}, victory() {}, draw() {}, click() {},
    gameOver() {}, tick() {}, timeout() {},
    isMuted: () => false,
    toggle: () => false,
  };

  const GLYPH = {
    r: { K: "帥", A: "仕", B: "相", N: "傌", R: "俥", C: "炮", P: "兵" },
    b: { K: "將", A: "士", B: "象", N: "馬", R: "車", C: "砲", P: "卒" },
  };
  const PIECE_NAME = {
    K: "Tướng", A: "Sĩ", B: "Tượng", N: "Mã", R: "Xe", C: "Pháo", P: "Tốt",
  };
  const NAMES = { r: "Đỏ", b: "Đen" };
  const FILES = "abcdefghi";
  const STORE_KEY = "xiangqi-score";

  const surface = document.getElementById("surface");
  const boardEl = document.getElementById("board");
  const statusEl = document.getElementById("status");
  const overlayEl = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayText = document.getElementById("overlay-text");
  const overlayBtn = document.getElementById("overlay-btn");
  const undoBtn = document.getElementById("undo-btn");
  const restartBtn = document.getElementById("restart-btn");
  const soundBtn = document.getElementById("sound-btn");
  const diffWrap = document.getElementById("difficulty");
  const pRed = document.getElementById("p-red");
  const pBlack = document.getElementById("p-black");
  const pNameRed = pRed.querySelector(".pname");
  const pNameBlack = pBlack.querySelector(".pname");
  const scoreRedEl = document.getElementById("score-red");
  const scoreBlackEl = document.getElementById("score-black");
  const modeBtns = Array.from(document.querySelectorAll(".mode"));
  const diffBtns = Array.from(document.querySelectorAll(".diff"));
  const timeBtns = Array.from(document.querySelectorAll(".time-btn"));

  let state = X.startState();
  let mode = "ai"; // "ai" | "pvp" | "online"  (AI cầm Đen, người chơi cầm Đỏ)
  let difficulty = "normal";
  let selected = null;
  let history = [];
  let lastMove = null;
  let over = false;
  let busy = false;
  let aiToken = 0;
  let roundId = 0; // tăng mỗi ván mới → đồng hồ biết phải đếm lại
  let scores = loadScores();
  let online = null; // transport + bảng phòng (assets/online.js)

  /* ---------- Điểm số ---------- */

  function loadScores() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
      return { r: Number(raw.r) || 0, b: Number(raw.b) || 0, d: Number(raw.d) || 0 };
    } catch {
      return { r: 0, b: 0, d: 0 };
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
    scoreRedEl.textContent = scores.r;
    scoreBlackEl.textContent = scores.b;
    scoreRedEl.title = `${scores.r} thắng · ${scores.d} hòa`;
    scoreBlackEl.title = `${scores.b} thắng · ${scores.d} hòa`;
  }

  /* ---------- Phía của người chơi (chế độ online) ---------- */

  /** Ghế 1 = chủ phòng = Đỏ (đi trước) · ghế 2 = khách = Đen */
  function seatColor() {
    return online && online.seat === 2 ? "b" : "r";
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

  /** Vị trí hiển thị ↔ chỉ số ô trong engine (bàn 9×10 = 90 ô) */
  const toBoard = (d) => (flipped() ? 89 - d : d);

  /* ---------- Đồng hồ mỗi lượt ---------- */

  const clock = window.GameClock
    ? window.GameClock.create({
        els: {
          bar: document.getElementById("clock"),
          fill: document.getElementById("clock-fill"),
          text: document.getElementById("clock-text"),
          btns: timeBtns,
        },
        storeKey: "xiangqi-turn-time",
        isOver: () => over,
        hasStarted: () => history.length > 0,
        shouldRun: () => {
          if (over || !clock.turnTime || !history.length) return false;
          if (mode === "ai") return state.turn === "r";
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
        game: "xiangqi",
        seatName: (seat) => (seat === 1 ? "Đỏ (đi trước)" : "Đen"),
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

  function buildBoard() {
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const i = r * 9 + c;

        const sq = document.createElement("button");
        sq.type = "button";
        sq.className = "sq";
        sq.dataset.i = String(i);
        sq.style.setProperty("--c", String(c));
        sq.style.setProperty("--r", String(r));
        sq.setAttribute("role", "gridcell");

        const pc = document.createElement("span");
        pc.className = "pc";
        sq.appendChild(pc);

        surface.appendChild(sq);
        squares[i] = sq;
        pieceEls[i] = pc;
      }
    }
  }

  /* ---------- Vẽ lại ---------- */

  function render() {
    const legal = over ? [] : X.genLegalMoves(state);
    const inChk = X.inCheck(state, state.turn);
    const checkSq = inChk ? state.kings[state.turn] : -1;

    const targets = new Map(); // to -> ăn quân?
    if (selected !== null) {
      for (const m of legal) {
        if (m.from === selected) targets.set(m.to, Boolean(m.capture));
      }
    }

    for (let d = 0; d < 90; d++) {
      const i = toBoard(d);
      const sq = squares[d];
      const p = state.board[i];

      sq.className = "sq";
      if (lastMove && (i === lastMove.from || i === lastMove.to)) sq.classList.add("last");
      if (i === selected) sq.classList.add("sel");
      if (targets.has(i)) sq.classList.add(targets.get(i) ? "cap" : "mv");
      if (i === checkSq) sq.classList.add("check");

      const el = pieceEls[d];
      const side = p ? (p === p.toUpperCase() ? "r" : "b") : "";
      const glyph = p ? GLYPH[side][p.toUpperCase()] : "";
      const label = p
        ? `${NAMES[side]} ${PIECE_NAME[p.toUpperCase()]} ${FILES[i % 9]}${10 - ((i / 9) | 0)}`
        : "";

      if (el.textContent !== glyph) {
        el.textContent = glyph;
        el.className = "pc" + (side ? " " + side : "");
        if (p) {
          void el.offsetWidth; // chạy lại animation
          el.classList.add("pop");
        }
      }
      if (label) el.setAttribute("aria-label", label);
      else el.removeAttribute("aria-label");
      sq.setAttribute("aria-label", label || `Ô ${FILES[i % 9]}${10 - ((i / 9) | 0)}`);
    }
  }

  /* ---------- Trạng thái / thanh lượt ---------- */

  function paintPlayerNames() {
    const mine = isOnlineMode() ? seatColor() : null;
    pNameRed.textContent = mine === "r" ? "Đỏ · bạn" : "Đỏ";
    pNameBlack.textContent = mine === "b" ? "Đen · bạn" : "Đen";
  }

  function updateTurnUI(status) {
    const st = status || X.getStatus(state);

    pRed.classList.toggle("active", !st.over && state.turn === "r");
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
    const undo = X.makeMove(state, move);
    history.push(undo);

    lastMove = { from: move.from, to: move.to };
    selected = null;

    if (move.capture) SFX.place(false);
    else SFX.place(true);

    // Gửi cho đối thủ sau khi đã áp dụng ở máy mình (remote = nước của họ, không gửi lại)
    if (!remote && isOnlineMode() && online && online.ready()) {
      online.sendMove({ from: move.from, to: move.to });
    }

    render();

    const st = X.getStatus(state);
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

    if (!Number.isInteger(from) || !Number.isInteger(to)) return;
    if (from < 0 || from > 89 || to < 0 || to > 89) return;

    const move = X.genLegalMoves(state).find((m) => m.from === from && m.to === to);
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
      if (token !== aiToken || over || mode !== "ai" || state.turn !== "b") {
        busy = false;
        updateTurnUI();
        return;
      }
      busy = false;
      const move = X.findBestMove(state, difficulty);
      if (move) applyMove(move);
      else updateTurnUI();
    }, 200);
  }

  /* ---------- Chọn ô ---------- */

  function onSquare(i) {
    if (over || busy) return;
    if (mode === "ai" && state.turn !== "r") return;
    if (isOnlineMode()) {
      if (!onlineReady()) return;
      if (state.turn !== seatColor()) return;
    }

    const p = state.board[i];
    const mine = Boolean(p) && (p === p.toUpperCase() ? "r" : "b") === state.turn;

    if (selected !== null) {
      if (i === selected) {
        selected = null;
        SFX.click();
        render();
        return;
      }

      const match = X.genLegalMoves(state).find((m) => m.from === selected && m.to === i);
      if (match) {
        applyMove(match);
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

    const winner = st.winner;

    if (isOnlineMode()) {
      if (winner) {
        const win = winner === seatColor();
        title = win ? "Bạn thắng! 🏆" : "Bạn thua 😢";
        text =
          st.result === "checkmate"
            ? win
              ? `Tướng ${NAMES[X.other(winner)]} bị chiếu bí.`
              : `Tướng của bạn bị chiếu bí.`
            : win
            ? `${NAMES[X.other(winner)]} hết nước đi.`
            : "Bạn hết nước đi.";
        lose = !win;
        if (win) SFX.victory();
        else SFX.gameOver();
      } else {
        title = "Hòa cờ 🤝";
        text = "Hai bên không còn cách thắng.";
        SFX.draw();
      }
      // Online không cộng điểm lưu trên máy
      showOverlay({ title, text, lose });
      return;
    }

    if (mode === "ai") {
      if (winner === "r") {
        title = "Bạn thắng! 🏆";
        text =
          st.result === "checkmate"
            ? "Chiếu bí Tướng Đen. Quá đỉnh!"
            : "Đen hết nước đi — theo luật cờ tướng, Đen thua.";
        SFX.victory();
      } else {
        title = "Máy thắng 😢";
        text =
          st.result === "checkmate"
            ? "Tướng Đỏ bị chiếu bí. Thử lại nhé!"
            : "Đỏ hết nước đi — theo luật cờ tướng, Đỏ thua.";
        lose = true;
        SFX.gameOver();
      }
    } else if (winner) {
      title = `${NAMES[winner]} thắng! 🏆`;
      text =
        st.result === "checkmate"
          ? `Tướng ${NAMES[X.other(winner)]} bị chiếu bí.`
          : `${NAMES[X.other(winner)]} hết nước đi.`;
      SFX.victory();
    } else {
      title = "Hòa cờ 🤝";
      text = "Hai bên không còn cách thắng.";
      SFX.draw();
    }

    if (winner === "r") scores.r++;
    else if (winner === "b") scores.b++;
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

    const winner = X.other(loser);
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
    const loser = seat === 1 ? "r" : "b";
    if (loser !== state.turn) return; // lệch trạng thái → bỏ qua
    finishTimeout(loser);
  }

  /* ---------- Hoàn tác / ván mới ---------- */

  function undo() {
    if (busy || history.length === 0) return;
    if (isOnlineMode()) return; // online không cho hoàn tác (dễ lệch trạng thái hai máy)

    overlayEl.classList.add("hidden");
    over = false;

    do {
      const record = history.pop();
      X.undoMove(state, record);
    } while (mode === "ai" && history.length > 0 && state.turn !== "r");

    const prev = history[history.length - 1];
    lastMove = prev ? { from: prev.move.from, to: prev.move.to } : null;
    selected = null;

    render();
    updateTurnUI();
  }

  function restart(broadcast = true) {
    aiToken++;
    roundId += 1;
    state = X.startState();
    history = [];
    selected = null;
    lastMove = null;
    over = false;
    busy = false;
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
    const btn = e.target.closest(".sq");
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

    // Vào từ link mời: /xiangqi/?room=ABCDE
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
