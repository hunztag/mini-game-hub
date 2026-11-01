/**
 * Server cho Mini Game Hub: vừa phục vụ file web tĩnh, vừa làm relay
 * WebSocket cho cờ caro online (tối giản, không lưu dữ liệu).
 *
 * - Web tĩnh : http://localhost:8080/           (thư mục cha của /server)
 * - WebSocket: ws://localhost:8080/ws
 *
 * Chạy local:
 *   cd server && npm install && npm start
 *
 * Deploy (Render / Railway / Fly.io): chỉ cần chạy `npm start` trong thư mục
 * server, HTTPS/WSS do nền tảng tự cấp. Nhờ vậy web và game online chung
 * một domain, client mặc định kết nối wss://<host>/ws.
 *
 * Giao thức: xem comment đầu file web-game/caro/net.js
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 8080;
const WEB_ROOT = path.resolve(__dirname, "..");

// Không bao giờ phục vụ mã nguồn server / phụ thuộc qua HTTP tĩnh
const BLOCKED_DIRS = [path.join(WEB_ROOT, "server")];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

/** Chặn path traversal: chỉ cho phép đọc trong WEB_ROOT */
function resolveSafe(urlPath) {
  let clean;
  try {
    clean = decodeURIComponent(urlPath.split("?")[0].split("#")[0]).replace(/\\/g, "/");
  } catch {
    return null; // URL hỏng (ví dụ "%zz")
  }

  // File ẩn (.git, .env, .gitignore...) và thư mục server → không phục vụ
  const parts = clean.split("/").filter(Boolean);
  if (parts.some((p) => p.startsWith("."))) return null;

  const target = path.resolve(WEB_ROOT, "." + clean);
  if (target !== WEB_ROOT && !target.startsWith(WEB_ROOT + path.sep)) return null;
  for (const dir of BLOCKED_DIRS) {
    if (target === dir || target.startsWith(dir + path.sep)) return null;
  }
  return target;
}

function serveStatic(req, res) {
  const filePath = resolveSafe(req.url === "/" ? "/index.html" : req.url);
  if (!filePath) {
    res.writeHead(403, { "Content-Type": MIME[".txt"] });
    res.end("403 Forbidden");
    return;
  }
  sendFile(filePath, res, true);
}

/** Gửi file; nếu là thư mục thì thử index.html bên trong (1 lần) */
function sendFile(filePath, res, allowDir) {
  fs.stat(filePath, (err, stat) => {
    if (err) {
      res.writeHead(404, { "Content-Type": MIME[".txt"] });
      res.end("404 Not Found");
      return;
    }

    if (stat.isDirectory()) {
      if (!allowDir) {
        res.writeHead(404, { "Content-Type": MIME[".txt"] });
        res.end("404 Not Found");
        return;
      }
      sendFile(path.join(filePath, "index.html"), res, false);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    // Mã nguồn/HTML để no-cache: sửa file là thấy ngay, không phải xoá cache trình duyệt
    const noCache = [".html", ".js", ".css", ".json", ".md"];
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Content-Length": stat.size,
      "Cache-Control": noCache.includes(ext) ? "no-cache" : "public, max-age=3600",
    });

    const stream = fs.createReadStream(filePath);
    stream.on("error", () => res.destroy());
    stream.pipe(res);
  });
}

/** room code -> { players: [ws, ws], host: ws } */
const rooms = new Map();

// ---- HTTP: file tĩnh + health-check ----
const server = http.createServer((req, res) => {
  if (req.url === "/healthz") {
    res.writeHead(200, { "Content-Type": MIME[".json"] });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size }));
    return;
  }
  serveStatic(req, res);
});

const wss = new WebSocketServer({ server, path: "/ws" });

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

// Giới hạn thời gian mỗi lượt được phép (0 = không giới hạn)
const TURN_TIMES = [0, 30, 60, 120];

function normalizeTurnTime(value) {
  const n = Number(value);
  return TURN_TIMES.includes(n) ? n : 0;
}

function makeCode() {
  let code = "";
  do {
    code = "";
    for (let i = 0; i < 5; i++) {
      code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    }
  } while (rooms.has(code));
  return code;
}

function send(ws, payload) {
  if (ws && ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcast(room, payload, except) {
  for (const ws of room.players) {
    if (ws !== except) send(ws, payload);
  }
}

function leaveRoom(ws) {
  const code = ws._room;
  if (!code) return;
  const room = rooms.get(code);
  ws._room = null;
  if (!room) return;

  room.players = room.players.filter((p) => p !== ws);
  broadcast(room, { t: "peer", online: false });

  if (room.players.length === 0) rooms.delete(code);
}

wss.on("connection", (ws) => {
  ws._room = null;
  ws._player = 0;

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (!msg || typeof msg.t !== "string") return;

    if (msg.t === "create") {
      leaveRoom(ws);
      const code = makeCode();
      const room = { players: [ws], host: ws, turnTime: normalizeTurnTime(msg.turnTime) };
      rooms.set(code, room);
      ws._room = code;
      ws._player = 1;
      send(ws, { t: "created", room: code, player: 1, turnTime: room.turnTime });
      return;
    }

    if (msg.t === "join") {
      const code = String(msg.room || "").toUpperCase().trim();
      const room = rooms.get(code);

      if (!room) {
        send(ws, { t: "error", message: "Không tìm thấy phòng" });
        return;
      }
      if (room.players.length >= 2) {
        send(ws, { t: "error", message: "Phòng đã đủ người" });
        return;
      }

      leaveRoom(ws);
      room.players.push(ws);
      ws._room = code;
      ws._player = 2;

      send(ws, { t: "joined", room: code, player: 2, turnTime: room.turnTime });
      broadcast(room, { t: "peer", online: true });
      return;
    }

    const room = rooms.get(ws._room || "");
    if (!room) return;

    if (msg.t === "move") {
      broadcast(room, { t: "move", index: msg.index, player: msg.player }, ws);
    } else if (msg.t === "restart") {
      broadcast(room, { t: "restart" }, ws);
    } else if (msg.t === "config") {
      // Đổi giới hạn thời gian: lưu vào phòng và báo người còn lại
      room.turnTime = normalizeTurnTime(msg.turnTime);
      broadcast(room, { t: "config", turnTime: room.turnTime }, ws);
    } else if (msg.t === "timeout") {
      // Không tin `player` do client gửi - dùng vị trí ghế thật của socket này
      broadcast(room, { t: "timeout", player: ws._player }, ws);
    }
  });

  ws.on("close", () => leaveRoom(ws));
  ws.on("error", () => leaveRoom(ws));
});

server.listen(PORT, () => {
  console.log(`Mini Game Hub  → http://localhost:${PORT}/`);
  console.log(`Caro WebSocket → ws://localhost:${PORT}/ws`);
  console.log(`Web root       → ${WEB_ROOT}`);
});
