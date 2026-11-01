/* ============================================================
   CHƠI ONLINE — bảng điều khiển dùng chung cho cờ vua / cờ tướng
   ------------------------------------------------------------
   Gói toàn bộ phần "phòng", "kết nối", "trạng thái" lại một chỗ
   để script của từng game chỉ cần khai báo vài callback:

       const online = GameOnline.create({
         game: "chess",
         seatName: (seat) => (seat === 1 ? "Trắng" : "Đen"),
         els: {
           panel, serverRow, serverInput, roomInput,
           createBtn, joinBtn, shareBtn, leaveBtn, status, connBtns,
         },
         getTurnTime: () => clock.turnTime,     // giới hạn thời gian của phòng
         onReset: () => restart(false),         // dựng lại bàn cờ (không broadcast)
         onPeerChange: (online) => { render(); updateTurnUI(); },
         onMove: (payload) => applyRemoteMove(payload),
         onRemoteRestart: () => restart(false),
         onRemoteConfig: (tt) => clock.set(tt, false),
         onRemoteTimeout: (seat) => applyRemoteTimeout(seat),
       });

       online.init();          // gọi trong init() của game
       online.setActive(true); // khi chọn chế độ 🌐 Online
       online.ready()          // đủ điều kiện đi quân chưa
   ============================================================ */
