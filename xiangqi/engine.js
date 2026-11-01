/* ============================================================
   Engine cờ tướng — luật đầy đủ + AI minimax alpha-beta
   ------------------------------------------------------------
   Bàn cờ 9 cột × 10 hàng, ô 0 = góc trên trái … 89 = góc dưới phải.
   Quân Đỏ viết HOA (K A B N R C P), quân Đen viết thường (k a b n r c p).
     K/k = Tướng, A/a = Sĩ, B/b = Tượng, N/n = Mã,
     R/r = Xe, C/c = Pháo, P/p = Tốt
   window.XiangqiEngine
   ============================================================ */
window.XiangqiEngine = (() => {
  "use strict";

  const RED = "r";
  const BLACK = "b";
  const MATE = 100000;

  const START_ROWS = [
    "rnbakabnr",
    ".........",
    ".c.....c.",
    "p.p.p.p.p",
    ".........",
    ".........",
    "P.P.P.P.P",
    ".C.....C.",
    ".........",
    "RNBAKABNR",
  ];

  const ORTHO = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const HORSE = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1],
  ];

  const VALUE = { K: 6000, R: 900, C: 450, N: 400, B: 200, A: 200, P: 100 };

  const other = (color) => (color === RED ? BLACK : RED);
  const colorOf = (p) => (p === p.toUpperCase() ? RED : BLACK);
  const typeOf = (p) => p.toUpperCase();

  function inPalace(color, r, c) {
    if (c < 3 || c > 5) return false;
    return color === RED ? r >= 7 && r <= 9 : r >= 0 && r <= 2;
  }

  function onOwnSide(color, row) {
    return color === RED ? row >= 5 : row <= 4;
  }

  function crossedRiver(color, row) {
    return color === RED ? row <= 4 : row >= 5;
  }

  /* ---------- Khởi tạo / sao chép ---------- */

  function fromRows(rows) {
    const board = new Array(90).fill(null);
    const kings = { r: -1, b: -1 };
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const ch = rows[r][c];
        if (ch === ".") continue;
        const idx = r * 9 + c;
        board[idx] = ch;
        if (ch === "K") kings.r = idx;
        else if (ch === "k") kings.b = idx;
      }
    }
    return { board, kings, turn: RED, halfmove: 0 };
  }

  function startState() {
    return fromRows(START_ROWS);
  }

  function clone(st) {
    return {
      board: st.board.slice(),
      kings: { r: st.kings.r, b: st.kings.b },
      turn: st.turn,
      halfmove: st.halfmove,
    };
  }

  function toRows(st) {
    const rows = [];
    for (let r = 0; r < 10; r++) {
      let row = "";
      for (let c = 0; c < 9; c++) row += st.board[r * 9 + c] || ".";
      rows.push(row);
    }
    return rows;
  }

  /* ---------- Sinh nước đi ---------- */

  function genPseudo(st, color) {
    const b = st.board;
    const moves = [];

    const add = (from, to) => {
      const t = b[to];
      if (t && colorOf(t) === color) return;
      moves.push({ from, to, capture: Boolean(t) });
    };

    for (let sq = 0; sq < 90; sq++) {
      const p = b[sq];
      if (!p || colorOf(p) !== color) continue;

      const type = typeOf(p);
      const r = (sq / 9) | 0;
      const c = sq % 9;

      if (type === "K") {
        for (const [dr, dc] of ORTHO) {
          const nr = r + dr;
          const nc = c + dc;
          if (!inPalace(color, nr, nc)) continue;
          add(sq, nr * 9 + nc);
        }
      } else if (type === "A") {
        for (const [dr, dc] of DIAG) {
          const nr = r + dr;
          const nc = c + dc;
          if (!inPalace(color, nr, nc)) continue;
          add(sq, nr * 9 + nc);
        }
      } else if (type === "B") {
        for (const [dr, dc] of DIAG) {
          const nr = r + 2 * dr;
          const nc = c + 2 * dc;
          if (nr < 0 || nr > 9 || nc < 0 || nc > 8) continue;
          if (!onOwnSide(color, nr)) continue; // tượng không qua sông
          if (b[(r + dr) * 9 + (c + dc)]) continue; // bị chặn mắt tượng
          add(sq, nr * 9 + nc);
        }
      } else if (type === "N") {
        for (const [dr, dc] of HORSE) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr < 0 || nr > 9 || nc < 0 || nc > 8) continue;
          const legR = r + (Math.abs(dr) === 2 ? dr / 2 : 0);
          const legC = c + (Math.abs(dc) === 2 ? dc / 2 : 0);
          if (b[legR * 9 + legC]) continue; // chân mã bị chặn
          add(sq, nr * 9 + nc);
        }
      } else if (type === "R") {
        for (const [dr, dc] of ORTHO) {
          let nr = r + dr;
          let nc = c + dc;
          while (nr >= 0 && nr <= 9 && nc >= 0 && nc <= 8) {
            const to = nr * 9 + nc;
            const t = b[to];
            if (!t) moves.push({ from: sq, to, capture: false });
            else {
              if (colorOf(t) !== color) moves.push({ from: sq, to, capture: true });
              break;
            }
            nr += dr;
            nc += dc;
          }
        }
      } else if (type === "C") {
        for (const [dr, dc] of ORTHO) {
          let nr = r + dr;
          let nc = c + dc;
          let screen = false;
          while (nr >= 0 && nr <= 9 && nc >= 0 && nc <= 8) {
            const to = nr * 9 + nc;
            const t = b[to];
            if (!screen) {
              if (!t) moves.push({ from: sq, to, capture: false });
              else screen = true; // quân đầu tiên làm ngòi
            } else if (t) {
              if (colorOf(t) !== color) moves.push({ from: sq, to, capture: true });
              break;
            }
            nr += dr;
            nc += dc;
          }
        }
      } else if (type === "P") {
        const forward = color === RED ? -1 : 1;
        const nr = r + forward;
        if (nr >= 0 && nr <= 9) add(sq, nr * 9 + c);
        if (crossedRiver(color, r)) {
          for (const dc of [-1, 1]) {
            const nc = c + dc;
            if (nc < 0 || nc > 8) continue;
            add(sq, r * 9 + nc);
          }
        }
      }
    }

    return moves;
  }

  /* ---------- Tấn công / chiếu ---------- */

  function isAttacked(st, sq, by) {
    if (sq < 0) return false;
    const b = st.board;
    const r = (sq / 9) | 0;
    const c = sq % 9;

    // Tốt: đi thẳng tới sq
    const pawnRow = r + (by === RED ? 1 : -1);
    if (pawnRow >= 0 && pawnRow <= 9) {
      const p = b[pawnRow * 9 + c];
      if (p && p === (by === RED ? "P" : "p")) return true;
    }
    // Tốt đã qua sông đánh ngang
    if (crossedRiver(by, r)) {
      for (const dc of [-1, 1]) {
        const nc = c + dc;
        if (nc < 0 || nc > 8) continue;
        const p = b[r * 9 + nc];
        if (p && p === (by === RED ? "P" : "p")) return true;
      }
    }

    // Mã
    for (const [dr, dc] of HORSE) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr > 9 || nc < 0 || nc > 8) continue;
      const p = b[nr * 9 + nc];
      if (!p || colorOf(p) !== by || typeOf(p) !== "N") continue;
      const legR = nr - (Math.abs(dr) === 2 ? dr / 2 : 0);
      const legC = nc - (Math.abs(dc) === 2 ? dc / 2 : 0);
      if (!b[legR * 9 + legC]) return true;
    }

    // Tượng
    for (const [dr, dc] of DIAG) {
      const nr = r + 2 * dr;
      const nc = c + 2 * dc;
      if (nr < 0 || nr > 9 || nc < 0 || nc > 8) continue;
      const p = b[nr * 9 + nc];
      if (!p || colorOf(p) !== by || typeOf(p) !== "B") continue;
      if (!onOwnSide(by, r) || !onOwnSide(by, nr)) continue;
      if (b[(r + dr) * 9 + (c + dc)]) continue;
      return true;
    }

    // Sĩ
    for (const [dr, dc] of DIAG) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr > 9 || nc < 0 || nc > 8) continue;
      const p = b[nr * 9 + nc];
      if (!p || colorOf(p) !== by || typeOf(p) !== "A") continue;
      if (inPalace(by, r, c) && inPalace(by, nr, nc)) return true;
    }

    // Xe / Pháo / Tướng (theo hàng & cột)
    for (const [dr, dc] of ORTHO) {
      let nr = r + dr;
      let nc = c + dc;
      let first = null;
      let dist = 1;

      while (nr >= 0 && nr <= 9 && nc >= 0 && nc <= 8) {
        const p = b[nr * 9 + nc];
        if (p) {
          first = p;
          break;
        }
        nr += dr;
        nc += dc;
        dist++;
      }
      if (!first) continue;

      if (colorOf(first) === by) {
        const t = typeOf(first);
        if (t === "R") return true;
        if (t === "K" && dist === 1) return true;
      }

      // Tìm quân thứ hai (ngòi) — nếu là pháo thì đang bị chiếu
      nr += dr;
      nc += dc;
      while (nr >= 0 && nr <= 9 && nc >= 0 && nc <= 8) {
        const p = b[nr * 9 + nc];
        if (p) {
          if (colorOf(p) === by && typeOf(p) === "C") return true;
          break;
        }
        nr += dr;
        nc += dc;
      }
    }

    return false;
  }

  /** Hai tướng lộ mặt (không có quân chắn) → thế cờ không hợp lệ */
  function kingsFacing(st) {
    const rk = st.kings.r;
    const bk = st.kings.b;
    if (rk < 0 || bk < 0) return false;
    if (rk % 9 !== bk % 9) return false;
    const c = rk % 9;
    const r1 = Math.min((rk / 9) | 0, (bk / 9) | 0);
    const r2 = Math.max((rk / 9) | 0, (bk / 9) | 0);
    for (let r = r1 + 1; r < r2; r++) if (st.board[r * 9 + c]) return false;
    return true;
  }

  function inCheck(st, color) {
    return isAttacked(st, st.kings[color], other(color));
  }

  /* ---------- Đi / lùi nước ---------- */

  function makeMove(st, m) {
    const b = st.board;
    const piece = b[m.from];
    const captured = b[m.to];

    b[m.to] = piece;
    b[m.from] = null;

    if (piece === "K") st.kings.r = m.to;
    else if (piece === "k") st.kings.b = m.to;

    st.halfmove = captured ? 0 : st.halfmove + 1;
    st.turn = other(st.turn);

    return { move: m, captured };
  }

  function undoMove(st, undo) {
    const b = st.board;
    const m = undo.move;
    const piece = b[m.to];

    b[m.from] = piece;
    b[m.to] = undo.captured;

    if (piece === "K") st.kings.r = m.from;
    else if (piece === "k") st.kings.b = m.from;

    st.halfmove = Math.max(0, st.halfmove - 1);
    st.turn = other(st.turn);
  }

  function genLegalMoves(st, color = st.turn) {
    const b = st.board;
    const out = [];

    for (const m of genPseudo(st, color)) {
      const piece = b[m.from];
      const captured = b[m.to];

      b[m.to] = piece;
      b[m.from] = null;

      const oldKing = st.kings[color];
      if (piece === "K") st.kings.r = m.to;
      else if (piece === "k") st.kings.b = m.to;

      const bad =
        isAttacked(st, st.kings[color], other(color)) || kingsFacing(st);

      st.kings[color] = oldKing;
      b[m.from] = piece;
      b[m.to] = captured;

      if (!bad) out.push(m);
    }

    return out;
  }

  /* ---------- Trạng thái ván ---------- */

  function getStatus(st) {
    if (st.kings.r < 0 || st.kings.b < 0) {
      return {
        over: true,
        result: "checkmate",
        winner: st.kings.r < 0 ? BLACK : RED,
        check: true,
      };
    }

    const moves = genLegalMoves(st, st.turn);
    const check = inCheck(st, st.turn);

    if (!moves.length) {
      // Trong cờ tướng, hết nước đi (kể cả không bị chiếu) đều là thua
      return {
        over: true,
        result: check ? "checkmate" : "stalemate",
        winner: other(st.turn),
        check,
      };
    }

    return { over: false, result: null, winner: null, check, moves };
  }

  /* ---------- Đánh giá ---------- */

  function evaluateRed(st) {
    let score = 0;
    const b = st.board;

    for (let i = 0; i < 90; i++) {
      const p = b[i];
      if (!p) continue;

      const red = p === p.toUpperCase();
      const type = p.toUpperCase();
      const r = (i / 9) | 0;
      const c = i % 9;

      let v = VALUE[type];

      if (type === "P") {
        // càng tiến sâu càng mạnh, qua sông được cộng thêm
        v += red ? (6 - r) * 8 : (r - 3) * 8;
        if (crossedRiver(red ? RED : BLACK, r)) v += 30;
        if (c >= 3 && c <= 5) v += 8;
      } else if (type === "N" || type === "C") {
        v += (4 - Math.abs(c - 4)) * 4;
        v += red ? Math.max(0, 5 - r) * 3 : Math.max(0, r - 4) * 3;
      } else if (type === "R") {
        v += (4 - Math.abs(c - 4)) * 6;
      }

      score += red ? v : -v;
    }

    return score;
  }

  function evalSide(st) {
    if (st.kings.r < 0) return -MATE;
    if (st.kings.b < 0) return MATE;
    const red = evaluateRed(st);
    return st.turn === RED ? red : -red;
  }

  /* ---------- AI ---------- */

  let nodes = 0;
  let nodeLimit = 200000;

  function orderMoves(st, moves) {
    const b = st.board;
    return moves
      .map((m) => {
        const victim = b[m.to];
        const attacker = b[m.from];
        let s = 0;
        if (victim) {
          s = 10 * VALUE[typeOf(victim)] - VALUE[typeOf(attacker)];
        }
        return { m, s };
      })
      .sort((a, b2) => b2.s - a.s)
      .map((x) => x.m);
  }

  function negamax(st, depth, alpha, beta, ply) {
    if (++nodes > nodeLimit) return evalSide(st);
    if (depth <= 0) return evalSide(st);

    const moves = genLegalMoves(st);
    if (!moves.length) {
      // Hết nước đi = thua, dù đang bị chiếu hay không
      return -MATE + ply * 10;
    }

    let best = -Infinity;
    for (const m of orderMoves(st, moves)) {
      const u = makeMove(st, m);
      const score = -negamax(st, depth - 1, -beta, -alpha, ply + 1);
      undoMove(st, u);

      if (score > best) best = score;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }

  function findBestMove(st, difficulty = "normal") {
    const depth = difficulty === "hard" ? 3 : difficulty === "easy" ? 1 : 2;
    const rootMoves = genLegalMoves(st);
    if (!rootMoves.length) return null;

    nodes = 0;
    nodeLimit = difficulty === "hard" ? 260000 : 120000;

    const ordered = orderMoves(st, rootMoves);
    const scored = [];
    let alpha = -Infinity;

    for (const m of ordered) {
      const u = makeMove(st, m);
      let score;
      if (difficulty === "easy") {
        score = -evalSide(st) + Math.random() * 60;
      } else {
        score = -negamax(st, depth - 1, -Infinity, -alpha, 1);
        if (nodes > nodeLimit) score = -evalSide(st);
      }
      undoMove(st, u);
      scored.push({ m, score });
      if (score > alpha) alpha = score;
    }

    scored.sort((a, b) => b.score - a.score);
    if (difficulty === "easy") {
      const top = scored.filter((x) => x.score >= scored[0].score - 100);
      return top[Math.floor(Math.random() * top.length)].m;
    }
    return scored[0].m;
  }

  /* ---------- Kiểm thử (perft) ---------- */

  function perft(st, depth) {
    if (depth === 0) return 1;
    const moves = genLegalMoves(st);
    let total = 0;
    for (const m of moves) {
      const u = makeMove(st, m);
      total += perft(st, depth - 1);
      undoMove(st, u);
    }
    return total;
  }

  return {
    RED,
    BLACK,
    MATE,
    startState,
    fromRows,
    clone,
    toRows,
    makeMove,
    undoMove,
    genPseudo,
    genLegalMoves,
    isAttacked,
    inCheck,
    kingsFacing,
    getStatus,
    evaluateRed,
    findBestMove,
    perft,
    other,
    colorOf,
    typeOf,
    VALUE,
  };
})();
