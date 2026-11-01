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

  return { packs: [EN] };
})();
