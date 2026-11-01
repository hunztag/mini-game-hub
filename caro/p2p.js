/* ============================================================
   CHƠI ONLINE KHÔNG CẦN SERVER (WebRTC ngang hàng)
   ------------------------------------------------------------
   Cùng API với `net.js`, chỉ khác là dữ liệu đi TRỰC TIẾP giữa
   hai trình duyệt thay vì qua relay. Nhờ vậy chơi được trên host
   tĩnh như GitHub Pages / Vercel Static / Netlify.

   Cách dùng (script.js tự chọn transport, không cần gọi tay):

       CaroP2P.on("move", ({ index, player }) => ...);
       await CaroP2P.connect();                       // nạp thư viện PeerJS
       const { room, player } = await CaroP2P.createRoom(60);
       const { room, player } = await CaroP2P.joinRoom("K7M2Q");
       CaroP2P.sendMove(index, player);

   Cơ chế:
   - Máy chủ tạo phòng vào broker công khai của PeerJS với id
     `caro-gmk-v1-<MÃ>`, rồi chờ kết nối.
   - Máy vào phòng kết nối thẳng tới id đó → mở DataChannel.
   - Sau đó mọi thông điệp đi P2P, broker không thấy nội dung.

   Ưu điểm: không cần deploy server, không tốn tiền.
   Nhược điểm: phụ thuộc broker công khai + cần WebRTC (mạng chặn
   UDP nghiêm ngặt có thể không vào được → khi đó dùng "Server").
   ============================================================ */
