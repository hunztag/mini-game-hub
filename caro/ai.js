/* ============================================================
   AI cờ caro (gomoku) — chấm điểm theo mẫu hình, không cần thư viện
   ------------------------------------------------------------
   window.CaroAI.pickMove(board, size, player, difficulty)
     board      : mảng phẳng size*size, 0 = trống, 1 = Đen, 2 = Trắng
     player     : quân của máy (1 hoặc 2)
     difficulty : "easy" | "normal" | "hard"
   trả về index (y * size + x) của ô máy sẽ đánh, hoặc -1 nếu hết ô
   ============================================================ */
window.CaroAI = (() => {
  "use strict";

  const WIN_SCORE = 1e7;
  const DIRS = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];

  // Bảng điểm theo (số quân liền, số đầu mở)
  function shapeScore(count, openEnds) {
    if (count >= 5) return WIN_SCORE;
    if (openEnds === 0) return 0;
    switch (count) {
      case 4:
        return openEnds === 2 ? 500000 : 12000;
      case 3:
        return openEnds === 2 ? 9000 : 800;
      case 2:
        return openEnds === 2 ? 800 : 90;
      default:
        return openEnds === 2 ? 45 : 8;
    }
  }

  /** Điểm của một nước đi tại (x, y) nếu `player` đặt quân ở đó */
  function pointScore(board, size, x, y, player) {
    let total = 0;
    let threats = 0;

    for (const [dx, dy] of DIRS) {
      let count = 1;
      let openEnds = 0;

      // Hai hướng dọc theo trục
      for (const sign of [1, -1]) {
        let step = 1;
        for (;;) {
          const nx = x + dx * step * sign;
          const ny = y + dy * step * sign;
          if (nx < 0 || nx >= size || ny < 0 || ny >= size) break;
          const v = board[ny * size + nx];
          if (v === player) {
            count++;
            step++;
            continue;
          }
          if (v === 0) openEnds++;
          break;
        }
      }

      const s = shapeScore(count, openEnds);
      if (s >= 12000) threats++;
      total += s;
    }

    // Ưu tiên gần trung tâm ở giai đoạn đầu
    const cx = (size - 1) / 2;
    const cy = (size - 1) / 2;
    const dist = Math.abs(x - cx) + Math.abs(y - cy);
    total += Math.max(0, size - dist) * 2;

    // Hai "mối đe doạ" cùng lúc (ví dụ 2 hàng 3 mở) gần như không đỡ được
    if (threats >= 2) total += 40000;

    return total;
  }

  /** Các ô trống trong bán kính 2 quanh quân đã có */
  function candidates(board, size) {
    const out = [];
    let hasStone = false;
    const seen = new Uint8Array(size * size);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (board[y * size + x] === 0) continue;
        hasStone = true;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || nx >= size || ny < 0 || ny >= size) continue;
            const i = ny * size + nx;
            if (board[i] !== 0 || seen[i]) continue;
            seen[i] = 1;
            out.push(i);
          }
        }
      }
    }

    if (!hasStone) {
      const mid = Math.floor(size / 2);
      return [mid * size + mid];
    }
    return out;
  }

  /** Điểm phòng thủ tốt nhất của đối thủ sau khi ta đánh vào `move` */
  function opponentBest(board, size, move, me, opp) {
    board[move] = me;
    let best = 0;
    for (const i of candidates(board, size)) {
      const x = i % size;
      const y = (i / size) | 0;
      const s = pointScore(board, size, x, y, opp);
      if (s > best) best = s;
    }
    board[move] = 0;
    return best;
  }

  function rankedMoves(board, size, me, opp) {
    const list = [];
    for (const i of candidates(board, size)) {
      const x = i % size;
      const y = (i / size) | 0;
      const attack = pointScore(board, size, x, y, me);
      const defend = pointScore(board, size, x, y, opp);
      list.push({ i, attack, defend, value: attack + defend * 0.85 });
    }
    list.sort((a, b) => b.value - a.value);
    return list;
  }

  function pickMove(board, size, player, difficulty = "normal") {
    const me = player;
    const opp = player === 1 ? 2 : 1;
    const moves = rankedMoves(board, size, me, opp);
    if (!moves.length) return -1;

    // 1) Thắng ngay nếu có
    const winNow = moves.find((m) => m.attack >= WIN_SCORE);
    if (winNow) return winNow.i;

    // 2) Chặn đối thủ sắp thắng
    const mustBlock = moves.find((m) => m.defend >= WIN_SCORE);
    if (mustBlock) return mustBlock.i;

    if (difficulty === "easy") {
      // Chọn ngẫu nhiên trong nhóm khá tốt -> dễ bị bắt lỗi
      const pool = moves.slice(0, Math.min(6, moves.length));
      return pool[Math.floor(Math.random() * pool.length)].i;
    }

    if (difficulty === "normal") {
      const pool = moves.slice(0, Math.min(3, moves.length));
      return pool[Math.floor(Math.random() * pool.length)].i;
    }

    // 3) Hard: xem trước 2 nước, tránh nước tạo cơ hội cho đối thủ
    const top = moves.slice(0, Math.min(6, moves.length));
    let bestMove = top[0].i;
    let bestScore = -Infinity;

    for (const m of top) {
      const reply = opponentBest(board, size, m.i, me, opp);
      // tự tin khi tạo được đe doạ kép, thận trọng khi để đối thủ mạnh lên
      const score = m.value - reply * 0.75;
      if (score > bestScore) {
        bestScore = score;
        bestMove = m.i;
      }
    }
    return bestMove;
  }

  return { pickMove, pointScore, WIN_SCORE };
})();
