/* ============================================================
   Âm thanh tổng hợp bằng Web Audio API
   -> Không cần file .mp3, không cần mạng, dung lượng 0KB
   ============================================================ */
window.Sound = (() => {
  "use strict";

  const KEY = "snake-muted";
  let ctx = null;
  let master = null;
  let muted = localStorage.getItem(KEY) === "1";

  function ensure() {
    if (muted) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.4;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  /** Một nốt đơn: có thể trượt tần số (freq -> to) */
  function tone({
    freq = 440,
    to = 0,
    type = "sine",
    dur = 0.14,
    vol = 0.5,
    delay = 0,
    attack = 0.008,
  }) {
    const ac = ensure();
    if (!ac) return;

    const t0 = ac.currentTime + delay;
    const osc = ac.createOscillator();
    const gain = ac.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), t0 + dur);

    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(gain).connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  /** Tiếng nổ / va chạm: nhiễu trắng đã lọc + tắt dần */
  function noise(dur = 0.4, vol = 0.3) {
    const ac = ensure();
    if (!ac) return;

    const len = Math.floor(ac.sampleRate * dur);
    const buffer = ac.createBuffer(1, len, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }

    const src = ac.createBufferSource();
    src.buffer = buffer;

    const filter = ac.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1400;

    const gain = ac.createGain();
    gain.gain.value = vol;

    src.connect(filter).connect(gain).connect(master);
    src.start(ac.currentTime);
  }

  const api = {
    ensure,
    isMuted: () => muted,

    setMuted(value) {
      muted = Boolean(value);
      localStorage.setItem(KEY, muted ? "1" : "0");
      if (muted && ctx) ctx.suspend();
      else ensure();
    },

    toggle() {
      api.setMuted(!muted);
      return muted;
    },

    /* ---------- Hiệu ứng gameplay ---------- */

    // Ăn mồi: cao dần theo chuỗi combo để tạo cảm giác "lên đô"
    eat(n = 0) {
      const k = Math.min(n, 14);
      tone({ freq: 520 + k * 26, to: 820 + k * 30, type: "triangle", dur: 0.1, vol: 0.42 });
      tone({ freq: 1040 + k * 40, type: "sine", dur: 0.07, vol: 0.14, delay: 0.02 });
    },

    // Đổi hướng: tiếng tick rất nhỏ
    turn() {
      tone({ freq: 320, to: 250, type: "square", dur: 0.035, vol: 0.05 });
    },

    pause() {
      tone({ freq: 420, to: 300, type: "sine", dur: 0.12, vol: 0.2 });
    },

    click() {
      tone({ freq: 660, to: 900, type: "sine", dur: 0.08, vol: 0.22 });
    },

    // Qua màn: hợp âm rải đi lên
    levelUp() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        tone({ freq: f, type: "triangle", dur: 0.2, vol: 0.38, delay: i * 0.085 })
      );
    },

    // Phá đảo
    win() {
      [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((f, i) =>
        tone({ freq: f, type: "triangle", dur: 0.28, vol: 0.38, delay: i * 0.13 })
      );
      tone({ freq: 1567.98, type: "sine", dur: 0.6, vol: 0.16, delay: 0.72 });
    },

    // Thua: tụt tông + nổ nhiễu
    gameOver() {
      tone({ freq: 340, to: 60, type: "sawtooth", dur: 0.6, vol: 0.32 });
      tone({ freq: 180, to: 40, type: "square", dur: 0.5, vol: 0.16, delay: 0.05 });
      noise(0.5, 0.22);
    },

    /* ---------- Hiệu ứng dùng cho game khác (caro, 2048...) ---------- */

    // Đặt quân
    place(mine = true) {
      tone({
        freq: mine ? 300 : 240,
        to: mine ? 180 : 150,
        type: "square",
        dur: 0.06,
        vol: 0.12,
      });
      tone({ freq: mine ? 900 : 700, type: "sine", dur: 0.05, vol: 0.07 });
    },

    // Nước đi không hợp lệ
    error() {
      tone({ freq: 150, to: 90, type: "sawtooth", dur: 0.16, vol: 0.18 });
    },

    // Thắng
    victory() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        tone({ freq: f, type: "triangle", dur: 0.26, vol: 0.36, delay: i * 0.11 })
      );
      tone({ freq: 1318.51, type: "sine", dur: 0.5, vol: 0.14, delay: 0.5 });
    },

    // Hoà
    draw() {
      tone({ freq: 440, to: 392, type: "triangle", dur: 0.22, vol: 0.28 });
      tone({ freq: 330, to: 294, type: "triangle", dur: 0.28, vol: 0.22, delay: 0.16 });
    },

    // Đồng hồ điểm giây cuối (urgent = 3 giây cuối, to hơn)
    tick(urgent = false) {
      tone({
        freq: urgent ? 900 : 660,
        type: "square",
        dur: 0.035,
        vol: urgent ? 0.13 : 0.06,
      });
    },

    // Hết thời gian chờ
    timeout() {
      tone({ freq: 520, to: 110, type: "sawtooth", dur: 0.55, vol: 0.3 });
      tone({ freq: 260, to: 70, type: "square", dur: 0.45, vol: 0.15, delay: 0.06 });
      noise(0.35, 0.18);
    },
  };

  return api;
})();