window.CaroP2P = (() => {
  "use strict";

  const PREFIX = "caro-gmk-v1-";
  const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const CODE_LEN = 5;
  const TIMEOUT_MS = 20000; // chờ broker/đối thủ
  const CDNS = [
    "https://unpkg.com/peerjs@1.5.5/dist/peerjs.min.js",
    "https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js",
  ];

  const listeners = new Map();
  let peer = null;
  let conn = null;
  let room = null;
  let player = 0;
  let peerOnline = false;
  let isHost = false;
  let hostTurnTime = 0;
  let libPromise = null;

  function emit(event, payload) {
    const set = listeners.get(event);
    if (!set) return;
    for (const fn of set) {
      try {
        fn(payload);
      } catch (err) {
        console.error("[CaroP2P]", err);
      }
    }
  }

  function on(event, fn) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(fn);
    return () => listeners.get(event).delete(fn);
  }

  /** Đổi mã lỗi kỹ thuật của PeerJS thành câu tiếng Việt dễ hiểu */
  function friendly(err) {
    const type = (err && err.type) || "";
    if (type === "unavailable-id") return "Mã phòng đang được dùng, hãy tạo lại.";
    if (type === "peer-unavailable") {
      return "Không tìm thấy phòng này. Kiểm tra lại mã, hoặc nhờ bạn bấm «Tạo phòng» trước.";
    }
    if (type === "network" || type === "server-error" || type === "socket-error") {
      return "Không kết nối được máy chủ P2P. Thử lại sau ít phút hoặc chuyển sang «Server».";
    }
    if (type === "browser-incompatible") {
      return "Trình duyệt này không hỗ trợ WebRTC — hãy dùng Chrome, Edge, Firefox hoặc Safari bản mới.";
    }
    if (type === "webrtc" || type === "negotiation-failed") {
      return "Không mở được kết nối trực tiếp (mạng chặn P2P). Hãy chuyển sang «Server».";
    }
    return (err && err.message) || "Lỗi P2P không xác định";
  }

  function makeCode() {
    let out = "";
    for (let i = 0; i < CODE_LEN; i += 1) {
      out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    }
    return out;
  }

  /** Nạp thư viện PeerJS từ CDN (thử nhiều nguồn) */
  function loadLib() {
    if (window.Peer) return Promise.resolve(window.Peer);
    if (libPromise) return libPromise;

    libPromise = (async () => {
      for (const src of CDNS) {
        try {
          await new Promise((resolve, reject) => {
            const s = document.createElement("script");
            s.src = src;
            s.async = true;
            s.onload = resolve;
            s.onerror = () => reject(new Error("cdn"));
            document.head.appendChild(s);
          });
          if (window.Peer) return window.Peer;
        } catch {
          /* thử CDN kế tiếp */
        }
      }
      libPromise = null;
      throw new Error(
        "Không tải được thư viện P2P. Kiểm tra kết nối mạng rồi thử lại, hoặc chuyển sang «Server»."
      );
    })();

    return libPromise;
  }

  /** Tạo peer và chờ broker mở xong (hoặc báo lỗi) */
  function newPeer(Peer, id) {
    return new Promise((resolve, reject) => {
      let done = false;
      const p = id ? new Peer(id, { debug: 0 }) : new Peer({ debug: 0 });

      const timer = setTimeout(() => {
        if (done) return;
        done = true;
        try {
          p.destroy();
        } catch {
          /* bỏ qua */
        }
        reject(
          new Error("Máy chủ P2P không phản hồi. Thử lại, hoặc chuyển sang «Server».")
        );
      }, TIMEOUT_MS);

      p.on("open", () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(p);
      });

      p.on("error", (err) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        try {
          p.destroy();
        } catch {
          /* bỏ qua */
        }
        reject(new Error(friendly(err)));
      });
    });
  }

  function send(payload) {
    if (!conn || !conn.open) return false;
    try {
      conn.send(payload);
      return true;
    } catch {
      return false;
    }
  }

  function handleData(data) {
    let msg = data;
    if (typeof msg === "string") {
      try {
        msg = JSON.parse(msg);
      } catch {
        return;
      }
    }
    if (!msg || typeof msg !== "object") return;

    if (msg.t === "move") {
      emit("move", { index: msg.index, player: msg.player });
    } else if (msg.t === "restart") {
      emit("restart");
    } else if (msg.t === "config") {
      emit("config", msg.turnTime);
    } else if (msg.t === "timeout") {
      // Người gửi là người hết giờ → ghế của họ là ghế đối diện với mình
      emit("timeout", 3 - player);
    }
  }

  function attachConn(c) {
    conn = c;

    const handleOpen = () => {
      peerOnline = true;
      // Chủ phòng gửi giới hạn thời gian cho người vào sau
      if (isHost) send({ t: "config", turnTime: hostTurnTime });
      emit("peer", true);
    };

    if (c.open) handleOpen();
    else c.on("open", handleOpen);

    c.on("data", handleData);

    c.on("close", () => {
      if (conn !== c) return;
      conn = null;
      peerOnline = false;
      emit("peer", false);
    });

    c.on("error", () => {
      /* lỗi lẻ tẻ trên DataChannel — đóng kết nối sẽ báo qua "close" */
    });
  }

  /** P2P không cần "kết nối trước", chỉ cần thư viện sẵn sàng */
  async function connect() {
    await loadLib();
    return true;
  }

  async function createRoom(turnTime) {
    const Peer = await loadLib();
    disconnect();

    hostTurnTime = typeof turnTime === "number" ? turnTime : 0;
    isHost = true;

    let p = null;
    let code = "";
    for (let attempt = 0; attempt < 4 && !p; attempt += 1) {
      code = makeCode();
      try {
        p = await newPeer(Peer, PREFIX + code);
      } catch (err) {
        // Mã trùng → thử mã khác; lỗi khác thì dừng
        if (!/đang được dùng/.test(err.message)) throw err;
      }
    }
    if (!p) throw new Error("Không tạo được phòng, vui lòng thử lại.");

    peer = p;
    player = 1;
    room = code;
    peerOnline = false;

    p.on("connection", (c) => attachConn(c));
    p.on("error", (err) => emit("error", friendly(err)));

    return { room, player, turnTime: hostTurnTime };
  }

  async function joinRoom(rawCode) {
    const Peer = await loadLib();
    const target = String(rawCode || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, CODE_LEN);

    if (target.length < 4) throw new Error("Mã phòng phải có 5 ký tự.");

    disconnect();

    const p = await newPeer(Peer);
    peer = p;
    isHost = false;
    player = 2;
    room = target;
    peerOnline = false;

    const c = p.connect(PREFIX + target, { reliable: true });

    // Gắn listener NGAY để không lỡ thông điệp "config" của chủ phòng
    attachConn(c);

    await new Promise((resolve, reject) => {
      let done = false;
      const finish = (fn, arg) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        fn(arg);
      };

      const resetFailed = () => {
        conn = null;
        peer = null;
        player = 0;
        room = null;
        peerOnline = false;
      };

      const timer = setTimeout(() => {
        finish(() => {
          try {
            p.destroy();
          } catch {
            /* bỏ qua */
          }
          resetFailed();
          reject(new Error("Không kết nối được tới phòng. Nhờ bạn tạo phòng rồi thử lại."));
        });
      }, TIMEOUT_MS);

      const onPeerError = (err) => {
        finish(() => {
          try {
            p.destroy();
          } catch {
            /* bỏ qua */
          }
          resetFailed();
          reject(new Error(friendly(err)));
        });
      };

      p.on("error", onPeerError);

      c.on("open", () => {
        finish(() => {
          if (typeof p.off === "function") p.off("error", onPeerError);
          resolve();
        });
      });
    });

    p.on("error", (err) => emit("error", friendly(err)));

    return { room, player, turnTime: 0 }; // turnTime thật sẽ tới qua sự kiện "config"
  }

  function disconnect() {
    if (conn) {
      try {
        conn.close();
      } catch {
        /* bỏ qua */
      }
    }
    if (peer) {
      try {
        peer.destroy();
      } catch {
        /* bỏ qua */
      }
    }
    conn = null;
    peer = null;
    room = null;
    player = 0;
    peerOnline = false;
    isHost = false;
  }

  return {
    on,
    connect,
    createRoom,
    joinRoom,
    sendMove: (index, who) => send({ t: "move", index, player: who }),
    sendRestart: () => send({ t: "restart" }),
    sendConfig: (turnTime) => {
      // Nhớ lại để người vào phòng sau vẫn nhận đúng giới hạn thời gian
      if (isHost && typeof turnTime === "number") hostTurnTime = turnTime;
      return send({ t: "config", turnTime });
    },
    sendTimeout: () => send({ t: "timeout" }),
    disconnect,
    get room() {
      return room;
    },
    get player() {
      return player;
    },
    get isOnline() {
      return Boolean(peer && !peer.destroyed);
    },
    get peerOnline() {
      return peerOnline;
    },
    get serverUrl() {
      return "p2p";
    },
  };
})();
