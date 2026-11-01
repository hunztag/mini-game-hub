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
