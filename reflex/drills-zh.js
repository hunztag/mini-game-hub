/* ============================================================
   BÀI LUYỆN NGHE — TIẾNG TRUNG
   ------------------------------------------------------------
   • pairs: các cặp âm dễ lẫn (z/zh, c/ch, s/sh, n/l, f/h, j/q/x,
     b/p, d/t, g/k). Mỗi cặp gồm 2 mục { en: chữ Hán, ipa: pinyin,
     vi: nghĩa } — nghe một bên rồi chọn đúng pinyin.
   • Dùng cho nút “🎧 Nghe dễ lẫn” ở màn Học từ vựng.
   ============================================================ */
window.ReflexZhDrills = {
  pairs: [
    /* ---------- z / zh ---------- */
    { tag: "z / zh", a: { en: "早", ipa: "zǎo", vi: "sớm" }, b: { en: "找", ipa: "zhǎo", vi: "tìm" } },
    { tag: "z / zh", a: { en: "脏", ipa: "zāng", vi: "bẩn" }, b: { en: "张", ipa: "zhāng", vi: "tờ (giấy), họ Trương" } },
    { tag: "z / zh", a: { en: "在", ipa: "zài", vi: "ở, tại" }, b: { en: "债", ipa: "zhài", vi: "món nợ" } },
    { tag: "z / zh", a: { en: "字", ipa: "zì", vi: "chữ" }, b: { en: "纸", ipa: "zhǐ", vi: "giấy" } },

    /* ---------- c / ch ---------- */
    { tag: "c / ch", a: { en: "从", ipa: "cóng", vi: "từ (phía)" }, b: { en: "虫", ipa: "chóng", vi: "con sâu" } },
    { tag: "c / ch", a: { en: "草", ipa: "cǎo", vi: "cỏ" }, b: { en: "吵", ipa: "chǎo", vi: "ồn ào" } },
    { tag: "c / ch", a: { en: "猜", ipa: "cāi", vi: "đoán" }, b: { en: "拆", ipa: "chāi", vi: "tháo ra" } },
    { tag: "c / ch", a: { en: "次", ipa: "cì", vi: "lần" }, b: { en: "吃", ipa: "chī", vi: "ăn" } },

    /* ---------- s / sh ---------- */
    { tag: "s / sh", a: { en: "四", ipa: "sì", vi: "bốn" }, b: { en: "十", ipa: "shí", vi: "mười" } },
    { tag: "s / sh", a: { en: "三", ipa: "sān", vi: "ba" }, b: { en: "山", ipa: "shān", vi: "núi" } },
    { tag: "s / sh", a: { en: "岁", ipa: "suì", vi: "tuổi" }, b: { en: "睡", ipa: "shuì", vi: "ngủ" } },
    { tag: "s / sh", a: { en: "素", ipa: "sù", vi: "món chay" }, b: { en: "书", ipa: "shū", vi: "sách" } },

    /* ---------- n / l ---------- */
    { tag: "n / l", a: { en: "那", ipa: "nà", vi: "kia, đó" }, b: { en: "辣", ipa: "là", vi: "cay" } },
    { tag: "n / l", a: { en: "你", ipa: "nǐ", vi: "bạn" }, b: { en: "里", ipa: "lǐ", vi: "bên trong" } },
    { tag: "n / l", a: { en: "难", ipa: "nán", vi: "khó" }, b: { en: "蓝", ipa: "lán", vi: "màu xanh lam" } },
    { tag: "n / l", a: { en: "脑", ipa: "nǎo", vi: "não" }, b: { en: "老", ipa: "lǎo", vi: "già" } },

    /* ---------- f / h ---------- */
    { tag: "f / h", a: { en: "飞", ipa: "fēi", vi: "bay" }, b: { en: "黑", ipa: "hēi", vi: "đen" } },
    { tag: "f / h", a: { en: "饭", ipa: "fàn", vi: "cơm" }, b: { en: "汗", ipa: "hàn", vi: "mồ hôi" } },

    /* ---------- j / q / x ---------- */
    { tag: "j / q", a: { en: "鸡", ipa: "jī", vi: "con gà" }, b: { en: "七", ipa: "qī", vi: "bảy" } },
    { tag: "q / x", a: { en: "七", ipa: "qī", vi: "bảy" }, b: { en: "西", ipa: "xī", vi: "hướng tây" } },
    { tag: "j / x", a: { en: "叫", ipa: "jiào", vi: "gọi" }, b: { en: "小", ipa: "xiǎo", vi: "nhỏ" } },
    { tag: "q / x", a: { en: "钱", ipa: "qián", vi: "tiền" }, b: { en: "咸", ipa: "xián", vi: "mặn" } },

    /* ---------- b / p ---------- */
    { tag: "b / p", a: { en: "爸", ipa: "bà", vi: "bố" }, b: { en: "怕", ipa: "pà", vi: "sợ" } },
    { tag: "b / p", a: { en: "白", ipa: "bái", vi: "trắng" }, b: { en: "排", ipa: "pái", vi: "xếp hàng" } },

    /* ---------- d / t ---------- */
    { tag: "d / t", a: { en: "大", ipa: "dà", vi: "to, lớn" }, b: { en: "他", ipa: "tā", vi: "anh ấy" } },
    { tag: "d / t", a: { en: "读", ipa: "dú", vi: "đọc" }, b: { en: "图", ipa: "tú", vi: "hình, bản đồ" } },

    /* ---------- g / k ---------- */
    { tag: "g / k", a: { en: "狗", ipa: "gǒu", vi: "con chó" }, b: { en: "口", ipa: "kǒu", vi: "miệng" } },
    { tag: "g / k", a: { en: "高", ipa: "gāo", vi: "cao" }, b: { en: "考", ipa: "kǎo", vi: "thi, kiểm tra" } },
  ],
};
