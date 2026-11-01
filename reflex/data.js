/* ============================================================
   NỘI DUNG GAME PHẢN XẠ NGOẠI NGỮ — tách riêng khỏi logic
   ------------------------------------------------------------
   Muốn thêm MỘT NGÔN NGỮ MỚI: chỉ cần thêm 1 pack vào mảng `packs`
   bên dưới (không phải sửa script.js). Cấu trúc:

     pack   = { id, flag, name, targetLabel, sourceLabel, voice, levels[] }
     level  = { id, name, desc, time, stages[] }        // time = giây mỗi câu
     stage  = { name, questions[] }

   Loại câu hỏi (trường k):

     w (word)      dịch một từ            w("con mèo", ["cat"], "🐱")
     s (sentence)  dịch một câu            s("Tôi thích táo.", ["I like apples"])
     g (gap)       điền vào chỗ trống      g("She ___ to school.", ["goes"], "đi")
     qa (question) trả lời câu hỏi ngắn    qa("Trái nghĩa của hot?", ["cold"])
     op (open)     câu hỏi mở, có câu mẫu op("How old are you?", "I am 20 years old.")
     mc (choice)   trắc nghiệm             mc("Từ nào là màu?", ["red","desk"], "red")
     ls (listen)   nghe rồi viết lại       ls("banana", "quả chuối")

   `a` là MẢNG các đáp án được chấp nhận (đáp án đầu tiên dùng để hiển thị).
   So khớp không phân biệt hoa/thường, dấu câu, mạo từ "a/an/the", gạch nối
   và cho phép sai 1 ký tự với đáp án dài từ 6 chữ cái.
   ============================================================ */
