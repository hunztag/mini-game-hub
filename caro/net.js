/* ============================================================
   LỚP MẠNG CHO CHẾ ĐỘ CHƠI ONLINE
   ------------------------------------------------------------
   Tách phần "gửi/nhận nước đi" ra khỏi logic game để chỉ cần cắm
   một transport vào là chơi online được.

   Cách dùng trong script.js:

       CaroNet.on("move", ({ index, player }) => applyRemoteMove(index, player));
       await CaroNet.connect("wss://your-server.onrender.com/ws");
       const { room, player, turnTime } = await CaroNet.createRoom(60);  // player = 1 | 2
       await CaroNet.joinRoom("A3F9K2");                                 // máy thứ hai
       CaroNet.sendMove(index, player);

   Giao thức (JSON, server chỉ chuyển tiếp - relay):
       -> { t: "create", turnTime }             turnTime: 0 | 30 | 60 | 120 (0 = không giới hạn)
       <- { t: "created", room, player, turnTime }   player = 1 | 2
       -> { t: "join", room }
       <- { t: "joined", room, player, turnTime }
       <- { t: "peer", online: true|false }
       -> { t: "move", index, player }
       <- { t: "move", index, player }
       -> { t: "restart" }
       <- { t: "restart" }
       -> { t: "config", turnTime }             chủ phòng đổi giới hạn thời gian
       <- { t: "config", turnTime }
       -> { t: "timeout" }                      người đến lượt báo đã hết giờ
       <- { t: "timeout", player }
       <- { t: "error", message }

   Không có server thì module này im lặng (isOnline = false) và game
   vẫn chạy offline bình thường.
   ============================================================ */
window.CaroNet = (() => {
  "use strict";

  const listeners = new Map();
  let ws = null;
  let room = null;
  let player = 0;
  let peerOnline = false;
  let url = "";

  function emit(event, payload) {
    const set = listeners.get(event);
    if (!set) return;
    for (const fn of set) {
      try {
        fn(payload);
      } catch (err) {
        console.error("[CaroNet]", err);
      }
    }
  }

  function on(event, fn) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(fn);
    return () => listeners.get(event).delete(fn);
  }

  /** Mở kết nối tới relay server. Trả về Promise khi socket mở xong. */
  function connect(serverUrl, { timeout = 8000 } = {}) {
    url = serverUrl;
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error("Hết thời gian kết nối"));
      }, timeout);

      try {
        ws = new WebSocket(serverUrl);
      } catch (err) {
        clearTimeout(timer);
        reject(err);
        return;
      }

      ws.addEventListener("open", () => {
        clearTimeout(timer);
        if (!settled) {
          settled = true;
          emit("open");
          resolve(true);
        }
      });

      ws.addEventListener("message", (e) => {
        let msg;
        try {
          msg = JSON.parse(e.data);
        } catch {
          return;
        }

        if (msg.t === "created" || msg.t === "joined") {
          room = msg.room;
          player = msg.player;
          emit("room", { room, player, turnTime: msg.turnTime });
        } else if (msg.t === "peer") {
          peerOnline = Boolean(msg.online);
          emit("peer", peerOnline);
        } else if (msg.t === "move") {
          emit("move", { index: msg.index, player: msg.player });
        } else if (msg.t === "restart") {
          emit("restart");
        } else if (msg.t === "config") {
          emit("config", msg.turnTime);
        } else if (msg.t === "timeout") {
          emit("timeout", msg.player);
        } else if (msg.t === "error") {
          emit("error", msg.message || "Lỗi không xác định");
        }
      });

      ws.addEventListener("close", () => {
        peerOnline = false;
        emit("close");
      });

      ws.addEventListener("error", () => {
        clearTimeout(timer);
        if (!settled) {
          settled = true;
          reject(new Error("Không kết nối được tới server"));
        }
      });
    });
  }

  function rawSend(payload) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify(payload));
    return true;
  }

  /** Gửi yêu cầu tạo/vào phòng và chờ phản hồi `room` hoặc `error`. */
  function requestRoom(payload) {
    return new Promise((resolve, reject) => {
      let offRoom = () => {};
      let offError = () => {};

      const cleanup = () => {
        offRoom();
        offError();
      };

      offRoom = on("room", (data) => {
        cleanup();
        resolve(data);
      });
      offError = on("error", (message) => {
        cleanup();
        reject(new Error(message));
      });

      if (!rawSend(payload)) {
        cleanup();
        reject(new Error("Chưa kết nối tới server"));
      }
    });
  }

  const createRoom = (turnTime) => requestRoom({ t: "create", turnTime });
  const joinRoom = (code) => requestRoom({ t: "join", room: String(code || "").toUpperCase() });

  const sendMove = (index, who) => rawSend({ t: "move", index, player: who });
  const sendRestart = () => rawSend({ t: "restart" });
  const sendConfig = (turnTime) => rawSend({ t: "config", turnTime });
  const sendTimeout = () => rawSend({ t: "timeout" });
  const disconnect = () => {
    if (ws) ws.close();
    ws = null;
    room = null;
    player = 0;
    peerOnline = false;
  };

  return {
    on,
    connect,
    createRoom,
    joinRoom,
    sendMove,
    sendRestart,
    sendConfig,
    sendTimeout,
    disconnect,
    get room() {
      return room;
    },
    get player() {
      return player;
    },
    get isOnline() {
      return Boolean(ws && ws.readyState === WebSocket.OPEN);
    },
    get peerOnline() {
      return peerOnline;
    },
    get serverUrl() {
      return url;
    },
  };
})();
