/* ============================================================
   Engine cờ vua — luật đầy đủ (nhập thành, phong cấp, en passant)
   + AI minimax alpha-beta.
   ------------------------------------------------------------
   Bàn cờ: Array(64), ô 0 = a8 … 63 = h1.
   Quân:  "P N B R Q K" = Trắng, "p n b r q k" = Đen.
   window.ChessEngine
   ============================================================ */
window.ChessEngine = (() => {
  "use strict";

  const WHITE = "w";
  const BLACK = "b";
  const MATE = 100000;

  const START_FEN =
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

  const FILES = "abcdefgh";

  const KNIGHT_DELTAS = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1],
  ];
  const BISHOP_DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const ROOK_DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const KING_DIRS = [
    [-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1],
  ];

  const PIECE_VALUE = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };

  /* Bảng điểm vị trí (nhìn từ phía Trắng, hàng 0 = hạng 8) */
  const PST = {
    P: [
      0, 0, 0, 0, 0, 0, 0, 0,
      50, 50, 50, 50, 50, 50, 50, 50,
      10, 10, 20, 30, 30, 20, 10, 10,
      5, 5, 10, 25, 25, 10, 5, 5,
      0, 0, 0, 20, 20, 0, 0, 0,
      5, -5, -10, 0, 0, -10, -5, 5,
      5, 10, 10, -20, -20, 10, 10, 5,
      0, 0, 0, 0, 0, 0, 0, 0,
    ],
    N: [
      -50, -40, -30, -30, -30, -30, -40, -50,
      -40, -20, 0, 0, 0, 0, -20, -40,
      -30, 0, 10, 15, 15, 10, 0, -30,
      -30, 5, 15, 20, 20, 15, 5, -30,
      -30, 0, 15, 20, 20, 15, 0, -30,
      -30, 5, 10, 15, 15, 10, 5, -30,
      -40, -20, 0, 5, 5, 0, -20, -40,
      -50, -40, -30, -30, -30, -30, -40, -50,
    ],
    B: [
      -20, -10, -10, -10, -10, -10, -10, -20,
      -10, 0, 0, 0, 0, 0, 0, -10,
      -10, 0, 5, 10, 10, 5, 0, -10,
      -10, 5, 5, 10, 10, 5, 5, -10,
      -10, 0, 10, 10, 10, 10, 0, -10,
      -10, 10, 10, 10, 10, 10, 10, -10,
      -10, 5, 0, 0, 0, 0, 5, -10,
      -20, -10, -10, -10, -10, -10, -10, -20,
    ],
    R: [
      0, 0, 0, 0, 0, 0, 0, 0,
      5, 10, 10, 10, 10, 10, 10, 5,
      -5, 0, 0, 0, 0, 0, 0, -5,
      -5, 0, 0, 0, 0, 0, 0, -5,
      -5, 0, 0, 0, 0, 0, 0, -5,
      -5, 0, 0, 0, 0, 0, 0, -5,
      -5, 0, 0, 0, 0, 0, 0, -5,
      0, 0, 0, 5, 5, 0, 0, 0,
    ],
    Q: [
      -20, -10, -10, -5, -5, -10, -10, -20,
      -10, 0, 0, 0, 0, 0, 0, -10,
      -10, 0, 5, 5, 5, 5, 0, -10,
      -5, 0, 5, 5, 5, 5, 0, -5,
      0, 0, 5, 5, 5, 5, 0, -5,
      -10, 5, 5, 5, 5, 5, 0, -10,
      -10, 0, 5, 0, 0, 0, 0, -10,
      -20, -10, -10, -5, -5, -10, -10, -20,
    ],
    K: [
      -30, -40, -40, -50, -50, -40, -40, -30,
      -30, -40, -40, -50, -50, -40, -40, -30,
      -30, -40, -40, -50, -50, -40, -40, -30,
      -30, -40, -40, -50, -50, -40, -40, -30,
      -20, -30, -30, -40, -40, -30, -30, -20,
      -10, -20, -20, -20, -20, -20, -20, -10,
      20, 20, 0, 0, 0, 0, 20, 20,
      20, 30, 10, 0, 0, 10, 30, 20,
    ],
  };

  const MIRROR = new Array(64);
  for (let i = 0; i < 64; i++) {
    const r = (i / 8) | 0;
    const c = i & 7;
    MIRROR[i] = (7 - r) * 8 + c;
  }

  const other = (color) => (color === WHITE ? BLACK : WHITE);
  const squareName = (i) => FILES[i & 7] + (8 - ((i / 8) | 0));
  const squareIndex = (name) => (8 - Number(name[1])) * 8 + FILES.indexOf(name[0]);

  /* ---------- Khởi tạo / sao chép ---------- */

  function fromFen(fen) {
    const parts = String(fen).trim().split(/\s+/);
    const board = new Array(64).fill(null);
    const kings = { w: -1, b: -1 };
    let r = 0;
    let c = 0;

    for (const ch of parts[0]) {
      if (ch === "/") {
        r++;
        c = 0;
      } else if (ch >= "1" && ch <= "8") {
        c += Number(ch);
      } else {
        const idx = r * 8 + c;
        const type = ch.toUpperCase();
        board[idx] = (ch === type ? WHITE : BLACK) + type;
        if (type === "K") {
          if (ch === type) kings.w = idx;
          else kings.b = idx;
        }
        c++;
      }
    }

    const castling = { wK: false, wQ: false, bK: false, bQ: false };
    const castlePart = parts[2] || "-";
    if (castlePart.includes("K")) castling.wK = true;
    if (castlePart.includes("Q")) castling.wQ = true;
    if (castlePart.includes("k")) castling.bK = true;
    if (castlePart.includes("q")) castling.bQ = true;

    let ep = null;
    if (parts[3] && parts[3] !== "-") ep = squareIndex(parts[3]);

    return {
      board,
      kings,
      turn: parts[1] === "b" ? BLACK : WHITE,
      castling,
      ep,
      halfmove: Number(parts[4]) || 0,
      fullmove: Number(parts[5]) || 1,
    };
  }

  function startState() {
    return fromFen(START_FEN);
  }

  function clone(st) {
    return {
      board: st.board.slice(),
      kings: { w: st.kings.w, b: st.kings.b },
      turn: st.turn,
      castling: { ...st.castling },
      ep: st.ep,
      halfmove: st.halfmove,
      fullmove: st.fullmove,
    };
  }

  function toFen(st) {
    let rows = [];
    for (let r = 0; r < 8; r++) {
      let row = "";
      let empty = 0;
      for (let c = 0; c < 8; c++) {
        const p = st.board[r * 8 + c];
        if (!p) empty++;
        else {
          if (empty) { row += empty; empty = 0; }
          row += p[0] === WHITE ? p[1] : p[1].toLowerCase();
        }
      }
      if (empty) row += empty;
      rows.push(row);
    }
    const castle =
      (st.castling.wK ? "K" : "") +
      (st.castling.wQ ? "Q" : "") +
      (st.castling.bK ? "k" : "") +
      (st.castling.bQ ? "q" : "") || "-";
    return [
      rows.join("/"),
      st.turn,
      castle,
      st.ep === null ? "-" : squareName(st.ep),
      st.halfmove,
      st.fullmove,
    ].join(" ");
  }

  /* ---------- Tấn công / chiếu ---------- */

  function isAttacked(st, sq, by) {
    const b = st.board;
    const r = (sq / 8) | 0;
    const c = sq & 7;

    // Tốt
    const pr = r + (by === WHITE ? 1 : -1);
    if (pr >= 0 && pr < 8) {
      for (const dc of [-1, 1]) {
        const pc = c + dc;
        if (pc < 0 || pc > 7) continue;
        const p = b[pr * 8 + pc];
        if (p && p[0] === by && p[1] === "P") return true;
      }
    }

    // Mã
    for (const [dr, dc] of KNIGHT_DELTAS) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr > 7 || nc < 0 || nc > 7) continue;
      const p = b[nr * 8 + nc];
      if (p && p[0] === by && p[1] === "N") return true;
    }

    // Vua
    for (const [dr, dc] of KING_DIRS) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr > 7 || nc < 0 || nc > 7) continue;
      const p = b[nr * 8 + nc];
      if (p && p[0] === by && p[1] === "K") return true;
    }

    // Xe / Hậu
    for (const [dr, dc] of ROOK_DIRS) {
      let nr = r + dr;
      let nc = c + dc;
      while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        const p = b[nr * 8 + nc];
        if (p) {
          if (p[0] === by && (p[1] === "R" || p[1] === "Q")) return true;
          break;
        }
        nr += dr;
        nc += dc;
      }
    }

    // Tượng / Hậu
    for (const [dr, dc] of BISHOP_DIRS) {
      let nr = r + dr;
      let nc = c + dc;
      while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        const p = b[nr * 8 + nc];
        if (p) {
          if (p[0] === by && (p[1] === "B" || p[1] === "Q")) return true;
          break;
        }
        nr += dr;
        nc += dc;
      }
    }

    return false;
  }

  function inCheck(st, color) {
    const k = color === WHITE ? st.kings.w : st.kings.b;
    return k >= 0 && isAttacked(st, k, other(color));
  }

  /* ---------- Sinh nước đi ---------- */

  /** Nước đi giả hợp lệ (chưa loại nước để vua bị chiếu) */
  function genMoves(st, color) {
    const b = st.board;
    const moves = [];
    const add = (from, to, promo) => {
      moves.push(promo ? { from, to, promo } : { from, to });
    };

    for (let sq = 0; sq < 64; sq++) {
      const p = b[sq];
      if (!p || p[0] !== color) continue;

      const type = p[1];
      const r = (sq / 8) | 0;
      const c = sq & 7;

      if (type === "P") {
        const dir = color === WHITE ? -1 : 1;
        const startRow = color === WHITE ? 6 : 1;
        const promoRow = color === WHITE ? 0 : 7;

        const nr = r + dir;
        if (nr >= 0 && nr < 8) {
          const one = nr * 8 + c;
          if (!b[one]) {
            if (nr === promoRow) for (const pr of "QRBN") add(sq, one, pr);
            else {
              add(sq, one);
              const two = (r + dir * 2) * 8 + c;
              if (r === startRow && !b[two]) add(sq, two);
            }
          }

          for (const dc of [-1, 1]) {
            const nc = c + dc;
            if (nc < 0 || nc > 7) continue;
            const to = nr * 8 + nc;
            const target = b[to];
            if (target && target[0] !== color) {
              if (nr === promoRow) for (const pr of "QRBN") add(sq, to, pr);
              else add(sq, to);
            } else if (!target && st.ep === to) {
              add(sq, to); // bắt tốt qua đường
            }
          }
        }
      } else if (type === "N") {
        for (const [dr, dc] of KNIGHT_DELTAS) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr < 0 || nr > 7 || nc < 0 || nc > 7) continue;
          const to = nr * 8 + nc;
          const t = b[to];
          if (!t || t[0] !== color) add(sq, to);
        }
      } else if (type === "B" || type === "R" || type === "Q") {
        const dirs =
          type === "B" ? BISHOP_DIRS : type === "R" ? ROOK_DIRS : KING_DIRS;
        for (const [dr, dc] of dirs) {
          let nr = r + dr;
          let nc = c + dc;
          while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            const to = nr * 8 + nc;
            const t = b[to];
            if (!t) add(sq, to);
            else {
              if (t[0] !== color) add(sq, to);
              break;
            }
            nr += dr;
            nc += dc;
          }
        }
      } else if (type === "K") {
        for (const [dr, dc] of KING_DIRS) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr < 0 || nr > 7 || nc < 0 || nc > 7) continue;
          const to = nr * 8 + nc;
          const t = b[to];
          if (!t || t[0] !== color) add(sq, to);
        }

        // Nhập thành
        const homeRow = color === WHITE ? 7 : 0;
        const home = homeRow * 8 + 4;
        const enemy = other(color);
        if (sq === home && !isAttacked(st, home, enemy)) {
          const rookK = homeRow * 8 + 7;
          const rookQ = homeRow * 8 + 0;
          const canK = color === WHITE ? st.castling.wK : st.castling.bK;
          const canQ = color === WHITE ? st.castling.wQ : st.castling.bQ;

          if (
            canK &&
            b[rookK] === color + "R" &&
            !b[home + 1] &&
            !b[home + 2] &&
            !isAttacked(st, home + 1, enemy) &&
            !isAttacked(st, home + 2, enemy)
          ) {
            add(home, home + 2);
          }
          if (
            canQ &&
            b[rookQ] === color + "R" &&
            !b[home - 1] &&
            !b[home - 2] &&
            !b[home - 3] &&
            !isAttacked(st, home - 1, enemy) &&
            !isAttacked(st, home - 2, enemy)
          ) {
            add(home, home - 2);
          }
        }
      }
    }

    return moves;
  }

  /* ---------- Đi / lùi nước ---------- */

  function makeMove(st, m) {
    const b = st.board;
    const piece = b[m.from];
    const color = piece[0];
    const type = piece[1];

    const undo = {
      move: m,
      captured: b[m.to],
      capturedSq: m.to,
      castling: { ...st.castling },
      ep: st.ep,
      halfmove: st.halfmove,
      fullmove: st.fullmove,
      rookFrom: -1,
    };

    b[m.from] = null;

    // Bắt tốt qua đường
    if (type === "P" && m.to === st.ep && !b[m.to]) {
      const capSq = m.to + (color === WHITE ? 8 : -8);
      undo.captured = b[capSq];
      undo.capturedSq = capSq;
      b[capSq] = null;
    }

    b[m.to] = m.promo ? color + m.promo : piece;

    // Di chuyển xe khi nhập thành
    if (type === "K" && Math.abs(m.to - m.from) === 2) {
      undo.rookFrom = m.to > m.from ? m.from + 3 : m.from - 4;
      const rookTo = m.to > m.from ? m.from + 1 : m.from - 1;
      b[rookTo] = b[undo.rookFrom];
      b[undo.rookFrom] = null;
      st.kings[color] = m.to;
    } else if (type === "K") {
      st.kings[color] = m.to;
    }

    // Quyền nhập thành
    const cr = st.castling;
    if (type === "K") {
      if (color === WHITE) { cr.wK = false; cr.wQ = false; }
      else { cr.bK = false; cr.bQ = false; }
    }
    if (type === "R") {
      if (m.from === 63) cr.wK = false;
      else if (m.from === 56) cr.wQ = false;
      else if (m.from === 7) cr.bK = false;
      else if (m.from === 0) cr.bQ = false;
    }
    if (undo.captured && undo.captured[1] === "R") {
      if (undo.capturedSq === 63) cr.wK = false;
      else if (undo.capturedSq === 56) cr.wQ = false;
      else if (undo.capturedSq === 7) cr.bK = false;
      else if (undo.capturedSq === 0) cr.bQ = false;
    }

    st.ep =
      type === "P" && Math.abs(m.to - m.from) === 16
        ? (m.from + m.to) / 2
        : null;

    st.halfmove = type === "P" || undo.captured ? 0 : st.halfmove + 1;
    if (color === BLACK) st.fullmove++;
    st.turn = other(color);

    return undo;
  }

  function undoMove(st, undo) {
    const b = st.board;
    const m = undo.move;
    const piece = b[m.to];
    const color = piece[0];

    b[m.to] = null;
    b[m.from] = m.promo ? color + "P" : piece;

    if (undo.rookFrom >= 0) {
      const rookTo = m.to > m.from ? m.from + 1 : m.from - 1;
      b[undo.rookFrom] = b[rookTo];
      b[rookTo] = null;
    }

    if (undo.captured) b[undo.capturedSq] = undo.captured;

    if (piece[1] === "K") st.kings[color] = m.from;

    st.castling = undo.castling;
    st.ep = undo.ep;
    st.halfmove = undo.halfmove;
    st.fullmove = undo.fullmove;
    st.turn = color;
  }

  /** Nước đi hợp lệ: không để vua mình bị chiếu */
  function genLegalMoves(st, color = st.turn) {
    const out = [];
    for (const m of genMoves(st, color)) {
      const u = makeMove(st, m);
      const kingSq = color === WHITE ? st.kings.w : st.kings.b;
      const bad = kingSq < 0 || isAttacked(st, kingSq, other(color));
      undoMove(st, u);
      if (!bad) out.push(m);
    }
    return out;
  }

  /* ---------- Trạng thái ván ---------- */

  function insufficientMaterial(st) {
    let minor = 0;
    for (const p of st.board) {
      if (!p) continue;
      const t = p[1];
      if (t === "P" || t === "R" || t === "Q") return false;
      if (t !== "K") minor++;
    }
    return minor <= 1;
  }

  function getStatus(st) {
    if (st.kings.w < 0 || st.kings.b < 0) {
      return {
        over: true,
        result: "checkmate",
        winner: st.kings.w < 0 ? BLACK : WHITE,
        check: true,
      };
    }

    const moves = genLegalMoves(st, st.turn);
    const check = inCheck(st, st.turn);

    if (!moves.length) {
      return {
        over: true,
        result: check ? "checkmate" : "stalemate",
        winner: check ? other(st.turn) : null,
        check,
      };
    }
    if (st.halfmove >= 100 || insufficientMaterial(st)) {
      return { over: true, result: "draw", winner: null, check };
    }
    return { over: false, result: null, winner: null, check, moves };
  }

  /* ---------- Đánh giá ---------- */

  function evaluateWhite(st) {
    let score = 0;
    const b = st.board;
    for (let i = 0; i < 64; i++) {
      const p = b[i];
      if (!p) continue;
      const t = p[1];
      if (p[0] === WHITE) score += PIECE_VALUE[t] + PST[t][i];
      else score -= PIECE_VALUE[t] + PST[t][MIRROR[i]];
    }
    return score;
  }

  function evalSide(st) {
    if (st.kings.w < 0) return -MATE;
    if (st.kings.b < 0) return MATE;
    const white = evaluateWhite(st);
    return st.turn === WHITE ? white : -white;
  }

  /* ---------- AI ---------- */

  let nodes = 0;
  let nodeLimit = 300000;

  function orderMoves(st, moves) {
    const b = st.board;
    return moves
      .map((m) => {
        let s = 0;
        const victim = b[m.to] || (m.to === st.ep ? "P" : null);
        const attacker = b[m.from];
        if (victim) s += 10 * (PIECE_VALUE[victim[1]] || 0) - (PIECE_VALUE[attacker[1]] || 0);
        if (m.promo) s += PIECE_VALUE[m.promo];
        return { m, s };
      })
      .sort((a, b2) => b2.s - a.s)
      .map((x) => x.m);
  }

  function negamax(st, depth, alpha, beta, ply) {
    if (++nodes > nodeLimit) return evalSide(st);

    if (depth <= 0) return evalSide(st);
    if (st.halfmove >= 100) return 0;

    const moves = genLegalMoves(st);
    if (!moves.length) {
      return inCheck(st, st.turn) ? -MATE + ply * 10 : 0;
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
    nodeLimit = difficulty === "hard" ? 400000 : 150000;

    const ordered = orderMoves(st, rootMoves);
    const scored = [];
    let alpha = -Infinity;

    for (const m of ordered) {
      const u = makeMove(st, m);
      let score;
      if (difficulty === "easy") {
        score = -evalSide(st) + Math.random() * 45;
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
      const top = scored.filter((x) => x.score >= scored[0].score - 80);
      return top[Math.floor(Math.random() * top.length)].m;
    }
    return scored[0].m;
  }

  /* ---------- Kiểm thử (perft) ---------- */

  function perft(st, depth) {
    if (depth === 0) return 1;
    const mover = st.turn;
    const moves = genMoves(st, mover);
    let total = 0;
    for (const m of moves) {
      const u = makeMove(st, m);
      const kingSq = mover === WHITE ? st.kings.w : st.kings.b;
      if (kingSq >= 0 && !isAttacked(st, kingSq, other(mover))) {
        total += perft(st, depth - 1);
      }
      undoMove(st, u);
    }
    return total;
  }

  return {
    WHITE,
    BLACK,
    MATE,
    fromFen,
    startState,
    clone,
    toFen,
    makeMove,
    undoMove,
    genMoves,
    genLegalMoves,
    isAttacked,
    inCheck,
    getStatus,
    evaluateWhite,
    findBestMove,
    perft,
    squareName,
    squareIndex,
    other,
    PIECE_VALUE,
  };
})();