window.ReflexData = (() => {
  "use strict";

  /* ---------- Helper viết câu hỏi cho gọn ---------- */
  const w = (q, a, hint) => ({ k: "word", q, a: [].concat(a), hint: hint || "" });
  const s = (q, a, hint) => ({ k: "sentence", q, a: [].concat(a), hint: hint || "" });
  const g = (q, a, hint) => ({ k: "gap", q, a: [].concat(a), hint: hint || "" });
  const qa = (q, a, hint) => ({ k: "question", q, a: [].concat(a), hint: hint || "" });
  const op = (q, sample, hint) => ({ k: "open", q, a: [], sample, hint: hint || "" });
  const mc = (q, o, answer, hint) => ({ k: "choice", q, o: [].concat(o), a: [answer], hint: hint || "" });
  const ls = (text, hint) => ({ k: "listen", q: text, say: text, a: [text], hint: hint || "" });

  /* ---------- Helper riêng cho TIẾNG TRUNG ----------
     Người chơi có thể gõ CHỮ HÁN, PINYIN CÓ DẤU hoặc PINYIN KHÔNG DẤU.
     `show` là đáp án hiển thị khi chấm (chữ Hán · pinyin).            */
  const PY = window.ReflexPinyin || { answers: (p) => [p], mask: (p) => p, hasCjk: () => false };
  const zAns = (chars, py) => [chars].concat(PY.answers(py));
  const zShow = (chars, py) => `${chars} · ${py}`;
  const zHint = (py, extra) => [PY.mask(py), extra].filter(Boolean).join(" ");
  const zh = (q, chars, py, extra) => ({ k: "word", q, a: zAns(chars, py), show: zShow(chars, py), hint: zHint(py, extra) });
  const zs = (q, chars, py, extra) => ({ k: "sentence", q, a: zAns(chars, py), show: zShow(chars, py), hint: zHint(py, extra) });
  const zg = (q, chars, py, extra) => ({ k: "gap", q, a: zAns(chars, py), py, show: zShow(chars, py), hint: extra || "" });
  const zl = (chars, py) => ({ k: "listen", q: chars, say: chars, a: zAns(chars, py), show: zShow(chars, py), hint: "" });

  /* ============================================================
     🇬🇧 TIẾNG ANH
     ============================================================ */
  const EN = {
    id: "en",
    flag: "🇬🇧",
    name: "English",
    targetLabel: "tiếng Anh",
    sourceLabel: "tiếng Việt",
    voice: "en-US",
    levels: [
      /* ------------------------- CƠ BẢN ------------------------- */
      {
        id: "basic",
        name: "Cơ bản",
        desc: "Từ vựng quen thuộc, câu ngắn",
        time: 20,
        stages: [
          {
            name: "Làm quen",
            questions: [
              w("con mèo", ["cat"], "🐱"),
              w("con chó", ["dog"], "🐶"),
              w("quả táo", ["apple", "an apple"], "🍎"),
              w("nước", ["water"], "💧"),
              mc("Từ nào có nghĩa là “ngôi nhà”?", ["house", "horse", "mouse", "hour"], "house"),
              w("quyển sách", ["book", "a book"], "📖"),
              ls("banana", "🍌 quả chuối"),
              w("màu đỏ", ["red"], "🔴"),
            ],
          },
          {
            name: "Đồ vật & gia đình",
            questions: [
              w("cái bàn", ["table", "desk", "a table"], "🪵"),
              w("cái ghế", ["chair", "a chair"], "🪑"),
              w("mẹ", ["mother", "mom", "mum"], "👩"),
              w("bố", ["father", "dad"], "👨"),
              w("anh trai", ["brother", "older brother"], "👦"),
              w("chị gái", ["sister", "older sister"], "👧"),
              w("trường học", ["school"], "🏫"),
              mc("Từ nào có nghĩa là “bạn bè”?", ["friend", "family", "father", "floor"], "friend"),
            ],
          },
          {
            name: "Câu ngắn",
            questions: [
              s("Tôi thích ăn táo.", ["I like eating apples", "I like to eat apples", "I like apples"]),
              s("Cô ấy là giáo viên.", ["She is a teacher", "She's a teacher"]),
              s("Hôm nay trời mưa.", ["It is raining today", "It's raining today", "Today it is raining", "Today it's raining"]),
              s("Tôi có hai con mèo.", ["I have two cats", "I have got two cats", "I've got two cats"]),
              s("Anh ấy đi làm mỗi ngày.", ["He goes to work every day", "He goes to work everyday"]),
              s("Chúng tôi đang học tiếng Anh.", ["We are learning English", "We're learning English"]),
              op("What is your name?", "My name is Nam.", "Giới thiệu tên của bạn bằng tiếng Anh"),
              op("How old are you?", "I am twenty years old.", "Trả lời tuổi của bạn bằng tiếng Anh"),
            ],
          },
        ],
      },

      /* ------------------------ TRUNG CẤP ----------------------- */
      {
        id: "medium",
        name: "Trung cấp",
        desc: "Từ vựng mở rộng, ngữ pháp, câu dài",
        time: 15,
        stages: [
          {
            name: "Từ vựng mở rộng",
            questions: [
              w("kinh nghiệm", ["experience"]),
              w("môi trường", ["environment"]),
              w("cơ hội", ["opportunity", "chance", "an opportunity", "a chance"]),
              w("quyết định", ["decision", "a decision"], "(danh từ)"),
              w("phát triển", ["develop", "to develop", "grow"], "(động từ)"),
              w("giải thích", ["explain", "to explain"]),
              w("ảnh hưởng", ["influence", "affect", "effect"]),
              mc("Từ nào có nghĩa là “sự khác biệt”?", ["difference", "different", "difficult", "differently"], "difference"),
            ],
          },
          {
            name: "Điền từ còn thiếu",
            questions: [
              g("She ___ to school every day.", ["goes"], "đi (chia đúng thì hiện tại đơn)"),
              g("I have lived here ___ 2019.", ["since"], "từ (mốc thời gian)"),
              g("He is good ___ playing football.", ["at"], "giỏi về việc gì"),
              g("If it ___ tomorrow, we will stay at home.", ["rains"], "mưa (điều kiện loại 1)"),
              g("This book is ___ interesting than that one.", ["more"], "so sánh hơn của tính từ dài"),
              g("They have ___ finished the project.", ["already"], "đã … rồi"),
              g("I look forward ___ hearing from you.", ["to"], "mong chờ điều gì"),
              g("She asked me ___ I was tired.", ["if", "whether"], "liệu … có … không"),
            ],
          },
          {
            name: "Câu trung cấp",
            questions: [
              s("Tôi đã sống ở đây được 5 năm.", ["I have lived here for five years", "I have lived here for 5 years", "I've lived here for five years", "I've lived here for 5 years"]),
              s("Nếu tôi có thời gian, tôi sẽ đi du lịch.", ["If I had time, I would travel", "If I had time I would travel", "If I had time, I'd travel", "If I have time, I will travel", "If I have time I will travel"]),
              s("Anh ấy nói rằng anh ấy sẽ đến muộn.", ["He said that he would be late", "He said he would be late", "He said that he will be late", "He said he will be late"]),
              s("Cô ấy thích đọc sách hơn xem TV.", ["She prefers reading books to watching TV", "She likes reading books more than watching TV", "She prefers reading to watching TV"]),
              s("Bạn có thể giúp tôi mang cái này không?", ["Can you help me carry this", "Could you help me carry this", "Can you help me to carry this"]),
              s("Học tiếng Anh rất quan trọng.", ["Learning English is very important", "Studying English is very important", "To learn English is very important"]),
              s("Tôi ước mình có nhiều tiền hơn.", ["I wish I had more money"]),
              s("Bức tranh này được vẽ bởi Picasso.", ["This picture was painted by Picasso", "This painting was painted by Picasso"]),
            ],
          },
        ],
      },

      /* ------------------------ NÂNG CAO ------------------------ */
      {
        id: "hard",
        name: "Nâng cao",
        desc: "Từ trừu tượng, phản xạ nhanh, câu phức",
        time: 11,
        stages: [
          {
            name: "Từ trừu tượng",
            questions: [
              w("sự kiên nhẫn", ["patience"]),
              w("thuyết phục", ["persuade", "convince", "to persuade", "to convince"]),
              w("thảm họa", ["disaster", "catastrophe", "a disaster"]),
              w("sự thịnh vượng", ["prosperity"]),
              w("thử thách", ["challenge", "a challenge"]),
              w("tận dụng", ["take advantage of", "make use of", "utilize", "utilise"]),
              w("sự đóng góp", ["contribution"]),
              w("kiên trì", ["persistent", "perseverance", "tenacious"]),
            ],
          },
          {
            name: "Phản xạ nhanh",
            questions: [
              qa("What is the past tense of “go”?", ["went"]),
              qa("What is the plural of “child”?", ["children"]),
              qa("What is the opposite of “expensive”?", ["cheap", "inexpensive"]),
              qa("What is the opposite of “always”?", ["never"]),
              qa("What is the comparative form of “good”?", ["better"]),
              qa("What is the capital of England?", ["london"]),
              qa("What do you say when someone helps you?", ["thank you", "thanks", "thank you very much"]),
              mc("Từ nào KHÔNG phải là màu sắc?", ["table", "purple", "orange", "grey"], "table"),
            ],
          },
          {
            name: "Câu phức",
            questions: [
              s("Mặc dù trời mưa, chúng tôi vẫn đi dạo.", ["Although it was raining, we still went for a walk", "Although it rained, we still went for a walk", "Even though it was raining, we still went for a walk"]),
              s("Anh ấy không những thông minh mà còn chăm chỉ.", ["He is not only smart but also hard-working", "He is not only smart but also hardworking", "Not only is he smart, but he is also hard-working", "He is not only intelligent but also hard-working"]),
              s("Nếu tôi biết trước, tôi đã không đến.", ["If I had known, I would not have come", "If I had known, I wouldn't have come", "If I'd known, I wouldn't have come"]),
              s("Cô ấy đã quen với việc dậy sớm.", ["She is used to getting up early", "She was used to getting up early", "She has got used to getting up early"]),
              s("Đó là lý do tại sao tôi không thể đến.", ["That is why I could not come", "That's why I couldn't come", "That is why I couldn't come", "That's why I could not come"]),
              s("Tôi đang mong chờ được gặp bạn.", ["I am looking forward to seeing you", "I'm looking forward to seeing you", "I am looking forward to meeting you"]),
              s("Việc anh ta từ chức khiến mọi người bất ngờ.", ["His resignation surprised everyone", "His resignation was a surprise to everyone"]),
              s("Càng học nhiều, bạn càng biết nhiều.", ["The more you learn, the more you know", "The more you study, the more you know"]),
            ],
          },
        ],
      },
    ],
  };

  /* ============================================================
     🇨🇳 TIẾNG TRUNG (中文) — hiện chữ Hán + pinyin
     ============================================================ */
  const ZH = {
    id: "zh",
    flag: "🇨🇳",
    name: "中文",
    targetLabel: "tiếng Trung",
    sourceLabel: "tiếng Việt",
    voice: "zh-CN",
    placeholder: "Gõ chữ Hán hoặc pinyin (có dấu / không dấu)…",
    levels: [
      /* ------------------------- CƠ BẢN ------------------------- */
      {
        id: "basic",
        name: "Cơ bản",
        desc: "Từ vựng quen thuộc, câu ngắn",
        time: 20,
        stages: [
          {
            name: "Làm quen",
            questions: [
              zh("con mèo", "猫", "māo", "🐱"),
              zh("con chó", "狗", "gǒu", "🐶"),
              zh("quả táo", "苹果", "píngguǒ", "🍎"),
              zh("nước", "水", "shuǐ", "💧"),
              mc("Chữ nào có nghĩa là “ngôi nhà”?", ["家", "马", "猫", "山"], "家"),
              zh("quyển sách", "书", "shū", "📖"),
              zl("朋友", "péngyou"),
              zh("màu đỏ", "红色", "hóngsè", "🔴"),
            ],
          },
          {
            name: "Đồ vật & gia đình",
            questions: [
              zh("cái bàn", "桌子", "zhuōzi", "🪵"),
              zh("cái ghế", "椅子", "yǐzi", "🪑"),
              zh("mẹ", "妈妈", "māma", "👩"),
              zh("bố", "爸爸", "bàba", "👨"),
              zh("anh trai", "哥哥", "gēge", "👦"),
              zh("chị gái", "姐姐", "jiějie", "👧"),
              zh("trường học", "学校", "xuéxiào", "🏫"),
              mc("Chữ nào có nghĩa là “bạn bè”?", ["朋友", "家人", "老师", "医生"], "朋友"),
            ],
          },
          {
            name: "Câu ngắn",
            questions: [
              zs("Tôi thích ăn táo.", "我喜欢吃苹果。", "Wǒ xǐhuan chī píngguǒ."),
              zs("Cô ấy là giáo viên.", "她是老师。", "Tā shì lǎoshī."),
              zs("Hôm nay trời mưa.", "今天下雨。", "Jīntiān xiàyǔ."),
              zs("Tôi có hai con mèo.", "我有两只猫。", "Wǒ yǒu liǎng zhī māo."),
              zs("Anh ấy đi làm mỗi ngày.", "他每天去上班。", "Tā měitiān qù shàngbān."),
              zs("Chúng tôi đang học tiếng Trung.", "我们在学中文。", "Wǒmen zài xué Zhōngwén."),
              zs("Tôi tên là Nam.", "我叫南。", "Wǒ jiào Nán."),
              zs("Tôi hai mươi tuổi.", "我二十岁。", "Wǒ èrshí suì."),
            ],
          },
        ],
      },

      /* ------------------------ TRUNG CẤP ----------------------- */
      {
        id: "medium",
        name: "Trung cấp",
        desc: "Từ vựng mở rộng, ngữ pháp, câu dài",
        time: 15,
        stages: [
          {
            name: "Từ vựng mở rộng",
            questions: [
              zh("kinh nghiệm", "经验", "jīngyàn"),
              zh("môi trường", "环境", "huánjìng"),
              zh("cơ hội", "机会", "jīhuì"),
              zh("quyết định", "决定", "juédìng", "(danh từ / động từ)"),
              zh("phát triển", "发展", "fāzhǎn", "(động từ)"),
              zh("giải thích", "解释", "jiěshì"),
              zh("ảnh hưởng", "影响", "yǐngxiǎng"),
              mc("Chữ nào có nghĩa là “sự khác biệt”?", ["区别", "相同", "困难", "容易"], "区别"),
            ],
          },
          {
            name: "Điền chữ còn thiếu",
            questions: [
              zg("我以前是老师，现在是___生。", "学", "xué", "học (学生 = học sinh)"),
              zg("我___北京工作。", "在", "zài", "ở / tại"),
              zg("他每天___汉语。", "学习", "xuéxí", "học"),
              zg("这___书很有意思。", "本", "běn", "lượng từ cho sách"),
              zg("我___喜欢吃苹果。", "很", "hěn", "rất"),
              zg("昨天我___电影了。", "看", "kàn", "xem (đã xem)"),
              zg("他___我早点儿回家。", "让", "ràng", "bảo / để"),
              zg("如果明天下雨，我们___不去。", "就", "jiù", "thì"),
            ],
          },
          {
            name: "Câu trung cấp",
            questions: [
              zs("Tôi đã sống ở đây được 5 năm.", "我在这里住了五年了。", "Wǒ zài zhèlǐ zhù le wǔ nián le."),
              zs("Nếu tôi có thời gian, tôi sẽ đi du lịch.", "如果我有时间，我就去旅行。", "Rúguǒ wǒ yǒu shíjiān, wǒ jiù qù lǚxíng."),
              zs("Anh ấy nói rằng anh ấy sẽ đến muộn.", "他说他会迟到。", "Tā shuō tā huì chídào."),
              zs("Cô ấy thích đọc sách hơn xem TV.", "她喜欢看书，不喜欢看电视。", "Tā xǐhuan kànshū, bù xǐhuan kàn diànshì."),
              zs("Bạn có thể giúp tôi mang cái này không?", "你能帮我拿这个吗？", "Nǐ néng bāng wǒ ná zhège ma?"),
              zs("Học tiếng Trung rất quan trọng.", "学习中文很重要。", "Xuéxí Zhōngwén hěn zhòngyào."),
              zs("Tôi ước mình có nhiều tiền hơn.", "我希望我有更多的钱。", "Wǒ xīwàng wǒ yǒu gèng duō de qián."),
              zs("Bức tranh này được vẽ bởi Picasso.", "这幅画是毕加索画的。", "Zhè fú huà shì Bìjiāsuǒ huà de."),
            ],
          },
        ],
      },

      /* ------------------------- NÂNG CAO ----------------------- */
      {
        id: "hard",
        name: "Nâng cao",
        desc: "Thành ngữ, sắc thái, câu phức",
        time: 11,
        stages: [
          {
            name: "Từ trừu tượng",
            questions: [
              zh("trách nhiệm", "责任", "zérèn"),
              zh("thành tựu", "成就", "chéngjiù"),
              zh("thuyết phục", "说服", "shuōfú"),
              zh("kiên nhẫn", "耐心", "nàixīn"),
              zh("sự thỏa hiệp", "妥协", "tuǒxié"),
              zh("tận dụng", "利用", "lìyòng"),
              zh("mâu thuẫn", "矛盾", "máodùn"),
              mc("Chữ nào có nghĩa là “sự tin tưởng”?", ["信任", "怀疑", "惊讶", "后悔"], "信任"),
            ],
          },
          {
            name: "Nghe và phản xạ",
            questions: [
              zl("朋友", "péngyou"),
              zl("时间", "shíjiān"),
              zl("重要", "zhòngyào"),
              zl("问题", "wèntí"),
              zl("喜欢", "xǐhuan"),
              zl("谢谢", "xièxie"),
              zl("对不起", "duìbuqǐ"),
              zl("没问题", "méi wèntí"),
            ],
          },
          {
            name: "Câu phức",
            questions: [
              zs("Mặc dù trời mưa, tôi vẫn đi chạy bộ.", "虽然下雨，我还是去跑步了。", "Suīrán xiàyǔ, wǒ háishi qù pǎobù le."),
              zs("Anh ấy vừa ăn cơm xong thì điện thoại reo.", "他刚吃完饭，电话就响了。", "Tā gāng chī wán fàn, diànhuà jiù xiǎng le."),
              zs("Nếu bạn cố gắng, bạn sẽ thành công.", "如果你努力，你就会成功。", "Rúguǒ nǐ nǔlì, nǐ jiù huì chénggōng."),
              zs("Tôi không chỉ học tiếng Trung mà còn học tiếng Anh.", "我不仅学中文，还学英文。", "Wǒ bùjǐn xué Zhōngwén, hái xué Yīngwén."),
              zs("Càng luyện tập nhiều, bạn càng tiến bộ nhanh.", "练习得越多，进步得越快。", "Liànxí de yuè duō, jìnbù de yuè kuài."),
              zs("Đây là cuốn sách mà giáo viên giới thiệu cho tôi.", "这是老师给我推荐的书。", "Zhè shì lǎoshī gěi wǒ tuījiàn de shū."),
              zs("Tôi đã quen với cuộc sống ở đây rồi.", "我已经习惯这里的生活了。", "Wǒ yǐjīng xíguàn zhèlǐ de shēnghuó le."),
              zs("Anh ấy nhất định sẽ đến đúng giờ.", "他一定会准时到。", "Tā yídìng huì zhǔnshí dào."),
            ],
          },
        ],
      },
    ],
  };

  /* ------------------------------------------------------------
     Thêm pack mới tại đây, ví dụ:

     const JA = {
       id: "ja", flag: "🇯🇵", name: "日本語",
       targetLabel: "tiếng Nhật", sourceLabel: "tiếng Việt",
       voice: "ja-JP",
       levels: [{ id: "basic", name: "Cơ bản", desc: "…", time: 20,
                  stages: [{ name: "Chào hỏi", questions: [ w("xin chào", ["こんにちは"]) ] }] }],
     };
     rồi thêm JA vào mảng packs bên dưới.
     Khi có từ 2 pack trở lên, ô chọn ngôn ngữ sẽ tự hiện ra.
     ------------------------------------------------------------ */

  return { packs: [EN, ZH] };
})();