window.GameOnline = (() => {
  "use strict";

  const CODE_LEN = 5;

  function create(cfg) {
    const game = String(cfg.game || "board");
    const els = cfg.els || {};
    const seatName = cfg.seatName || ((seat) => (seat === 2 ? "khách" : "chủ phòng"));

    const WS_NET = window.GameNet ? window.GameNet.create(game) : null;
    const P2P_NET = window.GameP2P ? window.GameP2P.create(game) : null;
    const CONN_KEY = `${game}-conn-kind`;
    const SERVER_KEY = `${game}-server-url`;

    let NET = null;
    let connKind = defaultConnKind();
    let room = null;
    let seat = 0;
    let peerOnline = false;
    let active = false;
    let wired = false;

    function call(name, ...args) {
      const fn = cfg[name];
      if (typeof fn === "function") fn(...args);
    }

    function setStatus(text, kind) {
      if (!els.status) return;
      els.status.textContent = text;
      els.status.classList.toggle("ok", kind === "ok");
      els.status.classList.toggle("err", kind === "err");
    }

    function setStatusHtml(html, kind) {
      if (!els.status) return;
      els.status.innerHTML = html;
      els.status.classList.toggle("ok", kind === "ok");
      els.status.classList.toggle("err", kind === "err");
    }

    /** Host tĩnh (GitHub Pages, Netlify…) không chạy được WebSocket → mặc định P2P */
    function defaultConnKind() {
      try {
        const saved = localStorage.getItem(CONN_KEY);
        if (saved === "ws" || saved === "p2p") return saved;
      } catch {
        /* bỏ qua */
      }
      return P2P_NET ? "p2p" : "ws";
    }

    function defaultServerUrl() {
      if (location.protocol === "file:") return "ws://localhost:8080/ws";
      const proto = location.protocol === "https:" ? "wss:" : "ws:";
      return `${proto}//${location.host}/ws`;
    }

    function currentServerUrl() {
      const typed = els.serverInput ? els.serverInput.value.trim() : "";
      return typed || defaultServerUrl();
    }

    function isStaticHost() {
      return /(^|\.)(github\.io|gitlab\.io|netlify\.app|vercel\.app|pages\.dev|web\.app)$/i.test(
        location.hostname
      );
    }

    function explainConnectError(err) {
      const msg = (err && err.message) || String(err);
      if (connKind === "p2p" || !isStaticHost()) return msg;
      return `${msg}. Trang này chạy trên host tĩnh nên không có WebSocket — bấm «⚡ P2P (không cần server)» ở trên để chơi online ngay, không cần deploy gì.`;
    }

    function resetState() {
      room = null;
      seat = 0;
      peerOnline = false;
    }

    function updateRoomButtons() {
      const inRoom = Boolean(room);
      if (els.shareBtn) els.shareBtn.classList.toggle("hidden", !inRoom);
      if (els.leaveBtn) els.leaveBtn.classList.toggle("hidden", !inRoom);
    }

    async function ensureConnected() {
      if (!NET) {
        throw new Error(
          connKind === "p2p"
            ? "Chưa tải được assets/p2p.js — không chơi online được."
            : "Chưa tải được assets/net.js — không chơi online được."
        );
      }
      if (NET.isOnline) return;
      setStatus(connKind === "p2p" ? "Đang chuẩn bị kết nối P2P…" : "Đang kết nối…");
      try {
        await NET.connect(currentServerUrl());
      } catch (err) {
        throw new Error(explainConnectError(err));
      }
      if (connKind === "ws") {
        try {
          localStorage.setItem(SERVER_KEY, currentServerUrl());
        } catch {
          /* trình duyệt chặn localStorage thì bỏ qua */
        }
      }
    }

    function applyConnKind(kind, options) {
      const silent = Boolean(options && options.silent);
      let next = kind === "ws" ? "ws" : "p2p";
      if (next === "p2p" && !P2P_NET) next = "ws"; // thiếu file p2p.js → quay về WebSocket

      if (NET) NET.disconnect();
      resetState();
      updateRoomButtons();

      connKind = next;
      NET = connKind === "p2p" ? P2P_NET : WS_NET;
      try {
        localStorage.setItem(CONN_KEY, connKind);
      } catch {
        /* bỏ qua */
      }

      for (const btn of Array.from(els.connBtns || [])) {
        const on = btn.dataset.conn === connKind;
        btn.classList.toggle("active", on);
        btn.setAttribute("aria-pressed", on ? "true" : "false");
      }
      if (els.serverRow) els.serverRow.classList.toggle("hidden", connKind !== "ws");

      call("onPeerChange", false);
      if (silent) return;

      call("onReset");
      if (connKind === "p2p") {
        setStatus(
          "P2P: không cần server. Bấm «Tạo phòng» rồi gửi mã (hoặc link mời) cho bạn — hai máy nối trực tiếp với nhau."
        );
      } else {
        setStatus(`Server riêng: đang dùng ${currentServerUrl()}`);
      }
    }

    function buildInviteLink() {
      const url = new URL(location.href);
      url.searchParams.set("room", room);
      return url.toString();
    }

    async function copyInviteLink() {
      const link = buildInviteLink();
      try {
        await navigator.clipboard.writeText(link);
        setStatusHtml(`Đã copy link mời: <b>${room}</b>`, "ok");
      } catch {
        window.prompt("Copy link này gửi cho bạn của bạn:", link);
      }
    }

    function leave() {
      if (NET) NET.disconnect();
      resetState();
      updateRoomButtons();
      if (els.roomInput) els.roomInput.value = "";
      call("onReset");
      setStatus("Đã rời phòng. Tạo phòng mới hoặc nhập mã để vào phòng khác.");
    }

    async function createRoom() {
      if (els.createBtn) els.createBtn.disabled = true;
      if (els.joinBtn) els.joinBtn.disabled = true;
      try {
        await ensureConnected();
        const tt = typeof cfg.getTurnTime === "function" ? cfg.getTurnTime() : 0;
        const data = await NET.createRoom(tt);
        room = data.room;
        seat = data.player;
        peerOnline = NET.peerOnline;
        call("onReset");
        if (els.roomInput) els.roomInput.value = room;
        updateRoomButtons();
        setStatusHtml(
          `Mã phòng: <b>${room}</b> · bạn là ${seatName(seat)} · bấm «Copy link mời» rồi gửi cho bạn`,
          "ok"
        );
      } catch (err) {
        resetState();
        updateRoomButtons();
        setStatus(`Lỗi: ${err.message || err}`, "err");
      } finally {
        if (els.createBtn) els.createBtn.disabled = false;
        if (els.joinBtn) els.joinBtn.disabled = false;
        call("onPeerChange", peerOnline);
      }
    }

    async function joinRoom(rawCode) {
      const source =
        rawCode === undefined || rawCode === null
          ? els.roomInput
            ? els.roomInput.value
            : ""
          : rawCode;
      const code = String(source)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, CODE_LEN);

      if (code.length < 4) {
        setStatus("Nhập mã phòng (5 ký tự) do bạn của bạn gửi.", "err");
        return;
      }

      if (els.createBtn) els.createBtn.disabled = true;
      if (els.joinBtn) els.joinBtn.disabled = true;
      try {
        await ensureConnected();
        const data = await NET.joinRoom(code);
        room = data.room;
        seat = data.player;
        peerOnline = NET.peerOnline;
        // Phòng do người khác tạo → theo giới hạn thời gian của phòng đó
        if (typeof data.turnTime === "number") call("onRemoteConfig", data.turnTime);
        if (els.roomInput) els.roomInput.value = room;
        call("onReset");
        updateRoomButtons();
        setStatusHtml(
          `Đã vào phòng <b>${room}</b> · bạn là ${seatName(seat)}`,
          "ok"
        );
      } catch (err) {
        resetState();
        updateRoomButtons();
        setStatus(`Lỗi: ${err.message || err}`, "err");
      } finally {
        if (els.createBtn) els.createBtn.disabled = false;
        if (els.joinBtn) els.joinBtn.disabled = false;
        call("onPeerChange", peerOnline);
      }
    }

    /** Gắn listener lên một transport (dùng chung cho WS và P2P) */
    function bind(transport) {
      if (!transport) return;

      transport.on("peer", (onlineNow) => {
        peerOnline = onlineNow;
        if (room) {
          setStatusHtml(
            onlineNow
              ? `Đang chơi ở phòng <b>${room}</b>`
              : `Đối thủ đã rời phòng <b>${room}</b> — chờ người mới…`,
            onlineNow ? "ok" : ""
          );
        }
        // Hai bên cùng dựng lại bàn để chắc chắn có chung một trạng thái
        if (onlineNow) call("onReset");
        call("onPeerChange", onlineNow);
      });

      transport.on("move", (payload) => call("onMove", payload));

      transport.on("restart", () => {
        call("onRemoteRestart");
        setStatusHtml(`Đối thủ xin ván mới · phòng <b>${room}</b>`, "ok");
      });

      transport.on("config", (value) => {
        if (typeof value !== "number") return;
        call("onRemoteConfig", value);
        if (!room) return;
        setStatusHtml(
          `Phòng <b>${room}</b> · bạn là ${seatName(seat)} · ${
            value ? `giới hạn <b>${value}s</b>/lượt` : "không giới hạn thời gian"
          }`,
          "ok"
        );
      });

      transport.on("timeout", (seatNo) => call("onRemoteTimeout", seatNo));

      transport.on("close", () => {
        const wasInRoom = Boolean(room);
        const wasGuest = seat === 2;
        resetState();
        updateRoomButtons();
        if (wasInRoom) {
          if (connKind === "p2p") {
            setStatus(
              wasGuest
                ? "Chủ phòng đã đóng phòng. Nhập mã khác hoặc bấm «Tạo phòng»."
                : "Đối thủ đã ngắt kết nối.",
              "err"
            );
          } else {
            setStatus("Mất kết nối tới server.", "err");
          }
        }
        call("onPeerChange", false);
      });

      transport.on("error", (message) => setStatus(`Lỗi: ${message}`, "err"));
    }

    function wireEvents() {
      if (wired) return;
      wired = true;

      for (const btn of Array.from(els.connBtns || [])) {
        btn.addEventListener("click", () => {
          if (btn.dataset.conn === connKind) return;
          applyConnKind(btn.dataset.conn);
        });
      }

      if (els.createBtn) els.createBtn.addEventListener("click", () => createRoom());
      if (els.joinBtn) els.joinBtn.addEventListener("click", () => joinRoom());
      if (els.shareBtn) els.shareBtn.addEventListener("click", () => copyInviteLink());
      if (els.leaveBtn) els.leaveBtn.addEventListener("click", () => leave());

      if (els.roomInput) {
        els.roomInput.addEventListener("input", () => {
          els.roomInput.value = els.roomInput.value
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "")
            .slice(0, CODE_LEN);
        });
        els.roomInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            joinRoom();
          }
        });
      }

      if (els.serverInput) {
        els.serverInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            els.serverInput.blur();
          }
        });
      }
    }

    function init() {
      bind(WS_NET);
      if (P2P_NET && P2P_NET !== WS_NET) bind(P2P_NET);
      wireEvents();
      applyConnKind(connKind, { silent: true });

      if (els.serverInput) {
        els.serverInput.placeholder = defaultServerUrl();
        try {
          const saved = localStorage.getItem(SERVER_KEY);
          if (saved) els.serverInput.value = saved;
        } catch {
          /* bỏ qua */
        }
      }
    }

    /** Mã phòng lấy từ link mời: .../chess/?room=K7M2Q */
    function invitedCode() {
      const code = (new URLSearchParams(location.search).get("room") || "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, CODE_LEN);
      return code.length >= 4 ? code : "";
    }

    function setActive(on) {
      const next = Boolean(on);
      if (active === next) return;
      active = next;

      if (els.panel) els.panel.classList.toggle("hidden", !next);

      if (!next) {
        if (NET) NET.disconnect();
        resetState();
        updateRoomButtons();
        call("onPeerChange", false);
        return;
      }

      applyConnKind(connKind, { silent: true });

      if (!NET) {
        setStatus("Thiếu file net.js / p2p.js — chỉ chơi offline được.", "err");
      } else if (room) {
        setStatusHtml(
          `Đang ở phòng <b>${room}</b>${peerOnline ? " · đối thủ đã vào" : " · chờ đối thủ"}`,
          "ok"
        );
      } else if (connKind === "p2p") {
        setStatus(
          "P2P: bấm «Tạo phòng» rồi gửi mã cho bạn, hoặc nhập mã để vào phòng. Không cần server."
        );
      } else {
        setStatus(
          `Server riêng: nhập địa chỉ WebSocket đang chạy (hiện tại ${currentServerUrl()}), rồi tạo/vào phòng.`
        );
      }
    }

    const api = {
      init,
      setActive,
      createRoom,
      joinRoom,
      leave,
      copyInviteLink,
      invitedCode,
      setStatus,
      setStatusHtml,
      ready: () => Boolean(room && seat && peerOnline),
      isHost: () => seat === 1,
      sendMove(move) {
        if (!api.ready()) return false;
        return NET.sendMove(move);
      },
      sendRestart() {
        if (!api.ready()) return false;
        return NET.sendRestart();
      },
      sendConfig(turnTime) {
        if (!room || !NET) return false;
        return NET.sendConfig(turnTime);
      },
      sendTimeout() {
        if (!api.ready()) return false;
        return NET.sendTimeout();
      },
      get active() {
        return active;
      },
      get room() {
        return room;
      },
      get seat() {
        return seat;
      },
      get peerOnline() {
        return peerOnline;
      },
      get connKind() {
        return connKind;
      },
    };

    return api;
  }

  return { create };
})();
