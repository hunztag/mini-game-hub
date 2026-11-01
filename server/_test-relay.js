// Script kiểm thử giao thức relay: node _test-relay.js  (cần server đang chạy)
const WebSocket = require("ws");

const URL = process.env.RELAY_URL || "ws://localhost:8080/ws";
const log = (...a) => console.log(...a);

function assert(ok, message) {
  if (!ok) throw new Error(message);
}

function open(name) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(URL);
    ws.name = name;
    ws.on("open", () => resolve(ws));
    ws.on("error", (err) => {
      reject(
        new Error(
          `Không kết nối được ${URL} (${err.code || err.message}).\n` +
            "→ Hãy chạy server trước:  npm start   (trong thư mục web-game/server)"
        )
      );
    });
    ws.on("message", (raw) => log(`[${name}] <-`, raw.toString()));
  });
}

function next(ws, type, timeout = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout chờ ${type} @${ws.name}`)), timeout);
    const h = (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.t !== type) return;
      clearTimeout(timer);
      ws.off("message", h);
      resolve(msg);
    };
    ws.on("message", h);
  });
}

(async () => {
  const a = await open("A");
  const b = await open("B");
  log("Cả hai client đã kết nối");

  a.send(JSON.stringify({ t: "create", turnTime: 60 }));
  const created = await next(a, "created");
  log("Tạo phòng OK:", created);
  assert(created.turnTime === 60, "turnTime phải được lưu khi tạo phòng");

  // B vào phòng
  const pPeerA = next(a, "peer");
  const pJoined = next(b, "joined");
  b.send(JSON.stringify({ t: "join", room: created.room }));
  const joined = await pJoined;
  log("B vào phòng:", joined);
  assert(joined.turnTime === 60, "B phải nhận được turnTime của phòng");
  log("A nhận peer:", await pPeerA);

  // A đánh -> B nhận
  const pMoveB = next(b, "move");
  a.send(JSON.stringify({ t: "move", index: 112, player: 1 }));
  log("B nhận nước đi:", await pMoveB);

  // B đánh -> A nhận
  const pMoveA = next(a, "move");
  b.send(JSON.stringify({ t: "move", index: 113, player: 2 }));
  log("A nhận nước đi:", await pMoveA);

  // restart
  const pRestartB = next(b, "restart");
  a.send(JSON.stringify({ t: "restart" }));
  await pRestartB;
  log("B nhận restart OK");

  // đổi giới hạn thời gian -> B nhận
  const pConfigB = next(b, "config");
  a.send(JSON.stringify({ t: "config", turnTime: 30 }));
  const config = await pConfigB;
  log("B nhận config:", config);
  assert(config.turnTime === 30, "config phải chuyển tiếp turnTime = 30");

  // giá trị không hợp lệ bị chuẩn hoá về 0
  const pConfigBad = next(b, "config");
  a.send(JSON.stringify({ t: "config", turnTime: 999 }));
  const bad = await pConfigBad;
  assert(bad.turnTime === 0, "turnTime lạ phải bị đưa về 0");
  log("Giá trị lạ bị chuẩn hoá:", bad);

  // báo hết giờ -> B nhận đúng ghế của A
  const pTimeoutB = next(b, "timeout");
  a.send(JSON.stringify({ t: "timeout" }));
  const to = await pTimeoutB;
  log("B nhận timeout:", to);
  assert(to.player === 1, "server phải điền ghế thật của người báo hết giờ");

  // phòng không tồn tại
  const pErr = next(b, "error");
  b.send(JSON.stringify({ t: "join", room: "ZZZZZ" }));
  log("Lỗi phòng không tồn tại:", await pErr);

  // B rời phòng -> A nhận peer false
  const pPeerOff = next(a, "peer");
  b.close();
  log("A nhận peer sau khi B rời:", await pPeerOff);

  a.close();
  log("TẤT CẢ KIỂM THỬ ĐỀU ĐẠT ✅");
  process.exit(0);
})().catch((err) => {
  console.error("THẤT BẠI:", err.message);
  process.exit(1);
});
