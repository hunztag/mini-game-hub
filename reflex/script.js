/* ============================================================
   PHẢN XẠ NGOẠI NGỮ — logic game
   ------------------------------------------------------------
   • Người chơi chọn ngôn ngữ (pack) → cấp độ → màn.
   • Mỗi câu có giới hạn thời gian riêng, trả lời ĐÚNG và NHANH
     để được nhiều điểm; sai hoặc hết giờ mất 1 mạng (3 mạng).
   • Qua màn sẽ mở màn tiếp theo, kỷ lục lưu bằng localStorage.
   • Toàn bộ nội dung nằm ở data.js (dễ thêm ngôn ngữ mới).
   ============================================================ */
(() => {
  "use strict";

  const DATA = window.ReflexData || { packs: [] };
  const PY =
    window.ReflexPinyin ||
    { toneless: () => [], answers: (p) => [p], mask: (p) => p, hasCjk: () => false, hasTone: () => false };

  /* Bộ dữ liệu phần Học — mỗi ngôn ngữ một bộ chủ đề riêng */
  const LESSON_SETS = {
    en: window.ReflexLessons || { topics: [] },
    zh: window.ReflexLessonsZh || { topics: [] },
  };
  const LESSON_LANGS = [
    { id: "en", flag: "🇬🇧", label: "English", voice: "en-US" },
    { id: "zh", flag: "🇨🇳", label: "中文", voice: "zh-CN" },
  ].filter((lang) => LESSON_SETS[lang.id] && LESSON_SETS[lang.id].topics.length);

  const KEY_LANG = "reflex-lang";
  const KEY_PROGRESS = "reflex-progress";
  const KEY_LAST = "reflex-last";
  const KEY_LEARNED = "reflex-learned";
  const KEY_STUDY = "reflex-study";
  const KEY_STATS = "reflex-stats";
  const KEY_WRONG = "reflex-wrong";
  const KEY_DAILY = "reflex-daily";
  const KEY_STRICT = "reflex-strict";
  const KEY_SLOW = "reflex-slow";

  const MAX_LIVES = 3;
  const HINT_PENALTY = 3000; // mở gợi ý mất 3 giây
  const TICK_MS = 50;
  const DAY_MS = 86400000;
  const DAILY_GOAL = 20; // câu mỗi ngày
  /* Thang giãn cách (ngày) theo số lần nhớ đúng liên tiếp — lặp lại ngắt quãng */
  const SRS_STEPS = [0, 1, 3, 7, 21, 45, 90];

  /* ---------- Tiện ích ---------- */
  const $ = (id) => document.getElementById(id);
  const esc = (value) =>
    String(value == null ? "" : value).replace(/[&<>"']/g, (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])
    );

  function play(name, ...args) {
    const fn = window.Sound && window.Sound[name];
    if (typeof fn !== "function") return;
    try {
      fn.apply(window.Sound, args);
    } catch (_) {
      /* âm thanh không quan trọng */
    }
  }

  function readLocal(key) {
    try {
      return localStorage.getItem(key) || "";
    } catch (_) {
      return "";
    }
  }

  function writeLocal(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (_) {
      /* trình duyệt chặn localStorage */
    }
  }

  function readJson(key) {
    try {
      const raw = localStorage.getItem(key);
      const obj = raw ? JSON.parse(raw) : null;
      return obj && typeof obj === "object" ? obj : null;
    } catch (_) {
      return null;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {
      /* bỏ qua */
    }
  }

  function shuffle(list) {
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  /* ---------- So khớp câu trả lời ---------- */
  function norm(value) {
    return String(value == null ? "" : value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[’‘`´]/g, "'")
      .replace(/[-–—]/g, "")
      .replace(/[^a-z0-9' ]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  const stripArticle = (text) => text.replace(/^(a|an|the)\s+/, "");

  /** Chuẩn hoá GIỮ chữ Hán (norm() xoá mất chữ Hán) */
  function normCjk(value) {
    return String(value == null ? "" : value)
      .toLowerCase()
      .replace(/[’‘`´]/g, "'")
      .replace(/[^\u3400-\u4dbf\u4e00-\u9fffa-z0-9' ]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  const hasCjk = (value) => PY.hasCjk(String(value == null ? "" : value));

  function editDistance(a, b, cap) {
    const la = a.length;
    const lb = b.length;
    if (Math.abs(la - lb) > cap) return cap + 1;

    let prev = new Array(lb + 1);
    let cur = new Array(lb + 1);
    for (let j = 0; j <= lb; j += 1) prev[j] = j;

    for (let i = 1; i <= la; i += 1) {
      cur[0] = i;
      let best = cur[0];
      for (let j = 1; j <= lb; j += 1) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
        if (cur[j] < best) best = cur[j];
      }
      if (best > cap) return cap + 1;
      const swap = prev;
      prev = cur;
      cur = swap;
    }
    return prev[lb];
  }

  /** So khớp "dễ thở": không phân biệt hoa/thường, dấu câu, a/an/the, cho phép sai 1 ký tự
      Đặc biệt cho tiếng Trung: gõ chữ Hán, pinyin có dấu hay KHÔNG DẤU đều đúng */
  function matches(input, answer) {
    const rawInput = normCjk(input);
    const rawAnswer = normCjk(answer);
    if (rawInput && rawAnswer) {
      if (rawInput === rawAnswer) return true;
      if (rawInput.replace(/ /g, "") === rawAnswer.replace(/ /g, "")) return true;
    }

    const a = norm(input);
    const b = norm(answer);
    if (!a || !b) return false;
    if (a === b) return true;
    // "ni hao" ≈ "nihao" (gõ pinyin không khoảng trắng)
    if (a.replace(/ /g, "") === b.replace(/ /g, "")) return true;
    if (stripArticle(a) === stripArticle(b)) return true;
    if (!b.includes(" ") && b.length >= 6 && editDistance(a, b, 1) <= 1) return true;
    return false;
  }

  function openValid(text) {
    const n = norm(text);
    if (!n) return false;
    return n.split(" ").filter(Boolean).length >= 2 && n.length >= 4;
  }

  /* ---------- Dấu thanh (pinyin) ---------- */
  const TONE_MARK = { "\u0304": "1", "\u0301": "2", "\u030c": "3", "\u0300": "4" };

  /** Pinyin KHÔNG DẤU (bỏ mọi dấu thanh/dấu mũ) → so được âm tiết */
  function toneKey(value) {
    return String(value == null ? "" : value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // bỏ toàn bộ dấu (ā→a, ǚ→u, ü→u)
      .replace(/đ/g, "d")
      .replace(/[’‘`´]/g, "'")
      .replace(/v/g, "u") // người học hay gõ "lv" thay cho "lǚ"
      .replace(/[1-5](?=\s|$)/g, "") // bỏ số thanh kiểu "ma3"
      .replace(/[^a-z0-9']/g, "")
      .trim();
  }

  /** Chuỗi thanh của từng âm tiết: "nǐ hǎo" → "32", "ni hao" → "00" */
  function toneSig(value) {
    const s = String(value == null ? "" : value)
      .toLowerCase()
      .normalize("NFD");
    const out = [];
    let tone = "0";
    let has = false;
    for (const ch of s) {
      if (TONE_MARK[ch]) {
        tone = TONE_MARK[ch];
        has = true;
        continue;
      }
      if (/[\u0300-\u036f]/.test(ch)) continue; // dấu khác (ü…)
      if (/[1-5]/.test(ch)) {
        // kiểu gõ số: "ma3"
        tone = ch === "5" ? "0" : ch;
        has = true;
        continue;
      }
      if (/[a-z0-9]/.test(ch)) {
        has = true;
        continue;
      }
      if (/[\s'-]/.test(ch) && has) {
        out.push(tone);
        tone = "0";
        has = false;
      }
    }
    if (has) out.push(tone);
    return out.join("");
  }

  /** Chế độ khắt khe dấu thanh: mặc định BẬT cho mọi đáp án là pinyin */
  function strictToneOn() {
    const saved = readLocal(KEY_STRICT);
    if (saved === "1") return true;
    if (saved === "0") return false;
    return true;
  }

  /**
   * Chấm câu trả lời:
   *  "ok"   → đúng
   *  "tone" → đúng âm tiết nhưng SAI dấu thanh (chỉ khi bật 🎯 Dấu thanh)
   *  "no"   → sai
   * Đáp án tiếng Trung gồm chữ Hán + pinyin có dấu + pinyin không dấu, mà hàm
   * matches() lại bỏ qua dấu, nên phải xét riêng nhóm pinyin có dấu trước —
   * nếu không thì gõ "jia" sẽ luôn được tính đúng dù thiếu dấu thanh.
   */
  function judgeAnswers(input, answers) {
    const list = (answers || []).filter(Boolean);
    const value = String(input == null ? "" : input).trim();
    if (!value) return "no";

    // 1) gõ đúng chữ Hán → luôn đúng
    if (hasCjk(value) && list.some((ans) => hasCjk(ans) && matches(value, ans))) return "ok";

    // 2) nhóm pinyin có dấu thanh: phải so cả dấu
    const toned = list.filter((ans) => !hasCjk(ans) && PY.hasTone(ans));
    if (toned.length && strictToneOn()) {
      const same = toned.find((ans) => toneKey(value) === toneKey(ans));
      if (same) return toneSig(value) === toneSig(same) ? "ok" : "tone";
      return list.some((ans) => matches(value, ans)) ? "tone" : "no";
    }

    // 3) so khớp dễ thở (pinyin không dấu / tiếng Anh…)
    return list.some((ans) => matches(value, ans)) ? "ok" : "no";
  }

  /* ---------- DOM ---------- */
  const els = {
    menu: $("menu"),
    play: $("play"),
    langChip: $("lang-chip"),
    langSelect: $("lang-select"),
    levels: $("levels"),
    stages: $("stages"),
    startBtn: $("start-btn"),
    resetBtn: $("reset-progress-btn"),
    stageTitle: $("stage-title"),
    hudProgress: $("hud-progress"),
    hudScore: $("hud-score"),
    hudCombo: $("hud-combo"),
    hudLives: $("hud-lives"),
    timer: $("timer"),
    timerFill: $("timer-fill"),
    timerText: $("timer-text"),
    promptKind: $("prompt-kind"),
    promptText: $("prompt-text"),
    promptHint: $("prompt-hint"),
    choices: $("choices"),
    speakBtn: $("speak-btn"),
    form: $("answer-form"),
    input: $("answer-input"),
    hintBtn: $("hint-btn"),
    quitBtn: $("quit-btn"),
    feedback: $("feedback"),
    overlay: $("overlay"),
    ovTitle: $("overlay-title"),
    ovText: $("overlay-text"),
    ovActions: $("overlay-actions"),
    soundBtn: $("sound-btn"),
    tabs: $("tabs"),
    tabPlay: $("tab-play"),
    tabStudy: $("tab-study"),
    study: $("study"),
    studyLangs: $("study-langs"),
    topics: $("topics"),
    studyRandom: $("study-random"),
    lesson: $("lesson"),
    lessonBack: $("lesson-back"),
    lessonIcon: $("lesson-icon"),
    lessonName: $("lesson-name"),
    lessonLang: $("lesson-lang"),
    lessonLevels: $("lesson-levels"),
    studyFill: $("study-fill"),
    studyCount: $("study-count"),
    studyHideVi: $("study-hide-vi"),
    studySearch: $("study-search"),
    studyList: $("study-list"),
    studyPractice: $("study-practice"),
    studyMarkAll: $("study-mark-all"),
    lessonReview: $("lesson-review"),
    lessonStrict: $("lesson-strict"),
    studyNote: $("study-note"),
    saveCard: $("save-card"),
    studyResume: $("study-resume"),
    strictBtn: $("strict-btn"),
    slowBtn: $("slow-btn"),
    survivalBtn: $("survival-btn"),
    exportBtn: $("export-btn"),
    importBtn: $("import-btn"),
    importFile: $("import-file"),
  };

  /* ---------- Trạng thái ---------- */
  const state = {
    pack: null,
    mode: "stage", // "stage" = chơi theo màn, "custom" = luyện từ chủ đề
    custom: null,
    customBack: "lesson",
    topicId: "",
    topicLevelId: "basic",
    studyLang: "en",
    levelMap: {},
    search: "",
    hideVi: false,
    levelId: "",
    level: null,
    stageIdx: 0,
    list: [],
    idx: 0,
    current: null,
    score: 0,
    combo: 0,
    maxCombo: 0,
    correct: 0,
    lives: MAX_LIVES,
    running: false,
    locked: false,
    hintUsed: false,
    deadline: 0,
    totalMs: 0,
    timerId: 0,
    nextTimer: 0,
    lastTick: -1,
    requeued: null, // câu đã sai và đã được đẩy xuống cuối lượt
  };

  /* ---------- Tiến độ ---------- */
  const progressKey = (levelId, idx) => `${state.pack.id}|${levelId}|${idx}`;

  function loadProgress() {
    return readJson(KEY_PROGRESS) || {};
  }

  function recordOf(levelId, idx) {
    const rec = loadProgress()[progressKey(levelId, idx)];
    return rec && typeof rec === "object" ? { best: rec.best || 0, cleared: !!rec.cleared } : { best: 0, cleared: false };
  }

  function isUnlocked(levelId, idx) {
    if (idx <= 0) return true;
    return recordOf(levelId, idx - 1).cleared;
  }

  const currentLevel = () =>
    state.pack.levels.find((lv) => lv.id === state.levelId) || state.pack.levels[0];

  /* ============================================================
     CHẾ ĐỘ HỌC — duyệt từ vựng theo chủ đề
     ============================================================ */
  const studySet = () => LESSON_SETS[state.studyLang] || LESSON_SETS.en || { topics: [] };
  const studyTopics = () => studySet().topics || [];
  const studyLangInfo = () => LESSON_LANGS.find((l) => l.id === state.studyLang) || LESSON_LANGS[0] || null;

  const itemKey = (topicId, levelId, index) => `${state.studyLang}|${topicId}|${levelId}|${index}`;
  const legacyItemKey = (topicId, levelId, index) => `${topicId}|${levelId}|${index}`;

  /** Đã thuộc chưa — tính theo ngôn ngữ chỉ định (không phụ thuộc state.studyLang) */
  function learnedFor(langId, map, topicId, levelId, index) {
    if (map[`${langId}|${topicId}|${levelId}|${index}`]) return true;
    // dữ liệu cũ (trước khi có nhiều ngôn ngữ) không có tiền tố ngôn ngữ
    return langId === "en" && !!map[legacyItemKey(topicId, levelId, index)];
  }

  function isLearned(map, topicId, levelId, index) {
    return learnedFor(state.studyLang, map, topicId, levelId, index);
  }

  function setLearned(topicId, levelId, index, on) {
    const all = learnedMap();
    const key = itemKey(topicId, levelId, index);
    const legacy = legacyItemKey(topicId, levelId, index);
    if (on) {
      // mục vừa học → đến hạn ôn ngay trong hôm nay
      all[key] = srsOf(all[key] || all[legacy]) || { due: Date.now(), reps: 0, ease: 2.5, lapses: 0 };
    } else {
      delete all[key];
      delete all[legacy];
    }
    writeJson(KEY_LEARNED, all);
  }

  /** Đọc bản ghi lặp lại ngắt quãng (dữ liệu cũ chỉ là 1 → mục mới, đến hạn ngay) */
  function srsOf(entry) {
    if (!entry) return null;
    if (typeof entry !== "object") return { due: 0, reps: 0, ease: 2.5, lapses: 0 };
    return {
      due: Number(entry.due) || 0,
      reps: Number(entry.reps) || 0,
      ease: Number(entry.ease) || 2.5,
      lapses: Number(entry.lapses) || 0,
    };
  }

  function srsEntry(langId, map, topicId, levelId, index) {
    const key = `${langId}|${topicId}|${levelId}|${index}`;
    if (map[key]) return srsOf(map[key]);
    const legacy = legacyItemKey(topicId, levelId, index);
    if (langId === "en" && map[legacy]) return srsOf(map[legacy]);
    return null;
  }

  /** Đúng → giãn cách dài ra; sai → học lại từ đầu (đến hạn ngay) */
  function scheduleCard(langId, topicId, levelId, index, ok) {
    const all = learnedMap();
    const key = `${langId}|${topicId}|${levelId}|${index}`;
    const legacy = legacyItemKey(topicId, levelId, index);
    const prev = all[key] || (langId === "en" ? all[legacy] : null);
    const cur = srsOf(prev) || { due: 0, reps: 0, ease: 2.5, lapses: 0 };
    const now = Date.now();
    const round = (n) => Math.round(n * 100) / 100;
    let next;
    if (ok) {
      const reps = Math.min(cur.reps + 1, SRS_STEPS.length - 1);
      next = { due: now + SRS_STEPS[reps] * DAY_MS, reps, ease: Math.min(3, round(cur.ease + 0.05)), lapses: cur.lapses };
    } else {
      next = { due: now, reps: 0, ease: Math.max(1.3, round(cur.ease - 0.2)), lapses: cur.lapses + 1 };
    }
    all[key] = next;
    if (langId === "en") delete all[legacy];
    writeJson(KEY_LEARNED, all);
    return next;
  }

  /** Các mục đã học và đã đến hạn ôn của một ngôn ngữ (cũ nhất trước) */
  function dueList(langId) {
    const set = LESSON_SETS[langId];
    if (!set || !Array.isArray(set.topics)) return [];
    const map = learnedMap();
    const now = Date.now();
    const out = [];
    for (const topic of set.topics) {
      for (const level of topic.levels || []) {
        level.items.forEach((item, i) => {
          const srs = srsEntry(langId, map, topic.id, level.id, i);
          if (srs && srs.due <= now) out.push({ item, topicId: topic.id, levelId: level.id, index: i, due: srs.due });
        });
      }
    }
    out.sort((a, b) => a.due - b.due);
    return out;
  }

  /** Đáp án được chấp nhận khi tích "đã thuộc" (tiếng Trung: chữ Hán + pinyin) */
  function studyAnswers(item) {
    return hasCjk(item.en) ? [item.en].concat(PY.answers(item.ipa || "")) : [item.en];
  }

  function learnedMap() {
    const raw = readJson(KEY_LEARNED);
    return raw && typeof raw === "object" ? raw : {};
  }

  function topicById(id) {
    return studyTopics().find((t) => t.id === id) || null;
  }

  function lessonLevel() {
    const topic = topicById(state.topicId);
    if (!topic) return null;
    return topic.levels.find((lv) => lv.id === state.topicLevelId) || topic.levels[0];
  }

  function learnedCount(topic, level) {
    const map = learnedMap();
    let n = 0;
    level.items.forEach((_, i) => {
      if (isLearned(map, topic.id, level.id, i)) n += 1;
    });
    return n;
  }

  /* ============================================================
     LƯU TIẾN ĐỘ TRÊN MÁY (localStorage) — học tới đâu, phản xạ tới đâu
     ============================================================ */

  /** Tổng số mục đã thuộc của một ngôn ngữ trong phần Học */
  function studyTotals(langId) {
    const set = LESSON_SETS[langId];
    if (!set || !Array.isArray(set.topics)) return { done: 0, total: 0 };
    const map = learnedMap();
    let done = 0;
    let total = 0;
    for (const topic of set.topics) {
      for (const level of topic.levels || []) {
        for (let i = 0; i < level.items.length; i += 1) {
          total += 1;
          if (learnedFor(langId, map, topic.id, level.id, i)) done += 1;
        }
      }
    }
    return { done, total };
  }

  /** Số màn đã qua + tổng kỷ lục của gói đang chọn */
  function playTotals() {
    const prog = loadProgress();
    let cleared = 0;
    let total = 0;
    let best = 0;
    for (const level of state.pack.levels) {
      level.stages.forEach((_, i) => {
        total += 1;
        const rec = prog[progressKey(level.id, i)];
        if (rec && rec.cleared) cleared += 1;
        if (rec && rec.best) best += rec.best;
      });
    }
    return { cleared, total, best };
  }

  /* Số câu đã trả lời / đúng — lưu theo từng gói ngôn ngữ */
  function loadStats() {
    return readJson(KEY_STATS) || {};
  }

  function bumpStats(correct) {
    const all = loadStats();
    const id = state.pack ? state.pack.id : "en";
    const rec = all[id] && typeof all[id] === "object" ? all[id] : { answered: 0, correct: 0 };
    rec.answered += 1;
    if (correct) rec.correct += 1;
    all[id] = rec;
    all.updated = Date.now();
    writeJson(KEY_STATS, all);
  }

  /* ---------- Từ hay sai ---------- */
  const wrongKey = (langId, topicId, levelId, index) => `${langId}|${topicId}|${levelId}|${index}`;

  function wrongMap() {
    const raw = readJson(KEY_WRONG);
    return raw && typeof raw === "object" ? raw : {};
  }

  function bumpWrong(langId, topicId, levelId, index, ok) {
    const all = wrongMap();
    const key = wrongKey(langId, topicId, levelId, index);
    const cur = Number(all[key]) || 0;
    if (ok) {
      if (cur <= 1) delete all[key];
      else all[key] = cur - 1;
    } else {
      all[key] = Math.min(9, cur + 1);
    }
    writeJson(KEY_WRONG, all);
  }

  /** Danh sách từ hay sai (sai nhiều xếp trước) */
  function wrongList(langId) {
    const set = LESSON_SETS[langId];
    if (!set || !Array.isArray(set.topics)) return [];
    const all = wrongMap();
    const out = [];
    for (const topic of set.topics) {
      for (const level of topic.levels || []) {
        level.items.forEach((item, i) => {
          const n = Number(all[wrongKey(langId, topic.id, level.id, i)]) || 0;
          if (n > 0) out.push({ item, topicId: topic.id, levelId: level.id, index: i, n });
        });
      }
    }
    out.sort((a, b) => b.n - a.n);
    return out;
  }

  /* ---------- Chuỗi ngày học + mục tiêu mỗi ngày ---------- */
  function dayKey(d) {
    const x = d || new Date();
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  }

  function bumpDaily() {
    const all = readJson(KEY_DAILY) || {};
    const key = dayKey();
    all[key] = (Number(all[key]) || 0) + 1;
    const keys = Object.keys(all).sort();
    while (keys.length > 180) delete all[keys.shift()];
    writeJson(KEY_DAILY, all);
  }

  function todayCount() {
    return Number((readJson(KEY_DAILY) || {})[dayKey()]) || 0;
  }

  function dayStreak() {
    const all = readJson(KEY_DAILY) || {};
    const d = new Date();
    if (!Number(all[dayKey(d)])) d.setDate(d.getDate() - 1);
    let n = 0;
    while (Number(all[dayKey(d)])) {
      n += 1;
      d.setDate(d.getDate() - 1);
    }
    return n;
  }

  /** Tìm chủ đề/cấp độ/vị trí của một mục từ vựng (để chấm SRS) */
  function metaOfItem(item) {
    if (!item) return null;
    for (const topic of studyTopics()) {
      for (const level of topic.levels || []) {
        const index = level.items.indexOf(item);
        if (index >= 0) return { topicId: topic.id, levelId: level.id, index };
      }
    }
    return null;
  }

  /** Ghi nhận mỗi câu trả lời: lịch ôn + từ hay sai + chuỗi ngày */
  function recordAnswer(ok) {
    bumpDaily();
    const q = state.current;
    if (!q || !q.item) return;
    const meta = metaOfItem(q.item);
    if (!meta) return;
    const map = learnedMap();
    const known = learnedFor(state.studyLang, map, meta.topicId, meta.levelId, meta.index);
    // chỉ đẩy lịch ôn cho mục đã học — chơi game không tự biến mục lạ thành “đã thuộc”
    if (known) scheduleCard(state.studyLang, meta.topicId, meta.levelId, meta.index, ok);
    bumpWrong(state.studyLang, meta.topicId, meta.levelId, meta.index, ok);
  }

  /** Vị trí chơi nên tiếp tục: lần chơi gần nhất nếu còn mở, ngược lại màn trống đầu tiên */
  function resumePoint() {
    const last = readJson(KEY_LAST) || {};
    const level =
      last.lang === state.pack.id && last.level ? state.pack.levels.find((lv) => lv.id === last.level) : null;
    const levelId = (level || currentLevel()).id;
    const stage =
      last.lang === state.pack.id && Number.isInteger(last.stage) ? clampStage(levelId, last.stage) : firstOpenStage(levelId);
    const lv = state.pack.levels.find((item) => item.id === levelId) || state.pack.levels[0];
    return { levelId, stage: clampStage(levelId, stage), levelName: lv.name };
  }

  function renderSaveCards() {
    renderPlaySave();
    renderStudySave();
  }

  function renderPlaySave() {
    if (!els.saveCard || !state.pack) return;

    const play = playTotals();
    // phần Học có ngôn ngữ riêng (có thể khác ngôn ngữ đang chơi) → hiện đúng ngôn ngữ đó
    const studyLangId = LESSON_SETS[state.studyLang] ? state.studyLang : state.pack.id;
    const study = studyTotals(studyLangId);
    const stats = loadStats()[state.pack.id] || { answered: 0, correct: 0 };
    const point = resumePoint();
    const accuracy = stats.answered ? Math.round((stats.correct / stats.answered) * 100) : 0;
    const playPct = play.total ? Math.round((play.cleared / play.total) * 100) : 0;
    const studyPct = study.total ? Math.round((study.done / study.total) * 100) : 0;
    const langInfo = LESSON_LANGS.find((l) => l.id === studyLangId) || { flag: "", label: "" };
    const due = dueList(studyLangId).length;
    const wrongs = wrongList(studyLangId).length;
    const streak = dayStreak();
    const today = todayCount();

    els.saveCard.innerHTML = `
      <div class="save-line">
        <span class="save-label">⚡ Phản xạ</span>
        <b>${play.cleared}/${play.total} màn</b>
      </div>
      <div class="save-bar" aria-hidden="true"><i style="width:${playPct}%"></i></div>
      <div class="save-line">
        <span class="save-label">📚 Đã học (${langInfo.flag} ${esc(langInfo.label)})</span>
        <b>${study.done}/${study.total} mục</b>
      </div>
      <div class="save-bar study" aria-hidden="true"><i style="width:${studyPct}%"></i></div>
      <p class="save-note">${
        stats.answered
          ? `Đã trả lời <b>${stats.answered}</b> câu · đúng <b>${accuracy}%</b> · tổng kỷ lục <b>${play.best}</b>`
          : "Chưa chơi câu nào — bắt đầu để lưu tiến độ trên máy này."
      }</p>
      <p class="save-note">🔥 <b>${streak}</b> ngày liên tiếp · hôm nay <b>${today}/${DAILY_GOAL}</b> câu${
        due ? ` · ⏰ <b>${due}</b> mục đến hạn ôn` : ""
      }${wrongs ? ` · ⚠️ <b>${wrongs}</b> từ hay sai` : ""}</p>
      <div class="save-actions">
        <button class="ghost-btn tiny" id="resume-play" type="button">▶ Chơi tiếp · ${esc(
          point.levelName
        )} màn ${point.stage + 1}</button>
        <button class="ghost-btn tiny" id="resume-study" type="button">📚 Học tiếp</button>
        ${due ? `<button class="ghost-btn tiny" id="review-now" type="button">🔁 Ôn ${due} mục</button>` : ""}
      </div>`;

    const playBtn = $("resume-play");
    if (playBtn) {
      playBtn.addEventListener("click", () => {
        clickSound();
        state.levelId = point.levelId;
        state.stageIdx = point.stage;
        renderLevels();
        renderStages();
        updateStartLabel();
        if (els.startBtn) els.startBtn.focus();
      });
    }

    const studyBtn = $("resume-study");
    if (studyBtn) {
      studyBtn.addEventListener("click", () => {
        clickSound();
        showScreen("study");
        renderTopics();
        if (state.topicId) openTopic(state.topicId, state.topicLevelId);
      });
    }

    const reviewBtn = $("review-now");
    if (reviewBtn) {
      reviewBtn.addEventListener("click", () => {
        clickSound();
        startReview(false, "menu");
      });
    }
  }

  function renderStudySave() {
    if (!els.studyResume) return;
    const total = studyTotals(state.studyLang);
    const topic = topicById(state.topicId);
    const level = topic ? topic.levels.find((lv) => lv.id === state.topicLevelId) || topic.levels[0] : null;
    const map = learnedMap();
    const here = topic && level ? learnedCount(topic, level) : 0;
    const due = dueList(state.studyLang).length;
    const wrongs = wrongList(state.studyLang).length;
    if (!topic) {
      els.studyResume.innerHTML = "";
      els.studyResume.classList.add("hidden");
      return;
    }

    els.studyResume.classList.remove("hidden");
    els.studyResume.innerHTML = `
      <div class="save-line">
        <span class="save-label">📍 Đang học</span>
        <b>${topic.icon} ${esc(topic.name)} · ${esc(level ? level.name : "")}</b>
      </div>
      <p class="save-note">Cấp độ này <b>${here}/${level ? level.items.length : 0}</b> mục · cả ngôn ngữ <b>${
      total.done
    }/${total.total}</b> mục (${total.total ? Math.round((total.done / total.total) * 100) : 0}%) · ⏰ <b>${due}</b> cần ôn · ⚠️ <b>${wrongs}</b> hay sai</p>
      <div class="save-actions">
        <button class="ghost-btn tiny" id="resume-lesson" type="button">▶ Vào học tiếp</button>
        <button class="ghost-btn tiny" id="review-today" type="button"${due ? "" : " disabled"}>🔁 Ôn hôm nay (${due})</button>
        <button class="ghost-btn tiny" id="wrong-list" type="button"${wrongs ? "" : " disabled"}>⚠️ Từ hay sai (${wrongs})</button>
      </div>`;

    const btn = $("resume-lesson");
    if (btn) {
      btn.addEventListener("click", () => {
        clickSound();
        openTopic(topic.id, level ? level.id : undefined);
      });
    }

    const reviewToday = $("review-today");
    if (reviewToday) {
      reviewToday.addEventListener("click", () => {
        clickSound();
        startReview(false, "study");
      });
    }

    const wrongBtn = $("wrong-list");
    if (wrongBtn) {
      wrongBtn.addEventListener("click", () => {
        clickSound();
        startReview(true, "study");
      });
    }
  }

  /** Tiếng bấm nút (đặt tên riêng để không đụng hàm play() của game) */
  function clickSound() {
    play("click");
  }

  function showScreen(name) {
    for (const key of ["menu", "study", "lesson", "play"]) {
      const el = els[key];
      if (el) el.classList.toggle("hidden", key !== name);
    }

    const learning = name === "study" || name === "lesson";
    if (els.tabs) els.tabs.classList.toggle("hidden", name === "play");
    if (els.tabPlay) {
      els.tabPlay.classList.toggle("active", !learning);
      els.tabPlay.setAttribute("aria-selected", learning ? "false" : "true");
    }
    if (els.tabStudy) {
      els.tabStudy.classList.toggle("active", learning);
      els.tabStudy.setAttribute("aria-selected", learning ? "true" : "false");
    }
  }

  function renderTopics() {
    if (!els.topics) return;
    renderStudyLangs();
    renderStudySave();
    els.topics.innerHTML = "";
    if (!studyTopics().length) {
      els.topics.innerHTML = '<p class="menu-note">Không tải được dữ liệu học của ngôn ngữ này.</p>';
      return;
    }

    const map = learnedMap();
    for (const topic of studyTopics()) {
      let total = 0;
      let done = 0;
      topic.levels.forEach((lv) => {
        lv.items.forEach((_, i) => {
          total += 1;
          if (isLearned(map, topic.id, lv.id, i)) done += 1;
        });
      });
      const pct = total ? Math.round((done / total) * 100) : 0;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "topic";
      btn.dataset.topic = topic.id;
      btn.innerHTML = `
        <span class="topic-icon">${topic.icon}</span>
        <span class="topic-main">
          <b>${esc(topic.name)}</b>
          <span class="topic-meta">${esc(topic.desc)} · ${total} mục</span>
          <span class="topic-bar"><i style="width:${pct}%"></i></span>
        </span>
        <span class="topic-count">${done}/${total}</span>`;
      btn.addEventListener("click", () => {
        play("click");
        openTopic(topic.id);
      });
      els.topics.appendChild(btn);
    }
  }

  function openTopic(topicId, levelId) {
    const topic = topicById(topicId);
    if (!topic) return;
    const mapKey = `${state.studyLang}:${topic.id}`;
    const remembered = state.levelMap[mapKey];
    const valid = levelId || (topic.levels.some((lv) => lv.id === remembered) ? remembered : "");
    state.topicId = topic.id;
    state.topicLevelId = valid || (topic.levels[0] && topic.levels[0].id) || "basic";
    state.levelMap[mapKey] = state.topicLevelId;
    state.search = "";
    if (els.studySearch) els.studySearch.value = "";
    saveStudyState();
    showScreen("lesson");
    renderLesson();
  }

  function saveStudyState() {
    writeJson(KEY_STUDY, {
      lang: state.studyLang,
      topic: state.topicId,
      level: state.topicLevelId,
      levels: state.levelMap,
      hideVi: !!state.hideVi,
    });
  }

  /* ---------- Chọn ngôn ngữ ở phần Học (English / 中文) ---------- */
  function renderStudyLangs() {
    if (!els.studyLangs) return;
    els.studyLangs.innerHTML = "";
    els.studyLangs.classList.toggle("hidden", LESSON_LANGS.length < 2);

    for (const lang of LESSON_LANGS) {
      const on = lang.id === state.studyLang;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "lang-tab" + (on ? " active" : "");
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.textContent = `${lang.flag} ${lang.label}`;
      btn.addEventListener("click", () => {
        play("click");
        setStudyLang(lang.id);
      });
      els.studyLangs.appendChild(btn);
    }

    if (els.studySearch) {
      els.studySearch.placeholder =
        state.studyLang === "zh"
          ? "🔍 Tìm theo chữ Hán, pinyin hoặc tiếng Việt…"
          : "🔍 Tìm theo tiếng Anh hoặc tiếng Việt…";
    }
  }

  function setStudyLang(id) {
    if (id === state.studyLang) return;
    if (!LESSON_SETS[id] || !LESSON_SETS[id].topics.length) return;

    state.studyLang = id;
    state.search = "";
    if (els.studySearch) els.studySearch.value = "";

    const topics = studyTopics();
    const topic = topics.find((t) => t.id === state.topicId) || topics[0];
    if (topic) {
      const mapKey = `${id}:${topic.id}`;
      const remembered = state.levelMap[mapKey];
      state.topicId = topic.id;
      state.topicLevelId = topic.levels.some((lv) => lv.id === remembered) ? remembered : topic.levels[0].id;
      state.levelMap[mapKey] = state.topicLevelId;
    }

    saveStudyState();
    renderTopics();
    paintStrict();
    if (els.lesson && !els.lesson.classList.contains("hidden")) renderLesson();
  }

  function renderLesson() {
    const topic = topicById(state.topicId);
    if (!topic) return;

    els.lessonIcon.textContent = topic.icon;
    els.lessonName.textContent = topic.name;
    if (els.lessonLang) {
      const info = studyLangInfo();
      els.lessonLang.textContent = info ? `${info.flag} ${info.label}` : "";
    }
    els.lessonLevels.innerHTML = "";

    for (const lv of topic.levels) {
      const on = lv.id === state.topicLevelId;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "level" + (on ? " active" : "");
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.innerHTML = `<b>${esc(lv.name)}</b><span>${lv.items.length} mục</span>`;
      btn.addEventListener("click", () => {
        play("click");
        state.topicLevelId = lv.id;
        state.levelMap[`${state.studyLang}:${topic.id}`] = lv.id;
        saveStudyState();
        renderLesson();
      });
      els.lessonLevels.appendChild(btn);
    }

    if (els.studyHideVi) {
      els.studyHideVi.setAttribute("aria-pressed", state.hideVi ? "true" : "false");
      els.studyHideVi.textContent = state.hideVi ? "👁 Hiện nghĩa" : "🙈 Ẩn nghĩa";
    }

    if (els.studyNote) {
      const online = state.studyLang === "zh" && !voiceFor("zh-CN");
      els.studyNote.innerHTML =
        "Bấm thẻ để ẩn/hiện nghĩa · 🔊 nghe phát âm · ✓ phải <b>gõ lại đúng từ</b> rồi mới tích được đã thuộc" +
        (online ? "<br />🔊 Tiếng Trung được phát bằng <b>giọng đọc trực tuyến</b> (cần mạng)." : "");
    }

    renderCards();
  }

  function updateStudyProgress() {
    const topic = topicById(state.topicId);
    const level = lessonLevel();
    if (!topic || !level || !els.studyFill) return;
    const total = level.items.length;
    const done = learnedCount(topic, level);
    els.studyFill.style.width = (total ? (done / total) * 100 : 0) + "%";
    els.studyCount.textContent = `${done}/${total} đã thuộc`;
    if (els.studyMarkAll) {
      els.studyMarkAll.textContent = "↺ Bỏ tích cả cấp độ";
      els.studyMarkAll.classList.toggle("hidden", done === 0);
    }
    paintLessonExtra();
    renderSaveCards();
  }

  function renderCards() {
    const topic = topicById(state.topicId);
    const level = lessonLevel();
    if (!topic || !level || !els.studyList) return;

    const map = learnedMap();
    const q = norm(state.search);
    const rawQ = normCjk(state.search);
    const rows = level.items
      .map((item, i) => ({ item, i }))
      .filter(({ item }) => {
        if (!rawQ) return true;
        if (q && norm(item.vi).includes(q)) return true;
        if (q && norm(item.en).includes(q)) return true;
        if (q && norm(item.ipa || "").includes(q)) return true; // tìm bằng pinyin không dấu
        if (hasCjk(rawQ) && normCjk(item.en).includes(rawQ)) return true;
        return false;
      });

    els.studyList.innerHTML = "";
    els.studyList.classList.toggle("hide-vi", !!state.hideVi);
    updateStudyProgress();

    if (!rows.length) {
      els.studyList.innerHTML = '<p class="menu-note">Không tìm thấy mục nào khớp.</p>';
      return;
    }

    for (const { item, i } of rows) {
      const learned = isLearned(map, topic.id, level.id, i);
      const cjk = hasCjk(item.en);
      const srs = learned ? srsEntry(state.studyLang, map, topic.id, level.id, i) : null;
      // chỉ nhắc “đến hạn ôn” khi đã ôn ít nhất một lần (mục vừa học hôm nay thì thôi)
      const due = srs ? srs.due <= Date.now() && srs.reps > 0 : false;
      const card = document.createElement("article");
      card.className = "card" + (learned ? " learned" : "") + (due ? " due" : "");
      card.dataset.index = String(i);
      card.innerHTML = `
        <button class="card-main" type="button">
          <span class="card-en${cjk ? " card-hanzi" : ""}">${esc(item.en)}</span>
          ${item.ipa ? `<span class="card-ipa${cjk ? " card-pinyin" : ""}">${esc(item.ipa)}</span>` : ""}
          <span class="card-vi">${esc(item.vi)}</span>
          ${due ? '<span class="card-due">⏰ đến hạn ôn</span>' : ""}
        </button>
        <span class="card-tools">
          <button class="ghost-btn icon-btn card-say" type="button" title="Nghe phát âm" aria-label="Nghe phát âm">🔊</button>
          <button class="ghost-btn icon-btn card-check" type="button" title="Đánh dấu đã thuộc" aria-label="Đánh dấu đã thuộc" aria-pressed="${
            learned ? "true" : "false"
          }">✓</button>
        </span>`;

      card.querySelector(".card-main").addEventListener("click", () => {
        card.classList.toggle("revealed");
      });

      card.querySelector(".card-say").addEventListener("click", (event) => {
        event.stopPropagation();
        speak(item.en, (studyLangInfo() || {}).voice, item.ipa);
      });

      /* ✓ chỉ tích được khi đã gõ lại đúng pinyin (tiếng Trung) / từ (tiếng Anh) */
      const checkBtn = card.querySelector(".card-check");
      const quizLabel = cjk
        ? "Gõ pinyin (có dấu / không dấu) để tích đã thuộc"
        : "Gõ lại từ tiếng Anh để tích đã thuộc";

      const closeQuiz = () => {
        card.classList.remove("quiz-open", "quiz-cjk", "quiz-en");
        const form = card.querySelector(".card-quiz");
        if (form) form.remove();
        const msg = card.querySelector(".card-quiz-msg");
        if (msg) msg.remove();
      };

      const openQuiz = () => {
        const exists = card.querySelector(".card-quiz-input");
        if (exists) {
          exists.focus();
          return;
        }

        card.classList.add("quiz-open", "revealed", cjk ? "quiz-cjk" : "quiz-en");
        const form = document.createElement("form");
        form.className = "card-quiz";
        form.innerHTML = `
          <input class="card-quiz-input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false"
                 placeholder="${cjk ? "Gõ pinyin (có dấu / không dấu)…" : "Gõ lại từ tiếng Anh…"}"
                 aria-label="${esc(quizLabel)}" />
          <button class="primary-btn card-quiz-ok" type="submit">Kiểm tra</button>`;

        const msg = document.createElement("p");
        msg.className = "card-quiz-msg";
        msg.textContent = quizLabel;

        card.appendChild(form);
        card.appendChild(msg);

        const input = form.querySelector(".card-quiz-input");

        input.addEventListener("keydown", (event) => {
          if (event.key !== "Escape") return;
          event.stopPropagation();
          closeQuiz();
        });

        form.addEventListener("submit", (event) => {
          event.preventDefault();
          const value = String(input.value || "").trim();
          if (!value) {
            input.focus();
            return;
          }

          const verdict = judgeAnswers(value, studyAnswers(item));
          if (verdict === "ok") {
            // lần đầu tích: hẹn ôn ngay trong hôm nay, chưa cộng thêm ngày
            setLearned(topic.id, level.id, i, true);
            bumpWrong(state.studyLang, topic.id, level.id, i, true);
            closeQuiz();
            card.classList.add("learned");
            card.classList.remove("due");
            checkBtn.setAttribute("aria-pressed", "true");
            play("click");
            updateStudyProgress();
          } else {
            play("error");
            msg.className = "card-quiz-msg bad";
            if (verdict === "tone") {
              msg.innerHTML = `❌ Đúng âm tiết nhưng <b>sai dấu thanh</b> — đáp án: <b>${esc(
                item.ipa || item.en
              )}</b>`;
            } else {
              msg.textContent = cjk ? "❌ Chưa đúng — gõ pinyin của từ này" : "❌ Chưa đúng — gõ lại từ tiếng Anh";
            }
            input.classList.add("shake");
            window.setTimeout(() => input.classList.remove("shake"), 340);
            input.select();
          }
        });

        window.setTimeout(() => input.focus(), 30);
      };

      checkBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        const all = learnedMap();
        if (isLearned(all, topic.id, level.id, i)) {
          // bỏ tích thì không cần gõ lại
          setLearned(topic.id, level.id, i, false);
          card.classList.remove("learned");
          checkBtn.setAttribute("aria-pressed", "false");
          play("click");
          updateStudyProgress();
          return;
        }
        openQuiz();
      });

      els.studyList.appendChild(card);
    }
  }

  /* ---------- Sinh câu hỏi luyện từ danh sách đã học ---------- */
  function buildPractice(items, count, opts) {
    const pool = (items || []).filter((it) => it && it.en && it.vi);
    if (!pool.length) return [];

    const picked = shuffle(pool.slice()).slice(0, Math.min(count || 12, pool.length));
    const viPool = Array.from(new Set(pool.map((it) => it.vi)));
    const options = (right) => shuffle([right].concat(shuffle(viPool.filter((v) => v !== right)).slice(0, 3)));
    const withOptions = (right) => {
      const list = options(right);
      return list.length === 4 ? list : null;
    };
    const listen = opts && opts.listen === false ? false : true;
    const out = [];

    picked.forEach((item, i) => {
      const long = item.phrase || item.en.split(" ").length >= 3;
      const cjk = hasCjk(item.en);

      // cứ 5 câu có 1 câu NGHE → chọn nghĩa (không nhìn thấy chữ)
      if (listen && i % 5 === 4) {
        const o = withOptions(item.vi);
        if (o) {
          out.push({
            k: "lchoice",
            say: item.en,
            sayPinyin: item.ipa || "",
            q: "Nghe và chọn nghĩa đúng",
            o,
            a: [item.vi],
            hint: "",
            item,
          });
          return;
        }
      }

      // cứ 4 câu thì có 1 câu trắc nghiệm chiều Anh → Việt
      if (i % 4 === 3) {
        const o = withOptions(item.vi);
        if (o) {
          out.push({
            k: "choice",
            q: `Từ “${item.en}” có nghĩa là gì?`,
            o,
            a: [item.vi],
            hint: item.ipa || "",
            item,
          });
          return;
        }
      }

      out.push({
        k: long ? "sentence" : "word",
        q: item.vi,
        // tiếng Trung: chấp nhận cả chữ Hán lẫn pinyin (có dấu / không dấu)
        a: cjk ? [item.en].concat(PY.answers(item.ipa)) : [item.en],
        show: cjk ? `${item.en} · ${item.ipa}` : "",
        hint: item.ipa || "",
        item,
      });
    });

    return out;
  }

  function practiceFrom(items, title, time, back) {
    const count = Math.min(24, Math.max(8, items.length));
    const list = buildPractice(items, count);
    if (!list.length) return;
    startCustom(list, { title, time, items: items.slice(), count, back: back || "lesson" });
  }

  function practiceAllTopics() {
    const items = [];
    studyTopics().forEach((topic) => {
      topic.levels.forEach((lv) => {
        lv.items.forEach((it) => items.push(it));
      });
    });
    const info = studyLangInfo();
    const label = info ? ` · ${info.label}` : "";
    practiceFrom(items, `🔀 Luyện tổng hợp ${studyTopics().length} chủ đề${label}`, 15, "study");
  }

  /** Ôn tập: các mục đã học đến hạn hôm nay (hoặc riêng danh sách từ hay sai) */
  function startReview(onlyWrong, back) {
    const langId = state.studyLang;
    const rows = onlyWrong ? wrongList(langId) : dueList(langId);
    const seen = new Set();
    const items = [];
    for (const row of rows) {
      if (seen.has(row.item)) continue;
      seen.add(row.item);
      items.push(row.item);
    }

    if (!items.length) {
      play("error");
      window.alert(
        onlyWrong
          ? "Chưa có từ nào bị sai — cứ luyện thêm nhé!"
          : "Hôm nay không còn mục nào đến hạn ôn. Học thêm vài từ mới đi!"
      );
      return;
    }

    const count = Math.min(24, Math.max(8, items.length));
    const list = buildPractice(items, count, { listen: !onlyWrong });
    if (!list.length) return;
    const title = onlyWrong
      ? `⚠️ Từ hay sai · ${items.length} mục`
      : `🔁 Ôn tập hôm nay · ${items.length} mục`;
    startCustom(list, { title, time: 14, items: items.slice(), count, back: back || "study" });
  }

  /** Chơi tự do trên toàn bộ kho từ của ngôn ngữ đang chọn (câu sinh động) */
  function startSurvival() {
    const langId = state.pack && LESSON_SETS[state.pack.id] ? state.pack.id : state.studyLang;
    if (langId !== state.studyLang) setStudyLang(langId);

    const items = [];
    studyTopics().forEach((topic) => {
      topic.levels.forEach((lv) => lv.items.forEach((it) => items.push(it)));
    });
    if (!items.length) return;

    const list = buildPractice(items, 30);
    if (!list.length) return;
    startCustom(list, {
      title: `♾️ Sinh tồn · ${items.length} mục`,
      time: 12,
      items,
      count: 30,
      back: "menu",
    });
  }


  /* ---------- Màn chọn ---------- */
  function renderLang() {
    const packs = DATA.packs;
    if (packs.length > 1) {
      els.langChip.classList.add("hidden");
      els.langSelect.classList.remove("hidden");
      els.langSelect.innerHTML = packs
        .map(
          (p) =>
            `<option value="${esc(p.id)}"${p.id === state.pack.id ? " selected" : ""}>${p.flag} ${esc(
              p.name
            )} ↔ ${esc(p.sourceLabel)}</option>`
        )
        .join("");
    } else {
      const p = packs[0];
      els.langChip.textContent = `${p.flag} ${p.name} ↔ 🇻🇳 ${p.sourceLabel}`;
    }
    paintStrict();
  }

  function renderLevels() {
    els.levels.innerHTML = "";
    for (const lv of state.pack.levels) {
      const btn = document.createElement("button");
      const on = lv.id === state.levelId;
      btn.type = "button";
      btn.className = "level" + (on ? " active" : "");
      btn.dataset.level = lv.id;
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.innerHTML = `<b>${esc(lv.name)}</b><span>${lv.time}s/câu</span>`;
      btn.addEventListener("click", () => {
        play("click");
        state.levelId = lv.id;
        state.stageIdx = firstOpenStage(lv.id);
        renderLevels();
        renderStages();
        updateStartLabel();
        renderPlaySave();
      });
      els.levels.appendChild(btn);
    }
  }

  function firstOpenStage(levelId) {
    const level = state.pack.levels.find((lv) => lv.id === levelId);
    if (!level) return 0;
    const idx = level.stages.findIndex((_, i) => !recordOf(levelId, i).cleared && isUnlocked(levelId, i));
    return idx < 0 ? level.stages.length - 1 : idx;
  }

  function renderStages() {
    const level = currentLevel();
    els.stages.innerHTML = "";
    level.stages.forEach((stage, i) => {
      const rec = recordOf(level.id, i);
      const unlocked = isUnlocked(level.id, i);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.disabled = !unlocked;
      btn.className =
        "stage" +
        (i === state.stageIdx ? " selected" : "") +
        (rec.cleared ? " cleared" : "") +
        (unlocked ? "" : " locked");
      btn.dataset.stage = String(i);
      btn.innerHTML = `
        <span class="stage-no">Màn ${i + 1}</span>
        <span class="stage-name">${esc(stage.name)}</span>
        <span class="stage-meta">${stage.questions.length} câu · ${level.time}s mỗi câu${
        rec.best ? ` · kỷ lục ${rec.best}` : ""
      }</span>
        <span class="stage-flag">${rec.cleared ? "✓" : unlocked ? "" : "🔒"}</span>`;
      if (unlocked) {
        btn.addEventListener("click", () => {
          play("click");
          state.stageIdx = i;
          renderStages();
          updateStartLabel();
          renderPlaySave();
        });
      }
      els.stages.appendChild(btn);
    });
  }

  function updateStartLabel() {
    els.startBtn.textContent = `▶ Chơi màn ${state.stageIdx + 1}`;
  }

  /* ---------- Vòng chơi ---------- */
  function startStage() {
    const level = currentLevel();
    const stage = level.stages[state.stageIdx];
    if (!stage) return;

    state.level = level;
    state.list = shuffle(stage.questions.slice());
    state.idx = 0;
    state.score = 0;
    state.combo = 0;
    state.maxCombo = 0;
    state.correct = 0;
    state.lives = MAX_LIVES;
    state.locked = false;
    state.current = null;
    state.mode = "stage";
    state.custom = null;
    state.requeued = new Set();

    els.overlay.classList.add("hidden");
    els.quitBtn.textContent = "← Chọn màn";
    showScreen("play");
    els.stageTitle.textContent = `${level.name} · Màn ${state.stageIdx + 1}: ${stage.name}`;

    writeLocal(KEY_LANG, state.pack.id);
    writeJson(KEY_LAST, { lang: state.pack.id, level: level.id, stage: state.stageIdx });

    updateHud();
    askNext();
  }

  function startCustom(list, opts) {
    if (!Array.isArray(list) || !list.length) return;

    state.mode = "custom";
    state.custom = opts;
    state.customBack = opts.back || "lesson";
    state.level = { id: "custom", name: opts.title, time: opts.time || 20, stages: [] };
    state.stageIdx = 0;
    state.list = shuffle(list.slice());
    state.idx = 0;
    state.score = 0;
    state.combo = 0;
    state.maxCombo = 0;
    state.correct = 0;
    state.lives = MAX_LIVES;
    state.locked = false;
    state.current = null;
    state.requeued = new Set();

    els.overlay.classList.add("hidden");
    els.quitBtn.textContent = opts.back === "menu" ? "← Chọn màn" : "← Về phần Học";
    showScreen("play");
    els.stageTitle.textContent = opts.title;

    updateHud();
    askNext();
  }

  function askNext() {
    window.clearTimeout(state.nextTimer);
    state.nextTimer = 0;
    state.locked = false;

    if (state.idx >= state.list.length) {
      finish(true);
      return;
    }

    state.current = state.list[state.idx];
    state.hintUsed = false;
    els.feedback.textContent = "";
    els.feedback.className = "feedback";

    renderQuestion(state.current);
    updateHud();
    startTimer();
    focusInput();
  }

  function focusInput() {
    if (!els.input || els.input.disabled) return;
    try {
      els.input.focus({ preventScroll: true });
    } catch (_) {
      els.input.focus();
    }
  }

  function setHint(text, always) {
    if (!text) {
      els.promptHint.textContent = "";
      els.promptHint.classList.add("hidden");
      return;
    }
    els.promptHint.textContent = "Gợi ý: " + text;
    els.promptHint.classList.toggle("hidden", !always);
  }

  function renderQuestion(q) {
    const target = state.pack.targetLabel;
    const isZh = state.pack.voice === "zh-CN";
    paintSlow();
    els.choices.innerHTML = "";
    els.choices.classList.add("hidden");
    els.speakBtn.classList.add("hidden");
    els.input.value = "";
    els.input.disabled = false;
    els.input.placeholder = state.pack.placeholder || "Gõ câu trả lời…";

    switch (q.k) {
      case "gap":
        els.promptKind.textContent = isZh ? "Điền từ còn thiếu (gõ pinyin)" : "Điền từ còn thiếu";
        els.promptText.innerHTML =
          esc(q.q).replace(/_{2,}/g, '<span class="blank">?</span>') +
          (q.vi ? `<span class="prompt-vi">🇻🇳 ${esc(q.vi)}</span>` : "");
        setHint(q.hint, true);
        break;

      case "listen":
        els.promptKind.textContent = "Nghe và viết lại";
        els.promptText.innerHTML = `<span class="say-icon">🔊</span>Nghe rồi gõ lại bằng ${esc(target)}${
          isZh ? "<br /><small>Gõ chữ Hán hoặc pinyin (có dấu / không dấu) đều được</small>" : ""
        }`;
        els.speakBtn.classList.remove("hidden");
        setHint(q.hint, true);
        speak(q.say || q.q, null, speakFallback(q));
        break;

      case "question":
        els.promptKind.textContent = `Trả lời bằng ${target}`;
        els.promptText.textContent = q.q;
        setHint(q.hint, false);
        break;

      case "open":
        els.promptKind.textContent = `Trả lời tự do bằng ${target}`;
        els.promptText.textContent = q.q;
        setHint(q.hint, true);
        break;

      case "choice":
        els.promptKind.textContent = "Chọn đáp án đúng";
        els.promptText.textContent = q.q;
        setHint(q.hint, false);
        renderChoices(q);
        break;

      case "lchoice":
        els.promptKind.textContent = "Nghe và chọn nghĩa";
        els.promptText.innerHTML = `<span class="say-icon">🔊</span>Nghe rồi chọn nghĩa đúng<br /><small>Bấm “Nghe lại” nếu cần</small>`;
        els.speakBtn.classList.remove("hidden");
        setHint("", false);
        renderChoices(q);
        speak(q.say || q.q, null, speakFallback(q));
        break;

      case "sentence":
        els.promptKind.textContent = `Dịch cả câu sang ${target}`;
        els.promptText.textContent = q.q;
        setHint(q.hint, false);
        break;

      default:
        els.promptKind.textContent = `Dịch sang ${target}`;
        els.promptText.textContent = q.q;
        setHint(q.hint, false);
    }
  }

  function renderChoices(q) {
    els.input.value = "";
    els.input.disabled = true;
    els.input.placeholder = "Chọn một đáp án ở trên";
    els.choices.classList.remove("hidden");

    for (const option of shuffle(q.o.slice())) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "choice";
      btn.textContent = option;
      btn.addEventListener("click", () => {
        if (state.locked) return;
        judge(option);
      });
      els.choices.appendChild(btn);
    }
  }

  function answerText(q) {
    if (!q) return "";
    if (q.k === "open") return q.sample || "(câu trả lời của bạn)";
    const first = q.a[0] || "";
    if (q.k === "gap") {
      const filled = q.q.replace(/_{2,}/g, first);
      return q.py ? `${filled} (${q.py})` : filled;
    }
    if (q.k === "lchoice" && q.say) {
      return `${first} (${q.say}${q.sayPinyin ? " · " + q.sayPinyin : ""})`;
    }
    return q.show || first;
  }

  /* ---------- Chấm điểm ---------- */
  function judge(text) {
    const q = state.current;
    if (!q || state.locked) return;

    const value = String(text || "").trim();
    if (!value) {
      nudge();
      return;
    }

    if (q.k === "open") {
      if (!openValid(value)) {
        play("error");
        els.feedback.className = "feedback bad";
        els.feedback.textContent = "Hãy viết thành câu đầy đủ hơn (ít nhất 2 từ).";
        nudge();
        return;
      }
      onCorrect(true);
      return;
    }

    const verdict = judgeAnswers(value, Array.isArray(q.a) ? q.a : []);
    if (verdict === "ok") onCorrect(false);
    else if (verdict === "tone") onWrong(value, "tone");
    else onWrong(value);
  }

  function onCorrect(isOpen) {
    state.locked = true;
    stopTimer();
    bumpStats(true);
    recordAnswer(true);

    state.correct += 1;
    state.combo += 1;
    state.maxCombo = Math.max(state.maxCombo, state.combo);

    const left = Math.max(0, state.deadline - performance.now());
    const ratio = state.totalMs ? Math.min(1, left / state.totalMs) : 0;
    const speedBonus = Math.round(ratio * 50);
    const streakBonus = 10 * Math.min(state.combo - 1, 5);
    const gain = 50 + speedBonus + streakBonus;
    state.score += gain;

    play("eat", state.combo);
    markChoices(state.current, null, true);
    els.input.disabled = true;
    updateHud();

    const sample = isOpen && state.current.sample ? `<br>Mẫu: ${esc(state.current.sample)}` : "";
    els.feedback.className = "feedback good";
    els.feedback.innerHTML = `✅ <b>+${gain}</b> điểm${
      state.combo > 1 ? ` · chuỗi ×${state.combo}` : ""
    }${sample}`;

    state.nextTimer = window.setTimeout(
      () => {
        state.idx += 1;
        askNext();
      },
      isOpen ? 1400 : 750
    );
  }

  function onWrong(text, reason) {
    state.locked = true;
    stopTimer();
    play("error");
    bumpStats(false);
    recordAnswer(false);

    state.combo = 0;
    state.lives -= 1;
    markChoices(state.current, text, false);
    els.input.disabled = true;
    updateHud();

    els.feedback.className = "feedback bad";
    if (reason === "tone") {
      els.feedback.innerHTML = `❌ Đúng âm tiết nhưng <b>sai dấu thanh</b> — đáp án: <b>${esc(
        answerText(state.current)
      )}</b>`;
    } else {
      els.feedback.innerHTML = `❌ Chưa đúng — đáp án: <b>${esc(answerText(state.current))}</b>`;
    }

    state.nextTimer = window.setTimeout(afterMiss, 1900);
  }

  function timeUp() {
    if (state.locked) return;
    state.locked = true;
    stopTimer();
    play("timeout");
    bumpStats(false);
    recordAnswer(false);

    state.combo = 0;
    state.lives -= 1;
    markChoices(state.current, null, false);
    els.input.disabled = true;
    updateHud();

    els.feedback.className = "feedback bad";
    els.feedback.innerHTML = `⏰ Hết giờ — đáp án: <b>${esc(answerText(state.current))}</b>`;

    state.nextTimer = window.setTimeout(afterMiss, 2100);
  }

  function afterMiss() {
    if (state.lives <= 0) {
      finish(false);
      return;
    }
    const q = state.current;
    // câu vừa sai được đẩy xuống cuối lượt (mỗi câu 1 lần) để buộc phải gặp lại
    if (q && state.requeued && !state.requeued.has(q) && state.list.length < 90) {
      state.requeued.add(q);
      state.list.push(q);
    }
    state.idx += 1;
    askNext();
  }

  function markChoices(q, picked, ok) {
    if (!q || (q.k !== "choice" && q.k !== "lchoice")) return;
    const right = q.a[0];
    for (const btn of Array.from(els.choices.querySelectorAll(".choice"))) {
      btn.disabled = true;
      if (btn.textContent === right) btn.classList.add("good");
      else if (!ok && picked && btn.textContent === picked) btn.classList.add("bad");
    }
  }

  function nudge() {
    els.input.classList.remove("shake");
    void els.input.offsetWidth;
    els.input.classList.add("shake");
    window.setTimeout(() => els.input.classList.remove("shake"), 320);
    focusInput();
  }

  /* ---------- Đồng hồ ---------- */
  function startTimer() {
    state.totalMs = state.level.time * 1000;
    state.deadline = performance.now() + state.totalMs;
    state.lastTick = -1;
    state.running = true;

    els.timer.classList.remove("warn", "danger");
    els.timerFill.style.width = "100%";
    els.timerText.textContent = state.level.time + "s";

    if (!state.timerId) state.timerId = window.setInterval(tick, TICK_MS);
  }

  function stopTimer() {
    state.running = false;
    if (state.timerId) {
      window.clearInterval(state.timerId);
      state.timerId = 0;
    }
  }

  function tick() {
    if (!state.running) return;

    const left = Math.max(0, state.deadline - performance.now());
    const ratio = state.totalMs ? left / state.totalMs : 0;
    els.timerFill.style.width = (ratio * 100).toFixed(1) + "%";
    els.timer.classList.toggle("warn", ratio <= 0.45 && ratio > 0.2);
    els.timer.classList.toggle("danger", ratio <= 0.2);

    const secs = Math.ceil(left / 1000);
    els.timerText.textContent = secs + "s";

    if (secs > 0 && secs <= 5 && secs !== state.lastTick) {
      state.lastTick = secs;
      play("tick", secs <= 3);
    }

    if (left <= 0) timeUp();
  }

  /* ---------- Gợi ý ---------- */
  function maskAnswer(q) {
    if (!q) return "";
    if (q.k === "open") return q.sample || "";
    const first = q.a[0] || "";
    if (hasCjk(first)) {
      const count = (first.match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
      const py = q.a.find((ans) => !hasCjk(ans));
      return `${count} chữ Hán${py ? " · " + PY.mask(py) : ""}`;
    }
    return first
      .split(" ")
      .map((word) => (word.length <= 1 ? word : word[0] + "…"))
      .join(" ");
  }

  function useHint() {
    const q = state.current;
    if (!q || state.locked) return;
    if (state.hintUsed) {
      focusInput();
      return;
    }

    state.hintUsed = true;
    play("click");

    const text = q.hint || maskAnswer(q);
    if (text) {
      els.promptHint.textContent = "💡 " + text;
      els.promptHint.classList.remove("hidden");
    }

    state.deadline = Math.max(performance.now() + 1200, state.deadline - HINT_PENALTY);
    els.feedback.className = "feedback";
    els.feedback.textContent = "💡 Đã mở gợi ý (−3 giây)";
    focusInput();
  }

  /* ---------- Kết thúc màn ---------- */
  function finish(cleared) {
    stopTimer();
    window.clearTimeout(state.nextTimer);
    state.nextTimer = 0;
    state.running = false;
    state.locked = true;
    els.input.disabled = true;
    stopSpeaking();

    /* ---------- Luyện theo chủ đề: không lưu kỷ lục màn ---------- */
    if (state.mode === "custom") {
      const opts = state.custom || {};
      const totalQ = state.list.length;
      const accuracyQ = totalQ ? Math.round((state.correct / totalQ) * 100) : 0;
      const due = dueList(state.studyLang).length;

      els.ovTitle.textContent = cleared ? "Hoàn thành! 🎉" : "Hết lượt 😢";
      els.ovTitle.className = cleared ? "" : "lose";
      els.ovText.innerHTML = [
        `Điểm: <b>${state.score}</b>`,
        `Đúng ${state.correct}/${totalQ} câu (${accuracyQ}%) · chuỗi cao nhất ×${state.maxCombo}`,
        cleared ? "Bạn đã luyện xong bộ từ này." : "Còn 0 mạng — thử lại nhé.",
        due ? `⏰ Còn <b>${due}</b> mục đến hạn ôn hôm nay.` : "",
      ]
        .filter(Boolean)
        .join("<br>");

      els.ovActions.innerHTML = "";
      addOverlayBtn("↺ Luyện lại", "primary-btn", () => {
        els.overlay.classList.add("hidden");
        const again = buildPractice(opts.items || [], opts.count || 12);
        if (again.length) startCustom(again, opts);
        else backFromPlay();
      });
      if (due) {
        addOverlayBtn(`🔁 Ôn tiếp (${due})`, "ghost-btn", () => {
          els.overlay.classList.add("hidden");
          startReview(false, state.customBack);
        });
      }
      addOverlayBtn(opts.back === "menu" ? "← Chọn màn" : "← Về phần Học", "ghost-btn", () => {
        els.overlay.classList.add("hidden");
        backFromPlay();
      });

      if (cleared) play("win");
      else play("gameOver");
      els.overlay.classList.remove("hidden");
      return;
    }

    const level = state.level;
    const total = state.list.length;
    const accuracy = total ? Math.round((state.correct / total) * 100) : 0;

    const all = loadProgress();
    const key = progressKey(level.id, state.stageIdx);
    const rec = all[key] && typeof all[key] === "object" ? all[key] : { best: 0, cleared: false };
    const isBest = state.score > (rec.best || 0);
    if (isBest) rec.best = state.score;
    if (cleared) rec.cleared = true;
    all[key] = rec;
    writeJson(KEY_PROGRESS, all);

    const hasNext = state.stageIdx + 1 < level.stages.length;
    let title = "Hết lượt 😢";
    if (cleared && hasNext) {
      title = "Qua màn! 🎉";
      play("levelUp");
    } else if (cleared) {
      title = "Phá đảo! 🏆";
      play("win");
    } else {
      play("gameOver");
    }

    els.ovTitle.textContent = title;
    els.ovTitle.className = cleared ? "" : "lose";
    els.ovText.innerHTML = [
      `Điểm: <b>${state.score}</b>${isBest ? " · kỷ lục mới ⭐" : ` · kỷ lục ${rec.best}`}`,
      `Đúng ${state.correct}/${total} câu (${accuracy}%) · chuỗi cao nhất ×${state.maxCombo}`,
      cleared && hasNext ? "Màn tiếp theo đã được mở khoá." : cleared ? "Bạn đã phá đảo cấp độ này!" : "Còn 0 mạng — thử lại nhé.",
    ].join("<br>");

    els.ovActions.innerHTML = "";
    addOverlayBtn("↺ Chơi lại", "primary-btn", () => {
      els.overlay.classList.add("hidden");
      startStage();
    });
    if (cleared && hasNext) {
      addOverlayBtn("➡ Màn tiếp", "primary-btn", () => {
        els.overlay.classList.add("hidden");
        state.stageIdx += 1;
        startStage();
      });
    }
    addOverlayBtn("← Chọn màn", "ghost-btn", () => backFromPlay());

    els.overlay.classList.remove("hidden");
  }

  function addOverlayBtn(label, className, onClick) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = className;
    btn.textContent = label;
    btn.addEventListener("click", onClick);
    els.ovActions.appendChild(btn);
  }

  function backFromPlay() {
    stopTimer();
    window.clearTimeout(state.nextTimer);
    state.nextTimer = 0;
    state.running = false;
    state.locked = true;
    els.input.disabled = true;
    stopSpeaking();

    els.overlay.classList.add("hidden");

    if (state.mode === "custom") {
      const back = state.customBack;
      state.mode = "stage";
      state.custom = null;
      els.quitBtn.textContent = "← Chọn màn";

      if (back === "study") {
        showScreen("study");
        renderTopics();
        renderSaveCards();
      } else if (back === "menu") {
        showScreen("menu");
        renderLevels();
        renderStages();
        updateStartLabel();
        renderSaveCards();
      } else {
        showScreen("lesson");
        renderLesson();
        renderSaveCards();
      }
      return;
    }

    showScreen("menu");
    renderLevels();
    renderStages();
    updateStartLabel();
    renderSaveCards();
  }

  /* ---------- HUD ---------- */
  function updateHud() {
    const total = state.list.length || 0;
    els.hudProgress.textContent = `${Math.min(state.idx + 1, Math.max(total, 1))}/${total}`;
    els.hudScore.textContent = String(state.score);
    els.hudCombo.textContent = "×" + state.combo;
    els.hudLives.textContent =
      "❤️".repeat(Math.max(0, state.lives)) + "🖤".repeat(Math.max(0, MAX_LIVES - state.lives));
  }

  /* ---------- Đọc từ (Text-to-Speech) ---------- */
  let voiceCache = [];

  /* Giọng tiếng Trung trực tuyến — dùng khi máy chưa cài giọng zh-CN.
     Youdao trả về MP3 thật nên nghe đúng tiếng Trung (không cần API key).
     Lưu ý: dịch vụ chỉ có audio cho MỤC TỪ ĐIỂN (từ/cụm ngắn), nên câu dài
     được chia thành từng mảnh 2 chữ và đọc nối tiếp. */
  const ZH_TTS_URL = "https://dict.youdao.com/dictvoice?le=zh&type=2&audio=";
  let zhAudioEl = null;
  const zhSeq = { queue: [], idx: 0, phase: 0, whole: "", fail: null, played: false, timer: 0, active: false };

  function refreshVoices() {
    try {
      voiceCache = window.speechSynthesis.getVoices() || [];
    } catch (_) {
      voiceCache = [];
    }
  }

  /** Giọng đọc khớp ngôn ngữ; null khi máy chưa cài giọng đó (hay gặp với tiếng Trung) */
  function voiceFor(lang) {
    if (!lang) return null;
    if (!voiceCache.length) refreshVoices();
    if (!voiceCache.length) return null;
    const want = String(lang).toLowerCase().replace("_", "-");
    const base = want.split("-")[0];
    return (
      voiceCache.find((v) => String(v.lang || "").toLowerCase().replace("_", "-") === want) ||
      voiceCache.find((v) => String(v.lang || "").toLowerCase().split(/[-_]/)[0] === base) ||
      null
    );
  }

  /** Pinyin không dấu để đọc tạm khi không có nguồn tiếng Trung nào */
  const plainPinyin = (text) =>
    String(text == null ? "" : text)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ü/g, "yu")
      .replace(/Ü/g, "Yu");

  /** Văn bản dự phòng khi máy thiếu giọng đọc ngôn ngữ đích */
  function speakFallback(q) {
    if (!q) return "";
    const list = Array.isArray(q.a) ? q.a : [];
    return q.sayPinyin || q.py || list.find((ans) => ans && !hasCjk(ans)) || "";
  }

  /** Dừng mọi âm thanh đang phát (giọng máy + audio mạng) */
  function stopSpeaking() {
    if ("speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {
        /* bỏ qua */
      }
    }
    zhSeq.queue = [];
    zhSeq.idx = 0;
    zhSeq.phase = 0;
    zhSeq.whole = "";
    zhSeq.fail = null;
    zhSeq.active = false;
    zhSeq.played = false;
    if (zhSeq.timer) {
      window.clearTimeout(zhSeq.timer);
      zhSeq.timer = 0;
    }
    if (zhAudioEl) {
      try {
        zhAudioEl.onerror = null;
        zhAudioEl.onended = null;
        zhAudioEl.pause();
        zhAudioEl.currentTime = 0;
      } catch (_) {
        /* bỏ qua */
      }
    }
  }

  /** Chỉ giữ chữ Hán (bỏ dấu câu, pinyin, khoảng trắng) */
  const zhHanzi = (text) => String(text == null ? "" : text).replace(/[^\u3400-\u4dbf\u4e00-\u9fff]+/g, "");

  /** Chia câu thành mảnh 2 chữ Hán — vừa với mục từ điển của Youdao */
  function zhPieces(text) {
    const phrases = String(text == null ? "" : text)
      .split(/[^\u3400-\u4dbf\u4e00-\u9fff]+/)
      .filter(Boolean);
    const out = [];
    for (const phrase of phrases) {
      const chars = Array.from(phrase);
      for (let i = 0; i < chars.length; i += 2) out.push(chars.slice(i, i + 2).join(""));
    }
    return out;
  }

  /**
   * Phát lần lượt: thử nguyên cụm trước (âm điệu tự nhiên), nếu cụm không có audio
   * thì chuyển sang đọc từng mảnh 2 chữ; mảnh nào lỗi thì tách tiếp thành từng chữ.
   */
  function zhPlayNext() {
    const seq = zhSeq;
    if (!seq.active) return;

    let text = "";
    if (seq.phase === 0) {
      text = seq.whole;
    } else {
      if (seq.idx >= seq.queue.length) {
        seq.active = false;
        seq.fail = null;
        return;
      }
      text = seq.queue[seq.idx];
      seq.idx += 1;
    }
    if (!text) {
      seq.active = false;
      seq.fail = null;
      return;
    }

    const el = zhAudioEl;
    let settled = false;
    const stopTimer = () => {
      if (seq.timer) {
        window.clearTimeout(seq.timer);
        seq.timer = 0;
      }
    };
    const next = () => {
      if (settled) return;
      settled = true;
      stopTimer();
      if (seq.phase === 0) {
        // đọc được nguyên cụm → xong, không cần đọc từng mảnh
        seq.active = false;
        seq.fail = null;
        return;
      }
      zhPlayNext();
    };
    const retry = () => {
      if (settled) return;
      settled = true;
      stopTimer();

      if (seq.phase === 0) {
        // cụm không phải mục từ điển → chuyển sang đọc từng mảnh
        seq.phase = 1;
        seq.queue = zhPieces(seq.whole);
        seq.idx = 0;
        zhPlayNext();
        return;
      }

      const chars = Array.from(text);
      if (chars.length > 1) {
        // mảnh cũng không có audio → đọc từng chữ (chữ đơn luôn có)
        seq.queue.splice(seq.idx, 0, ...chars);
        zhPlayNext();
        return;
      }

      // chưa phát được gì (mất mạng / bị chặn) → chuyển sang giọng dự phòng
      if (!seq.played && seq.fail) {
        const fail = seq.fail;
        seq.fail = null;
        seq.active = false;
        fail();
        return;
      }
      zhPlayNext();
    };

    try {
      el.onerror = retry;
      el.onended = next;
      el.onplaying = () => {
        seq.played = true;
      };
      el.src = ZH_TTS_URL + encodeURIComponent(text);
      try {
        el.playbackRate = slowOn() ? 0.7 : 1;
      } catch (_) {
        /* trình duyệt cũ */
      }
      seq.timer = window.setTimeout(retry, 6000);
      const played = el.play();
      if (played && typeof played.catch === "function") played.catch(retry);
    } catch (_) {
      retry();
    }
  }

  /** Phát tiếng Trung thật (audio mạng). Trả về false nếu không thể phát. */
  function speakChineseAudio(text, onFail) {
    const hanzi = zhHanzi(text);
    if (!hanzi || typeof window.Audio !== "function") return false;

    try {
      if (!zhAudioEl) {
        zhAudioEl = new Audio();
        zhAudioEl.preload = "auto";
        zhAudioEl.id = "zh-tts-audio";
        zhAudioEl.setAttribute("playsinline", "");
        zhAudioEl.style.display = "none";
        if (document.body) document.body.appendChild(zhAudioEl);
      }

      stopSpeaking();
      zhSeq.whole = hanzi;
      zhSeq.phase = 0;
      zhSeq.queue = [];
      zhSeq.idx = 0;
      zhSeq.fail = typeof onFail === "function" ? onFail : null;
      zhSeq.played = false;
      zhSeq.active = true;
      zhPlayNext();
      return true;
    } catch (_) {
      return false;
    }
  }

  /** Đọc bằng giọng cài sẵn trong máy */
  function speakNative(text, lang, voice) {
    const say = String(text == null ? "" : text);
    if (!say || !("speechSynthesis" in window)) return;
    try {
      const synth = window.speechSynthesis;
      synth.cancel();
      const utter = new SpeechSynthesisUtterance(say);
      const picked = voice || voiceFor(lang);
      if (picked) utter.voice = picked;
      utter.lang = picked ? picked.lang : lang || "en-US";
      utter.rate = slowOn() ? 0.62 : 0.92;
      synth.speak(utter);
    } catch (_) {
      /* trình duyệt không hỗ trợ đọc tiếng */
    }
  }

  /**
   * Đọc một từ/câu.
   * 1. Có giọng đúng ngôn ngữ trong máy → đọc luôn (nhanh, offline).
   * 2. Tiếng Trung mà máy thiếu giọng zh → phát audio tiếng Trung trực tuyến.
   * 3. Mất mạng → đọc pinyin bằng giọng có sẵn để vẫn nghe được.
   */
  function speak(text, lang, fallback) {
    const say = String(text == null ? "" : text);
    if (!say) return;

    // Đang tắt tiếng → không đọc gì cả (audio tiếng Trung cũng tắt theo)
    if (window.Sound && window.Sound.isMuted && window.Sound.isMuted()) return;

    const targetLang = lang || (state.pack && state.pack.voice) || "en-US";
    const voice = voiceFor(targetLang);
    const cjk = hasCjk(say);

    stopSpeaking();

    if (cjk && !voice) {
      const pinyin = plainPinyin(fallback || "");
      if (speakChineseAudio(say, () => pinyin && speakNative(pinyin, "en-US"))) return;
      if (pinyin) speakNative(pinyin, "en-US");
      return;
    }

    speakNative(say, targetLang, voice);
  }

  /* ---------- Nút âm thanh ---------- */
  const slowOn = () => readLocal(KEY_SLOW) === "1";

  function paintSound() {
    if (!els.soundBtn || !window.Sound) return;
    const muted = Boolean(window.Sound.isMuted && window.Sound.isMuted());
    els.soundBtn.textContent = muted ? "🔇" : "🔊";
    els.soundBtn.classList.toggle("off", muted);
    els.soundBtn.setAttribute("aria-pressed", muted ? "false" : "true");
  }

  /* ---------- Nút dấu thanh + tốc độ đọc ---------- */
  function paintStrict() {
    const on = strictToneOn();
    const label = on ? "🎯 Dấu thanh: Bật" : "🎯 Dấu thanh: Tắt";
    // menu: hiện khi đang chơi tiếng Trung
    if (els.strictBtn) {
      els.strictBtn.classList.toggle("hidden", !(state.pack && state.pack.voice === "zh-CN"));
      els.strictBtn.setAttribute("aria-pressed", on ? "true" : "false");
      els.strictBtn.textContent = label;
    }
    // màn học: hiện khi đang học tiếng Trung
    if (els.lessonStrict) {
      els.lessonStrict.classList.toggle("hidden", state.studyLang !== "zh");
      els.lessonStrict.setAttribute("aria-pressed", on ? "true" : "false");
      els.lessonStrict.textContent = label;
    }
  }

  function toggleStrict() {
    writeLocal(KEY_STRICT, strictToneOn() ? "0" : "1");
    paintStrict();
    play("click");
  }

  /** Nút “ôn đến hạn” trong màn học (chỉ hiện khi có mục đến hạn) */
  function paintLessonExtra() {
    if (!els.lessonReview) return;
    const n = dueList(state.studyLang).length;
    els.lessonReview.classList.toggle("hidden", n === 0);
    els.lessonReview.textContent = `🔁 Ôn đến hạn (${n})`;
  }

  function paintSlow() {
    if (!els.slowBtn) return;
    const on = slowOn();
    els.slowBtn.setAttribute("aria-pressed", on ? "true" : "false");
    els.slowBtn.textContent = on ? "🐢 0.7x" : "🐇 1x";
  }

  /* ---------- Xuất / nhập tiến độ ---------- */
  const EXPORT_KEYS = [
    KEY_LANG,
    KEY_PROGRESS,
    KEY_LAST,
    KEY_LEARNED,
    KEY_STUDY,
    KEY_STATS,
    KEY_WRONG,
    KEY_DAILY,
    KEY_STRICT,
    KEY_SLOW,
  ];

  function exportProgress() {
    const payload = { app: "reflex", version: 2, exportedAt: new Date().toISOString(), data: {} };
    EXPORT_KEYS.forEach((key) => {
      const value = readLocal(key);
      if (value) payload.data[key] = value;
    });
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `phan-xa-tien-do-${dayKey()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 3000);
  }

  function importProgress(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || "{}"));
        const payload = parsed && parsed.data && typeof parsed.data === "object" ? parsed.data : parsed;
        let count = 0;
        EXPORT_KEYS.forEach((key) => {
          const value = payload[key];
          if (typeof value === "string" && value) {
            writeLocal(key, value);
            count += 1;
          }
        });
        if (!count) throw new Error("empty");
        window.alert(`Đã nhập ${count} mục tiến độ. Tải lại trang để áp dụng.`);
        window.location.reload();
      } catch (_) {
        window.alert("Tệp không hợp lệ — cần đúng tệp JSON xuất từ game này.");
      }
    };
    reader.readAsText(file);
  }

  /* ---------- Gắn sự kiện ---------- */
  function wire() {
    els.form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (state.locked || !state.current) return;
      if (state.current.k === "choice" || state.current.k === "lchoice") return;
      judge(els.input.value);
    });

    els.hintBtn.addEventListener("click", useHint);
    els.speakBtn.addEventListener("click", () => {
      const q = state.current;
      if (q) speak(q.say || q.q, null, speakFallback(q));
    });

    els.startBtn.addEventListener("click", () => {
      play("click");
      startStage();
    });

    els.quitBtn.addEventListener("click", () => backFromPlay());

    if (els.strictBtn) {
      els.strictBtn.addEventListener("click", toggleStrict);
    }

    if (els.lessonStrict) {
      els.lessonStrict.addEventListener("click", toggleStrict);
    }

    if (els.lessonReview) {
      els.lessonReview.addEventListener("click", () => {
        play("click");
        startReview(false, "lesson");
      });
    }

    if (els.slowBtn) {
      els.slowBtn.addEventListener("click", () => {
        writeLocal(KEY_SLOW, slowOn() ? "0" : "1");
        paintSlow();
        play("click");
        const q = state.current;
        if (q && !els.play.classList.contains("hidden")) speak(q.say || q.q, null, speakFallback(q));
      });
    }

    if (els.survivalBtn) {
      els.survivalBtn.addEventListener("click", () => {
        play("click");
        startSurvival();
      });
    }

    if (els.exportBtn) {
      els.exportBtn.addEventListener("click", () => {
        play("click");
        exportProgress();
      });
    }

    if (els.importBtn && els.importFile) {
      els.importBtn.addEventListener("click", () => {
        play("click");
        els.importFile.click();
      });
      els.importFile.addEventListener("change", () => {
        const file = els.importFile.files && els.importFile.files[0];
        if (file) importProgress(file);
        els.importFile.value = "";
      });
    }

    els.resetBtn.addEventListener("click", () => {
      const sure = window.confirm("Xoá toàn bộ tiến độ và kỷ lục của game này?");
      if (!sure) return;
      writeJson(KEY_PROGRESS, {});
      writeJson(KEY_STATS, {});
      writeJson(KEY_LAST, {});
      writeJson(KEY_WRONG, {});
      state.stageIdx = 0;
      renderLevels();
      renderStages();
      updateStartLabel();
      renderSaveCards();
      els.resetBtn.textContent = "🗑 Đã xoá";
      window.setTimeout(() => (els.resetBtn.textContent = "🗑 Xoá tiến độ"), 1400);
    });

    if (els.langSelect) {
      els.langSelect.addEventListener("change", () => {
        const pack = DATA.packs.find((p) => p.id === els.langSelect.value);
        if (!pack) return;
        state.pack = pack;
        state.levelId = pack.levels[0].id;
        state.stageIdx = firstOpenStage(state.levelId);
        writeLocal(KEY_LANG, pack.id);
        renderLang();
        renderLevels();
        renderStages();
        updateStartLabel();
        renderSaveCards();
      });
    }

    if (els.soundBtn) {
      els.soundBtn.addEventListener("click", () => {
        if (!window.Sound) return;
        window.Sound.toggle();
        paintSound();
        if (window.Sound.isMuted()) stopSpeaking();
        else play("click");
      });
    }

    /* ---------- Tab Chơi / Học ---------- */
    if (els.tabPlay) {
      els.tabPlay.addEventListener("click", () => {
        play("click");
        showScreen("menu");
        renderLevels();
        renderStages();
        updateStartLabel();
        renderSaveCards();
      });
    }

    if (els.tabStudy) {
      els.tabStudy.addEventListener("click", () => {
        play("click");
        showScreen("study");
        renderTopics();
      });
    }

    if (els.lessonBack) {
      els.lessonBack.addEventListener("click", () => {
        play("click");
        showScreen("study");
        renderTopics();
      });
    }

    if (els.studyRandom) {
      els.studyRandom.addEventListener("click", () => {
        play("click");
        practiceAllTopics();
      });
    }

    if (els.studyPractice) {
      els.studyPractice.addEventListener("click", () => {
        const topic = topicById(state.topicId);
        const level = lessonLevel();
        if (!topic || !level) return;
        play("click");
        const time = level.id === "hard" ? 11 : level.id === "medium" ? 15 : 20;
        practiceFrom(level.items, `${topic.icon} ${topic.name} · ${level.name}`, time, "lesson");
      });
    }

    if (els.studyMarkAll) {
      els.studyMarkAll.addEventListener("click", () => {
        const topic = topicById(state.topicId);
        const level = lessonLevel();
        if (!topic || !level) return;

        const map = learnedMap();
        let removed = 0;
        level.items.forEach((_, i) => {
          const key = itemKey(topic.id, level.id, i);
          const legacy = legacyItemKey(topic.id, level.id, i);
          if (map[key] || map[legacy]) removed += 1;
          delete map[key];
          delete map[legacy];
        });
        if (!removed) return;

        writeJson(KEY_LEARNED, map);
        play("click");
        renderLesson();
      });
    }

    if (els.studyHideVi) {
      els.studyHideVi.addEventListener("click", () => {
        state.hideVi = !state.hideVi;
        saveStudyState();
        renderLesson();
      });
    }

    if (els.studySearch) {
      els.studySearch.addEventListener("input", () => {
        state.search = els.studySearch.value;
        renderCards();
      });
    }

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;

      // đang gõ pinyin trong thẻ → Esc chỉ đóng ô kiểm tra
      const quizCard = document.querySelector("#study-list .card.quiz-open");
      if (quizCard) {
        quizCard.classList.remove("quiz-open", "quiz-cjk", "quiz-en");
        const form = quizCard.querySelector(".card-quiz");
        const msg = quizCard.querySelector(".card-quiz-msg");
        if (form) form.remove();
        if (msg) msg.remove();
        return;
      }

      if (!els.overlay.classList.contains("hidden") || !els.play.classList.contains("hidden")) {
        backFromPlay();
        return;
      }
      if (els.lesson && !els.lesson.classList.contains("hidden")) {
        showScreen("study");
        renderTopics();
        return;
      }
      if (els.study && !els.study.classList.contains("hidden")) showScreen("menu");
    });
  }

  /* ---------- Khởi động ---------- */
  function clampStage(levelId, idx) {
    const level = state.pack.levels.find((lv) => lv.id === levelId) || state.pack.levels[0];
    const max = level.stages.length - 1;
    let value = Number.isInteger(idx) ? idx : 0;
    value = Math.max(0, Math.min(value, max));
    while (value > 0 && !isUnlocked(levelId, value)) value -= 1;
    return value;
  }

  function init() {
    if (!Array.isArray(DATA.packs) || DATA.packs.length === 0) {
      els.levels.innerHTML = '<p class="menu-note">Không tải được dữ liệu game (data.js).</p>';
      return;
    }

    const savedLang = readLocal(KEY_LANG);
    state.pack = DATA.packs.find((p) => p.id === savedLang) || DATA.packs[0];

    const last = readJson(KEY_LAST) || {};
    const lastLevel = state.pack.levels.find((lv) => lv.id === last.level);
    state.levelId = (lastLevel || state.pack.levels[0]).id;
    state.stageIdx =
      last.lang === state.pack.id && Number.isInteger(last.stage) ? clampStage(state.levelId, last.stage) : firstOpenStage(state.levelId);
    state.stageIdx = clampStage(state.levelId, state.stageIdx);

    /* Khôi phục vị trí học gần nhất */
    const study = readJson(KEY_STUDY) || {};
    if (study.levels && typeof study.levels === "object") state.levelMap = study.levels;
    if (study.lang && LESSON_SETS[study.lang] && LESSON_SETS[study.lang].topics.length) {
      state.studyLang = study.lang;
    } else if (!LESSON_SETS[state.studyLang] || !LESSON_SETS[state.studyLang].topics.length) {
      state.studyLang = LESSON_LANGS.length ? LESSON_LANGS[0].id : "en";
    }

    const topic = topicById(study.topic);
    const topics = studyTopics();
    if (topic) {
      state.topicId = topic.id;
      state.topicLevelId = topic.levels.some((lv) => lv.id === study.level) ? study.level : topic.levels[0].id;
      state.levelMap[`${state.studyLang}:${topic.id}`] = state.topicLevelId;
      state.hideVi = !!study.hideVi;
    } else if (topics.length) {
      state.topicId = topics[0].id;
      state.topicLevelId = topics[0].levels[0].id;
    }

    renderLang();
    renderLevels();
    renderStages();
    updateStartLabel();
    renderTopics();
    renderSaveCards();
    wire();
    paintSound();
    paintStrict();
    paintSlow();
    showScreen("menu");

    /* PWA: cài được lên màn hình chính + dùng offline (bỏ qua khi mở bằng file://) */
    if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
      try {
        navigator.serviceWorker.register("../sw.js").catch(() => {});
      } catch (_) {
        /* trình duyệt không hỗ trợ */
      }
    }

    /* Giọng đọc máy: danh sách có thể nạp bất đồng bộ */
    if ("speechSynthesis" in window) {
      refreshVoices();
      window.speechSynthesis.onvoiceschanged = refreshVoices;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
