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
  const LESSONS = window.ReflexLessons || { topics: [] };
  const KEY_LANG = "reflex-lang";
  const KEY_PROGRESS = "reflex-progress";
  const KEY_LAST = "reflex-last";
  const KEY_LEARNED = "reflex-learned";
  const KEY_STUDY = "reflex-study";

  const MAX_LIVES = 3;
  const HINT_PENALTY = 3000; // mở gợi ý mất 3 giây
  const TICK_MS = 50;

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

  /** So khớp "dễ thở": không phân biệt hoa/thường, dấu câu, a/an/the, cho phép sai 1 ký tự */
  function matches(input, answer) {
    const a = norm(input);
    const b = norm(answer);
    if (!a || !b) return false;
    if (a === b) return true;
    if (stripArticle(a) === stripArticle(b)) return true;
    if (!b.includes(" ") && b.length >= 6 && editDistance(a, b, 1) <= 1) return true;
    return false;
  }

  function openValid(text) {
    const n = norm(text);
    if (!n) return false;
    return n.split(" ").filter(Boolean).length >= 2 && n.length >= 4;
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
    topics: $("topics"),
    studyRandom: $("study-random"),
    lesson: $("lesson"),
    lessonBack: $("lesson-back"),
    lessonIcon: $("lesson-icon"),
    lessonName: $("lesson-name"),
    lessonLevels: $("lesson-levels"),
    studyFill: $("study-fill"),
    studyCount: $("study-count"),
    studyHideVi: $("study-hide-vi"),
    studySearch: $("study-search"),
    studyList: $("study-list"),
    studyPractice: $("study-practice"),
    studyMarkAll: $("study-mark-all"),
  };

  /* ---------- Trạng thái ---------- */
  const state = {
    pack: null,
    mode: "stage", // "stage" = chơi theo màn, "custom" = luyện từ chủ đề
    custom: null,
    customBack: "lesson",
    topicId: "",
    topicLevelId: "basic",
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
  const itemKey = (topicId, levelId, index) => `${topicId}|${levelId}|${index}`;

  function learnedMap() {
    const raw = readJson(KEY_LEARNED);
    const out = {};
    if (raw) for (const k of Object.keys(raw)) if (raw[k]) out[k] = 1;
    return out;
  }

  function topicById(id) {
    return LESSONS.topics.find((t) => t.id === id) || null;
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
      if (map[itemKey(topic.id, level.id, i)]) n += 1;
    });
    return n;
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
    els.topics.innerHTML = "";
    if (!LESSONS.topics.length) {
      els.topics.innerHTML = '<p class="menu-note">Không tải được dữ liệu học (lessons.js).</p>';
      return;
    }

    const map = learnedMap();
    for (const topic of LESSONS.topics) {
      let total = 0;
      let done = 0;
      topic.levels.forEach((lv) => {
        lv.items.forEach((_, i) => {
          total += 1;
          if (map[itemKey(topic.id, lv.id, i)]) done += 1;
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
    const remembered = state.levelMap[topic.id];
    const valid = levelId || (topic.levels.some((lv) => lv.id === remembered) ? remembered : "");
    state.topicId = topic.id;
    state.topicLevelId = valid || (topic.levels[0] && topic.levels[0].id) || "basic";
    state.levelMap[topic.id] = state.topicLevelId;
    state.search = "";
    if (els.studySearch) els.studySearch.value = "";
    saveStudyState();
    showScreen("lesson");
    renderLesson();
  }

  function saveStudyState() {
    writeJson(KEY_STUDY, {
      topic: state.topicId,
      level: state.topicLevelId,
      levels: state.levelMap,
      hideVi: !!state.hideVi,
    });
  }

  function renderLesson() {
    const topic = topicById(state.topicId);
    if (!topic) return;

    els.lessonIcon.textContent = topic.icon;
    els.lessonName.textContent = topic.name;
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
        state.levelMap[topic.id] = lv.id;
        saveStudyState();
        renderLesson();
      });
      els.lessonLevels.appendChild(btn);
    }

    if (els.studyHideVi) {
      els.studyHideVi.setAttribute("aria-pressed", state.hideVi ? "true" : "false");
      els.studyHideVi.textContent = state.hideVi ? "👁 Hiện nghĩa" : "🙈 Ẩn nghĩa";
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
  }

  function renderCards() {
    const topic = topicById(state.topicId);
    const level = lessonLevel();
    if (!topic || !level || !els.studyList) return;

    const map = learnedMap();
    const q = norm(state.search);
    const rows = level.items
      .map((item, i) => ({ item, i }))
      .filter(({ item }) => !q || norm(item.en).includes(q) || norm(item.vi).includes(q));

    els.studyList.innerHTML = "";
    els.studyList.classList.toggle("hide-vi", !!state.hideVi);
    updateStudyProgress();

    if (!rows.length) {
      els.studyList.innerHTML = '<p class="menu-note">Không tìm thấy mục nào khớp.</p>';
      return;
    }

    for (const { item, i } of rows) {
      const learned = !!map[itemKey(topic.id, level.id, i)];
      const card = document.createElement("article");
      card.className = "card" + (learned ? " learned" : "");
      card.dataset.index = String(i);
      card.innerHTML = `
        <button class="card-main" type="button">
          <span class="card-en">${esc(item.en)}</span>
          ${item.ipa ? `<span class="card-ipa">${esc(item.ipa)}</span>` : ""}
          <span class="card-vi">${esc(item.vi)}</span>
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
        speak(item.en);
      });

      card.querySelector(".card-check").addEventListener("click", (event) => {
        event.stopPropagation();
        const all = learnedMap();
        const key = itemKey(topic.id, level.id, i);
        const now = !all[key];
        if (now) all[key] = 1;
        else delete all[key];
        writeJson(KEY_LEARNED, all);

        card.classList.toggle("learned", now);
        card.querySelector(".card-check").setAttribute("aria-pressed", now ? "true" : "false");
        if (now) play("click");
        updateStudyProgress();
      });

      els.studyList.appendChild(card);
    }
  }

  /* ---------- Sinh câu hỏi luyện từ danh sách đã học ---------- */
  function buildPractice(items, count) {
    const pool = (items || []).filter((it) => it && it.en && it.vi);
    if (!pool.length) return [];

    const picked = shuffle(pool.slice()).slice(0, Math.min(count || 12, pool.length));
    const viPool = pool.map((it) => it.vi);
    const list = [];

    picked.forEach((item, i) => {
      const long = item.phrase || item.en.split(" ").length >= 3;

      // cứ 4 câu thì có 1 câu trắc nghiệm chiều Anh → Việt
      if (i % 4 === 3) {
        const others = shuffle(viPool.filter((v) => v !== item.vi)).slice(0, 3);
        if (others.length === 3) {
          list.push({
            k: "choice",
            q: `Từ “${item.en}” có nghĩa là gì?`,
            o: shuffle([item.vi].concat(others)),
            a: [item.vi],
            hint: item.ipa || "",
          });
          return;
        }
      }

      list.push({
        k: long ? "sentence" : "word",
        q: item.vi,
        a: [item.en],
        hint: item.ipa || "",
      });
    });

    return list;
  }

  function practiceFrom(items, title, time, back) {
    const list = buildPractice(items, 12);
    if (!list.length) return;
    startCustom(list, { title, time, items: items.slice(), count: 12, back: back || "lesson" });
  }

  function practiceAllTopics() {
    const items = [];
    LESSONS.topics.forEach((topic) => {
      topic.levels.forEach((lv) => {
        lv.items.forEach((it) => items.push(it));
      });
    });
    practiceFrom(items, "🔀 Luyện tổng hợp · 12 chủ đề", 15, "study");
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

    els.overlay.classList.add("hidden");
    els.quitBtn.textContent = "← Về phần Học";
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
    els.choices.innerHTML = "";
    els.choices.classList.add("hidden");
    els.speakBtn.classList.add("hidden");
    els.input.value = "";
    els.input.disabled = false;
    els.input.placeholder = "Gõ câu trả lời…";

    switch (q.k) {
      case "gap":
        els.promptKind.textContent = "Điền từ còn thiếu";
        els.promptText.innerHTML = esc(q.q).replace(/_{2,}/g, '<span class="blank">?</span>');
        setHint(q.hint, true);
        break;

      case "listen":
        els.promptKind.textContent = "Nghe và viết lại";
        els.promptText.innerHTML = '<span class="say-icon">🔊</span>Nghe rồi gõ lại từ tiếng Anh';
        els.speakBtn.classList.remove("hidden");
        setHint(q.hint, true);
        speak(q.say || q.q);
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
    if (q.k === "gap") return q.q.replace(/_{2,}/g, first);
    return first;
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

    if (q.a.some((ans) => matches(value, ans))) onCorrect(false);
    else onWrong(value);
  }

  function onCorrect(isOpen) {
    state.locked = true;
    stopTimer();

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

  function onWrong(text) {
    state.locked = true;
    stopTimer();
    play("error");

    state.combo = 0;
    state.lives -= 1;
    markChoices(state.current, text, false);
    els.input.disabled = true;
    updateHud();

    els.feedback.className = "feedback bad";
    els.feedback.innerHTML = `❌ Chưa đúng — đáp án: <b>${esc(answerText(state.current))}</b>`;

    state.nextTimer = window.setTimeout(afterMiss, 1900);
  }

  function timeUp() {
    if (state.locked) return;
    state.locked = true;
    stopTimer();
    play("timeout");

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
    state.idx += 1;
    askNext();
  }

  function markChoices(q, picked, ok) {
    if (!q || q.k !== "choice") return;
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
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();

    /* ---------- Luyện theo chủ đề: không lưu kỷ lục màn ---------- */
    if (state.mode === "custom") {
      const opts = state.custom || {};
      const totalQ = state.list.length;
      const accuracyQ = totalQ ? Math.round((state.correct / totalQ) * 100) : 0;

      els.ovTitle.textContent = cleared ? "Hoàn thành! 🎉" : "Hết lượt 😢";
      els.ovTitle.className = cleared ? "" : "lose";
      els.ovText.innerHTML = [
        `Điểm: <b>${state.score}</b>`,
        `Đúng ${state.correct}/${totalQ} câu (${accuracyQ}%) · chuỗi cao nhất ×${state.maxCombo}`,
        cleared ? "Bạn đã luyện xong bộ từ này." : "Còn 0 mạng — thử lại nhé.",
      ].join("<br>");

      els.ovActions.innerHTML = "";
      addOverlayBtn("↺ Luyện lại", "primary-btn", () => {
        els.overlay.classList.add("hidden");
        const again = buildPractice(opts.items || [], opts.count || 12);
        if (again.length) startCustom(again, opts);
        else backFromPlay();
      });
      addOverlayBtn("← Về phần Học", "ghost-btn", () => {
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
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();

    els.overlay.classList.add("hidden");

    if (state.mode === "custom") {
      const back = state.customBack;
      state.mode = "stage";
      state.custom = null;
      els.quitBtn.textContent = "← Chọn màn";

      if (back === "study") {
        showScreen("study");
        renderTopics();
      } else {
        showScreen("lesson");
        renderLesson();
      }
      return;
    }

    showScreen("menu");
    renderLevels();
    renderStages();
    updateStartLabel();
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
  function speak(text) {
    if (!text || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(String(text));
      utter.lang = state.pack.voice || "en-US";
      utter.rate = 0.92;
      window.speechSynthesis.speak(utter);
    } catch (_) {
      /* trình duyệt không hỗ trợ đọc tiếng */
    }
  }

  /* ---------- Nút âm thanh ---------- */
  function paintSound() {
    if (!els.soundBtn || !window.Sound) return;
    const muted = Boolean(window.Sound.isMuted && window.Sound.isMuted());
    els.soundBtn.textContent = muted ? "🔇" : "🔊";
    els.soundBtn.classList.toggle("off", muted);
    els.soundBtn.setAttribute("aria-pressed", muted ? "false" : "true");
  }

  /* ---------- Gắn sự kiện ---------- */
  function wire() {
    els.form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (state.locked || !state.current || state.current.k === "choice") return;
      judge(els.input.value);
    });

    els.hintBtn.addEventListener("click", useHint);
    els.speakBtn.addEventListener("click", () => {
      const q = state.current;
      if (q) speak(q.say || q.q);
    });

    els.startBtn.addEventListener("click", () => {
      play("click");
      startStage();
    });

    els.quitBtn.addEventListener("click", () => backFromPlay());

    els.resetBtn.addEventListener("click", () => {
      const sure = window.confirm("Xoá toàn bộ tiến độ và kỷ lục của game này?");
      if (!sure) return;
      writeJson(KEY_PROGRESS, {});
      state.stageIdx = 0;
      renderLevels();
      renderStages();
      updateStartLabel();
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
      });
    }

    if (els.soundBtn) {
      els.soundBtn.addEventListener("click", () => {
        if (!window.Sound) return;
        window.Sound.toggle();
        paintSound();
        if (!window.Sound.isMuted()) play("click");
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
        const allLearned = level.items.every((_, i) => map[itemKey(topic.id, level.id, i)]);
        level.items.forEach((_, i) => {
          const key = itemKey(topic.id, level.id, i);
          if (allLearned) delete map[key];
          else map[key] = 1;
        });
        writeJson(KEY_LEARNED, map);
        els.studyMarkAll.textContent = allLearned ? "✓ Đánh dấu đã thuộc tất cả" : "↺ Bỏ đánh dấu tất cả";
        renderCards();
        play("click");
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
    const topic = topicById(study.topic);
    if (topic) {
      state.topicId = topic.id;
      state.topicLevelId = topic.levels.some((lv) => lv.id === study.level) ? study.level : topic.levels[0].id;
      state.levelMap[topic.id] = state.topicLevelId;
      state.hideVi = !!study.hideVi;
    } else if (LESSONS.topics.length) {
      state.topicId = LESSONS.topics[0].id;
      state.topicLevelId = LESSONS.topics[0].levels[0].id;
    }

    renderLang();
    renderLevels();
    renderStages();
    updateStartLabel();
    renderTopics();
    wire();
    paintSound();
    showScreen("menu");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
