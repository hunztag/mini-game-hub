/* ============================================================
   ĐỒNG HỒ MỖI LƯỢT — dùng chung cho cờ vua / cờ tướng
   ------------------------------------------------------------
       const clock = GameClock.create({
         els: { bar, fill, text, btns },     // btns = [.time-btn]
         storeKey: "chess-turn-time",        // nhớ lựa chọn trong localStorage
         turnTime: 0,                        // 0 = không giới hạn
         isOver: () => over,
         hasStarted: () => history.length > 0,
         shouldRun: () => true,              // đồng hồ có nên đếm không
         key: () => "..." ,                  // đổi key = đếm lại từ đầu
         onTimeout: () => {},                // người đang đến lượt hết giờ
         onChange: (value) => {},            // người chơi vừa đổi giới hạn
       });

       clock.sync();      // gọi sau mỗi thay đổi trạng thái ván
       clock.set(60);     // đổi giới hạn (+ lưu localStorage)
   ============================================================ */
window.GameClock = (() => {
  "use strict";

  const TIMES = [0, 30, 60, 120];
  const WARN_AT = 10; // giây: bắt đầu cảnh báo
  const URGENT_AT = 5; // giây: đỏ + tick mạnh

  function create(cfg) {
    const els = cfg.els || {};
    const storeKey = cfg.storeKey || "turn-time";
    const btns = Array.from(els.btns || []);

    let turnTime = loadTurnTime();
    let leftMs = turnTime > 0 ? turnTime * 1000 : 0;
    let timer = 0;
    let deadline = 0;
    let key = "";
    let lastTickSecond = -1;

    function loadTurnTime() {
      let n = 0;
      try {
        n = Number(localStorage.getItem(storeKey));
      } catch {
        n = 0;
      }
      if (!TIMES.includes(n)) n = Number(cfg.turnTime) || 0;
      return TIMES.includes(n) ? n : 0;
    }

    function paintButtons() {
      for (const b of btns) {
        const on = Number(b.dataset.time) === turnTime;
        b.classList.toggle("active", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      }
    }

    function format(ms) {
      const total = Math.max(0, Math.ceil(ms / 1000));
      const m = Math.floor(total / 60);
      const s = total % 60;
      return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
    }

    function render() {
      const bar = els.bar;
      const fill = els.fill;
      const text = els.text;
      if (bar) bar.classList.remove("warn", "danger");

      if (!turnTime) {
        if (bar) bar.classList.add("idle");
        if (fill) fill.style.width = "0%";
        if (text) text.textContent = "Không giới hạn · chọn 30s / 60s / 120s để bật";
        return;
      }

      const over = Boolean(cfg.isOver && cfg.isOver());
      const started = Boolean(cfg.hasStarted && cfg.hasStarted());

      if (!started && !over) {
        if (bar) bar.classList.add("idle");
        if (fill) fill.style.width = "0%";
        if (text) text.textContent = `⏱ ${turnTime}s mỗi lượt · bắt đầu từ nước đầu tiên`;
        return;
      }

      if (bar) bar.classList.remove("idle");
      const ratio = Math.max(0, Math.min(1, leftMs / (turnTime * 1000)));
      if (fill) fill.style.width = `${(ratio * 100).toFixed(1)}%`;
      if (text) text.textContent = `⏱ ${format(leftMs)} còn lại`;

      const secs = Math.ceil(leftMs / 1000);
      if (bar) {
        bar.classList.toggle("danger", secs <= URGENT_AT);
        bar.classList.toggle("warn", secs > URGENT_AT && secs <= WARN_AT);
      }
    }

    function stop() {
      if (timer) {
        clearInterval(timer);
        timer = 0;
      }
      lastTickSecond = -1;
    }

    function tick() {
      leftMs = Math.max(0, deadline - performance.now());
      const secs = Math.ceil(leftMs / 1000);

      if (secs > 0 && secs <= URGENT_AT && secs !== lastTickSecond) {
        lastTickSecond = secs;
        const sfx = window.Sound;
        if (sfx && typeof sfx.tick === "function") sfx.tick(secs <= 3);
      }

      render();

      if (leftMs <= 0) {
        stop();
        if (cfg.onTimeout) cfg.onTimeout();
      }
    }

    /**
     * Đồng bộ theo trạng thái ván. Nếu key không đổi thì chỉ vẽ lại
     * (tránh reset giờ liên tục sau mỗi lần render).
     */
    function sync() {
      const next = cfg.key ? String(cfg.key()) : `${turnTime}`;

      if (next === key) {
        render();
        return;
      }
      key = next;
      stop();

      if (!(cfg.isOver && cfg.isOver())) leftMs = turnTime > 0 ? turnTime * 1000 : 0;
      render();

      if (!turnTime) return;
      if (cfg.isOver && cfg.isOver()) return;
      if (cfg.shouldRun && !cfg.shouldRun()) return;

      deadline = performance.now() + leftMs;
      timer = window.setInterval(tick, 100);
    }

    /** Người chơi bấm chọn 30s / 60s / 120s / Không */
    function set(value, broadcast = true) {
      const next = TIMES.includes(Number(value)) ? Number(value) : 0;
      if (next === turnTime) return;
      turnTime = next;
      try {
        localStorage.setItem(storeKey, String(turnTime));
      } catch {
        /* chế độ riêng tư có thể chặn localStorage */
      }
      paintButtons();
      leftMs = turnTime > 0 ? turnTime * 1000 : 0;
      key = ""; // buộc đếm lại từ đầu
      sync();
      if (broadcast && cfg.onChange) cfg.onChange(turnTime);
    }

    /** Ván mới: xoá key để lần sync() sau đếm lại từ đầu */
    function restart() {
      stop();
      leftMs = turnTime > 0 ? turnTime * 1000 : 0;
      key = "";
    }

    /** Dừng hẳn (rời chế độ chơi) */
    function dispose() {
      stop();
    }

    paintButtons();

    return {
      set,
      sync,
      restart,
      dispose,
      paintButtons,
      get turnTime() {
        return turnTime;
      },
      get leftMs() {
        return leftMs;
      },
    };
  }

  return { create, TIMES };
})();
