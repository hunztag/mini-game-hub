/* ============================================================
   TIỆN ÍCH PINYIN — dùng chung cho data.js, lessons-zh.js, script.js
   ------------------------------------------------------------
   • toneless(py)  → mảng các biến thể pinyin KHÔNG DẤU
                     (ü→u, ü→v, có khoảng trắng / không khoảng trắng)
   • answers(py)   → [pinyin có dấu, …các biến thể không dấu]
   • mask(py)      → "m… h…" (gợi ý không lộ đáp án)
   • hasCjk(text)  → text có chữ Hán hay không

   Nhờ vậy người chơi có thể gõ CHỮ HÁN, PINYIN CÓ DẤU hoặc
   PINYIN KHÔNG DẤU (kể cả "nihao" / "ni hao") đều được tính đúng.
   ============================================================ */
window.ReflexPinyin = (() => {
  "use strict";

  /* Bảng bỏ dấu thanh */
  const TONE_MAP = {
    "ā": "a", "á": "a", "ǎ": "a", "à": "a",
    "ē": "e", "é": "e", "ě": "e", "è": "e",
    "ī": "i", "í": "i", "ǐ": "i", "ì": "i",
    "ō": "o", "ó": "o", "ǒ": "o", "ò": "o",
    "ū": "u", "ú": "u", "ǔ": "u", "ù": "u",
    "ǖ": "ü", "ǘ": "ü", "ǚ": "ü", "ǜ": "ü",
    "ń": "n", "ň": "n", "ǹ": "n",
    "ḿ": "m",
  };
  const TONE_RE = new RegExp("[" + Object.keys(TONE_MAP).join("") + "]", "g");

  const CJK_RE = /[\u3400-\u4dbf\u4e00-\u9fff]/;

  function clean(text) {
    return String(text == null ? "" : text)
      .replace(/[^a-z0-9 ]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /** Pinyin có dấu → các dạng không dấu có thể chấp nhận */
  function toneless(py) {
    const base = String(py == null ? "" : py).toLowerCase().replace(TONE_RE, (ch) => TONE_MAP[ch]);
    const out = [];
    const push = (value) => {
      const v = clean(value);
      if (v && out.indexOf(v) < 0) out.push(v);
    };
    push(base.replace(/ü/g, "u"));
    push(base.replace(/ü/g, "v"));
    push(base.replace(/ü/g, "u").replace(/ /g, ""));
    push(base.replace(/ü/g, "v").replace(/ /g, ""));
    return out;
  }

  /** Danh sách đáp án được chấp nhận cho một cụm pinyin */
  function answers(py) {
    const list = [String(py == null ? "" : py)];
    toneless(py).forEach((v) => {
      if (list.indexOf(v) < 0) list.push(v);
    });
    return list.filter(Boolean);
  }

  /** Gợi ý: "māo" → "m…", "nǐ hǎo" → "n… h…" */
  function mask(py) {
    return String(py == null ? "" : py)
      .split(/\s+/)
      .filter(Boolean)
      .map((syllable) => syllable[0] + "…")
      .join(" ");
  }

  const hasCjk = (text) => CJK_RE.test(String(text == null ? "" : text));

  return { toneless, answers, mask, hasCjk };
})();
