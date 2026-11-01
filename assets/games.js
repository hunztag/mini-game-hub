/* ============================================================
   DANH SÁCH GAME — chỉ cần thêm 1 object ở đây là hub tự cập nhật
   ------------------------------------------------------------
   href   : đường dẫn tới index.html của game (để "#" nếu chưa có)
   tags   : [{ text, color }] với color = "" | "green" | "pink"
   status : "ready" | "soon"
   ============================================================ */
window.GAMES = [
  {
    id: "snake",
    icon: "🐍",
    name: "Snake",
    desc: "Rắn săn mồi với 6 màn chơi, tường chắn, hiệu ứng neon và âm thanh tổng hợp.",
    href: "snake/index.html",
    status: "ready",
    tags: [
      { text: "1 người" },
      { text: "6 màn", color: "green" },
      { text: "Âm thanh", color: "pink" },
    ],
  },
  {
    id: "caro",
    icon: "⚫",
    name: "Cờ Caro",
    desc: "Gomoku 15×15, thắng khi có 5 quân liền nhau. Đấu với máy (3 độ khó), 2 người cùng máy, hoặc chơi online bằng mã phòng.",
    href: "caro/index.html",
    status: "ready",
    tags: [
      { text: "Đấu AI" },
      { text: "2 người", color: "green" },
      { text: "Online", color: "pink" },
    ],
  },
  {
    id: "chess",
    icon: "♟️",
    name: "Cờ Vua",
    desc: "Chess chuẩn quốc tế trên bàn 8×8: phong cấp, nhập thành, bắt tốt qua đường. Đấu máy 3 độ khó, 2 người cùng máy hoặc online bằng mã phòng.",
    href: "chess/index.html",
    status: "ready",
    tags: [
      { text: "Đấu AI" },
      { text: "2 người", color: "green" },
      { text: "Online", color: "pink" },
    ],
  },
  {
    id: "xiangqi",
    icon: "🏮",
    name: "Cờ Tướng",
    desc: "Cờ tướng trên bàn 9×10 với sông, cung và pháo. Chiếu bí hoặc làm đối phương hết nước đi để thắng. Có đấu máy, 2 người và chơi online.",
    href: "xiangqi/index.html",
    status: "ready",
    tags: [
      { text: "Đấu AI" },
      { text: "2 người", color: "green" },
      { text: "Online", color: "pink" },
    ],
  },
  {
    id: "reflex",
    icon: "⚡",
    name: "Phản Xạ Ngoại Ngữ",
    desc: "📚 Học 336 từ/câu theo 12 chủ đề (🇬🇧 English & 🇨🇳 中文 + pinyin) rồi ⚡ luyện phản xạ: 3 cấp độ, 9 màn, nhiều kiểu câu hỏi. Gõ pinyin có dấu hay không dấu đều đúng.",
    href: "reflex/index.html",
    status: "ready",
    tags: [
      { text: "Học tập" },
      { text: "Anh · Trung", color: "green" },
      { text: "12 chủ đề", color: "green" },
      { text: "3 cấp độ", color: "green" },
      { text: "9 màn", color: "pink" },
    ],
  },
  {
    id: "2048",
    icon: "🔢",
    name: "2048",
    desc: "Trượt ô số để cộng dồn tới 2048.",
    href: "#",
    status: "soon",
    tags: [{ text: "Sắp ra mắt" }],
  },
  {
    id: "memory",
    icon: "🧠",
    name: "Memory",
    desc: "Lật thẻ tìm cặp hình giống nhau, tính giờ và số lượt mở.",
    href: "#",
    status: "soon",
    tags: [{ text: "Sắp ra mắt" }],
  },
];
