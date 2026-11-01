# 🎮 Mini Game Hub

Sân chơi nhỏ gồm nhiều game, tất cả viết bằng **HTML + CSS + JavaScript thuần** — không build, không framework, không cần `npm install` để chơi.

Mở `web-game/index.html` bằng trình duyệt là chơi được ngay.

## Danh sách game

| Game | Trạng thái | Mô tả |
|---|---|---|
| 🐍 Rắn săn mồi | ✅ Sẵn sàng | 6 màn, có tường chắn, âm thanh, đồ họa neon |
| ⚫ Cờ caro | ✅ Sẵn sàng | Bàn 15×15, đấu với máy (3 độ khó) hoặc 2 người |
| 🔢 2048 | 🚧 Sắp có | — |
| 🃏 Lật thẻ | 🚧 Sắp có | — |

## Cách chơi chung

- Trang chủ `web-game/index.html` → bấm vào card game để vào chơi.
- Mỗi game có nút **← Chọn game** ở góc trên bên trái để quay về.
- Nút 🔊 ở góc trên bên phải để bật / tắt âm thanh (trạng thái được ghi nhớ).

## Cấu trúc thư mục

```
web-game/
├── index.html          # Trang chủ chọn game
├── README.md
├── assets/             # Tài nguyên dùng chung cho mọi game
│   ├── hub.css         # Giao diện trang chủ
│   ├── hub.js          # Render danh sách game từ games.js
│   ├── games.js        # ⭐ Danh sách game (sửa file này để thêm game)
│   ├── shared.css      # Nút "← Chọn game" dùng chung
│   └── audio.js        # Thư viện âm thanh tổng hợp (Web Audio API)
├── snake/              # 🐍 Game rắn
│   ├── index.html
│   ├── style.css
│   └── script.js
├── caro/               # ⚫ Cờ caro
│   ├── index.html
│   ├── style.css
│   ├── script.js       # Luật chơi + giao diện
│   ├── ai.js           # Máy đánh cờ (easy / normal / hard)
│   └── net.js          # Lớp mạng cho chế độ online
└── server/             # Server Node.js: web tĩnh + relay online
    ├── package.json
    ├── server.js
    └── _test-relay.js  # Script kiểm thử giao thức
```

## Cách chạy trên máy

**Cách 1 — mở trực tiếp (chơi offline)**

Double-click `web-game/index.html`. Mọi game chạy được vì không dùng ES modules.

**Cách 2 — chạy server Node.js (có luôn chơi online)**

```powershell
cd web-game/server
npm install
npm start
# mở http://localhost:8080/
```

**Cách 3 — server tĩnh bất kỳ**

```powershell
cd web-game
python -m http.server 5500
# rồi mở http://localhost:5500
```

## Rắn săn mồi

| Phím | Tác dụng |
|---|---|
| `↑` `↓` `←` `→` hoặc `W` `A` `S` `D` | Di chuyển |
| `Space` | Tạm dừng / Tiếp tục |
| `M` | Bật / tắt âm thanh |

Trên điện thoại: dùng các nút mũi tên bên dưới bàn chơi hoặc **vuốt** trực tiếp trên bàn chơi.

- 6 màn chơi, mỗi màn có mục tiêu điểm riêng, tốc độ tăng dần và bố cục tường chắn khác nhau.
- Điểm cao nhất lưu bằng `localStorage`.
- Tốc độ tăng dần mỗi khi ăn mồi; hàng đợi hướng đi nên bấm nhanh 2 phím liên tiếp vẫn đúng, không quay đầu 180°.
- Tự tạm dừng khi chuyển sang tab khác.

**Đồ họa**

- Chuyển động **nội suy mượt** giữa các ô (không còn kiểu nhảy từng ô).
- Thân rắn vẽ bằng đường cong có bo tròn hai đầu, đổ **gradient cyan → xanh lá** dọc thân + quầng neon phát sáng.
- Đầu rắn có gradient cầu, mắt trắng có điểm sáng, luôn xoay theo hướng bò.
- Mồi là quả cầu gradient đỏ **nhấp nhô theo nhịp** với 4 tia sáng xoay quanh.
- Ăn mồi: **bắn hạt (particles)**, chữ `+1` bay lên, màn hình rung nhẹ.
- Va chạm: **rung mạnh + nháy đỏ + hạt văng**, bảng kết quả hiện sau nửa giây.
- Nền canvas có gradient tối, lưới mờ, quầng sáng cyan bám theo đầu rắn; khung bàn chơi phát sáng theo nhịp.
- Bàn chơi 20×20 ô, tự co giãn theo màn hình, hỗ trợ màn hình Retina (devicePixelRatio).

## Cờ caro — luật & điều khiển

- Bàn **15×15**, ai có **5 quân liền nhau** (ngang / dọc / chéo) thì thắng.
- Chế độ: **Đấu với máy** (bạn cầm Đen, đi trước), **2 người cùng máy**, hoặc **🌐 Online**.
- Độ khó máy:
  - `Dễ` — chọn ngẫu nhiên trong 6 nước tấn công tốt nhất, hay bỏ sót.
  - `Thường` — chọn trong 3 nước tốt nhất, biết chặn 4 quân.
  - `Khó` — chấm điểm tấn công + phòng thủ và **mô phỏng nước đáp trả** của đối thủ.

| Phím | Tác dụng |
|---|---|
| Click / chạm vào ô | Đặt quân |
| `U` | Hoàn tác (không dùng được khi online) |
| `R` | Ván mới (online: báo cả đối thủ) |
| `M` | Bật / tắt âm thanh |

Điểm thắng lưu trong `localStorage` (`caro-score`).

**Giới hạn thời gian mỗi lượt:** thanh `⏱ Mỗi lượt` ngay trên bàn cờ có 4 lựa chọn — `30s`, `60s`, `120s`, `Không` (mặc định).

- Đồng hồ bắt đầu chạy từ **nước đi đầu tiên** của ván, đếm ngược cho người đang đến lượt.
- 10 giây cuối thanh đổi màu vàng, 5 giây cuối đỏ + có tiếng tick.
- **Hết giờ = thua ván đó** (chơi offline: người thắng vẫn được +1 điểm).
- Đổi lúc nào cũng được, áp dụng ngay cho lượt hiện tại; lựa chọn được nhớ trong `localStorage` (`caro-turn-time`).
- Khi **online**, giới hạn do người tạo phòng quyết định; đổi giới hạn sẽ được báo cho đối thủ, và chỉ chính người hết giờ mới gửi tín hiệu `timeout` để hai bên không lệch kết quả.

**Chơi online:** chọn `🌐 Online` → **Tạo phòng** → **📋 Copy link mời** → gửi link cho bạn. Người mở link được tự động vào phòng và cầm quân Trắng.

## Cách thêm game mới

1. Tạo thư mục `web-game/<ten-game>/` với `index.html`, `style.css`, `script.js`.
2. Nhớ nạp CSS dùng chung, script âm thanh và nút quay về:

   ```html
   <link rel="stylesheet" href="../assets/shared.css" />
   <script src="../assets/audio.js"></script>
   <a class="back-link" href="../index.html">← Chọn game</a>
   ```

3. Thêm một object vào mảng trong `assets/games.js`:

   ```js
   {
     id: "2048",
     icon: "🔢",
     name: "2048",
     desc: "Ghép số để đạt ô 2048.",
     href: "2048/index.html",
     status: "ready",              // "ready" = bấm được, "soon" = sắp có
     tags: [{ text: "Giải đố", color: "" }],
   }
   ```

4. Xong — trang chủ tự render card mới, không cần sửa HTML.

## Chơi online với bạn

Chế độ **🌐 Online** trong cờ caro hoạt động theo mô hình: **client tĩnh** (đưa lên web) + **relay server** (WebSocket) chuyển nước đi giữa 2 người. Server **không** chứa luật chơi — mỗi máy tự tính, server chỉ chuyển tiếp, nên rất nhẹ và chống được sửa luật từ client ở mức cơ bản.

### 1. Bật server local

```powershell
cd web-game/server
npm install
npm start
```

Sau đó mở **http://localhost:8080/**

Server này phục vụ luôn file web tĩnh (thư mục `web-game`) ở cổng 8080 và WebSocket ở đường dẫn `/ws`, nên không cần chạy thêm server tĩnh nào khác.

- `GET /` → trang chủ chọn game
- `GET /caro/` → game cờ caro
- `GET /healthz` → `{"ok":true,"rooms":0}`
- `WS /ws` → relay chơi online

### 2. Thử chơi online

1. Mở `http://localhost:8080/caro/` trên **hai tab** (hoặc hai máy trong cùng mạng LAN dùng `http://<IP-máy-bạn>:8080/caro/`).
2. Tab A: chọn `🌐 Online` → bấm **Tạo phòng** → nhận mã 5 ký tự (ví dụ `K7M2Q`).
3. Bấm **📋 Copy link mời** → dán link đó cho bạn (dạng `.../caro/?room=K7M2Q`).
4. Bạn của bạn mở link là **tự động vào phòng**, không cần nhập mã.
5. Tab A cầm **Đen** (đi trước), người vào sau cầm **Trắng**. Hai bên tự thấy nước đi của nhau.

Ô **Server** trong bảng online cho phép đổi địa chỉ relay server; giá trị được ghi nhớ trong `localStorage` (`caro-server-url`). Mặc định:

- mở bằng `file://` → `ws://localhost:8080/ws`
- mở bằng `http://` hoặc `https://` → cùng host với trang (`ws://` hoặc `wss://` + `/ws`)

### 3. Giao thức (đã cài sẵn trong `caro/net.js`)

| Client → Server | Server → Client | Ý nghĩa |
|---|---|---|
| `{t:"create", turnTime}` | `{t:"created", room, player, turnTime}` | Tạo phòng, nhận mã 5 ký tự (kèm giới hạn thời gian) |
| `{t:"join", room}` | `{t:"joined", room, player, turnTime}` | Vào phòng bằng mã |
| — | `{t:"peer", online}` | Đối thủ vào / rời phòng |
| `{t:"move", index, player}` | chuyển tiếp cho người còn lại | Đánh quân |
| `{t:"restart"}` | chuyển tiếp | Xin ván mới |
| `{t:"config", turnTime}` | `{t:"config", turnTime}` | Đổi giới hạn thời gian mỗi lượt (`0` = không giới hạn) |
| `{t:"timeout"}` | `{t:"timeout", player}` | Người đến lượt báo đã hết giờ (server tự điền ghế thật) |
| — | `{t:"error", message}` | Phòng không tồn tại / đã đủ |

Dùng `net.js`:

```js
await CaroNet.connect("wss://ten-server-cua-ban.onrender.com/ws");
const { room, player, turnTime } = await CaroNet.createRoom(60); // player = 1 | 2
CaroNet.on("move", ({ index, player }) => applyRemoteMove(index, player));
CaroNet.on("peer", (online) => { /* cập nhật trạng thái */ });
CaroNet.on("config", (seconds) => { /* đối thủ đổi giới hạn thời gian */ });
CaroNet.on("timeout", (seat) => { /* đối thủ hết giờ */ });
CaroNet.sendMove(index, player);
```

### 4. Đưa web lên Internet

**Bước 0 — đẩy code lên GitHub của bạn** (gốc repo = nội dung thư mục `web-game/`):

```powershell
cd <đường-dẫn>\web-game
git init -b main
git add .
git commit -m "Mini game hub: Rắn săn mồi + Cờ caro (AI & online)"
gh repo create mini-game-hub --public --source . --push
```

Không có `gh` thì tạo repo trống trên github.com trước, rồi:

```powershell
git remote add origin https://github.com/<tên-bạn>/mini-game-hub.git
git push -u origin main
```

> Gốc repo **phải** là nội dung `web-game/` (có `index.html`, `assets/`, `caro/`, `snake/`, `server/`) thì GitHub Pages mới mở đúng trang chủ.

**Cách khuyến nghị — deploy 1 service duy nhất (có cả web + online):**

`server/server.js` vừa phục vụ file web tĩnh vừa làm relay WebSocket, nên chỉ cần deploy thư mục `server` là xong:

| Dịch vụ | Cách làm |
|---|---|
| **Render** | New → Web Service → repo GitHub, Root Directory = `server`, Build = `npm install`, Start = `npm start` |
| **Render (nhanh nhất)** | New → **Blueprint** → chọn repo này → Apply (đã có sẵn `render.yaml`) |
| **Railway** | New Project → GitHub repo → chọn thư mục `server` |
| **Fly.io** | `fly launch` trong `web-game/server` |
| **VPS của bạn** | `pm2 start server.js --name hub` + Nginx proxy `/` và `/ws` |

Sau khi deploy, mở `https://ten-app.onrender.com/` là vào trang chủ chọn game; caro online tự kết nối `wss://ten-app.onrender.com/ws` — **không cần sửa gì trong code**.

**Cách khác — chỉ host web tĩnh (GitHub Pages) và để relay riêng:**

| Nơi host web tĩnh | Cách làm |
|---|---|
| **GitHub Pages** | Push repo (gốc repo = nội dung `web-game/`) → Settings → Pages → Source: *Deploy from a branch* → Branch `main`, thư mục `/ (root)` |
| **Netlify** | Kéo thả thư mục `web-game` vào app.netlify.com |
| **Vercel** | `npx vercel --prod` trong thư mục `web-game` |
| **Cloudflare Pages** | Kết nối GitHub repo, build command để trống, output = `/` |

Khi tách riêng, nhập địa chỉ relay server vào ô **Server** trong bảng Online (giá trị được ghi nhớ trong `localStorage`).

> 💡 **GitHub Pages chỉ phục vụ file tĩnh** — Rắn và Caro (đấu với máy / 2 người cùng máy) chạy tốt, nhưng **Caro online cần relay WebSocket**. Muốn chơi online thì deploy thêm `server/` lên Render, rồi dán `wss://ten-app.onrender.com/ws` vào ô **Server**. Nếu quên, trang sẽ nhắc đúng việc cần làm.

> ⚠️ **Chỉ deploy thư mục `web-game/`** (hoặc copy nó sang một repo riêng). Đừng push cả thư mục cha lên GitHub — thư mục cha còn chứa các file khác không liên quan tới game.
>
> Server tĩnh ở `server/server.js` chỉ phục vụ trong phạm vi `web-game/` và đã chặn `../` nên không thể lộ file bên ngoài.

Lưu ý quan trọng:

- Web trên **HTTPS chỉ kết nối được `wss://`** → server phải có TLS (Render/Railway/Fly đều tự cấp).
- Gói miễn phí thường **ngủ sau ~15 phút** không dùng, lần kết nối đầu sẽ chậm vài giây.
- Mặc định client lấy `location.host` để suy ra địa chỉ WebSocket, nên deploy cùng domain là chạy ngay.

### 5. Kiểm thử relay server

```powershell
cd web-game/server
npm run test:relay
```

Script `_test-relay.js` giả lập 2 client và kiểm tra: tạo phòng → vào phòng → gửi/nhận nước đi → restart → đổi giới hạn thời gian (`config`) → báo hết giờ (`timeout`) → phòng không tồn tại → đối thủ rời phòng.

> Script cần server đang chạy. Nếu chưa bật, nó sẽ báo:
> `Không kết nối được ws://localhost:8080/ws (ECONNREFUSED)`.
> Đổi địa chỉ bằng biến môi trường `RELAY_URL`, ví dụ `$env:RELAY_URL="wss://ten-app.onrender.com/ws"; npm run test:relay`.

### 6. Đã kiểm thử những gì

| Hạng mục | Kết quả |
|---|---|
| Server phục vụ `/`, `/caro/`, `/snake/`, `/assets/*` | ✅ 200, đúng `Content-Type` |
| `GET /healthz` | ✅ `{"ok":true,"rooms":N}` |
| Tạo phòng → vào phòng → `peer` hai chiều | ✅ |
| Nước đi A→B và B→A | ✅ quân cờ hiện đúng màu, đúng ô |
| Xin ván mới (`restart`) lan sang đối thủ | ✅ bàn cờ hai bên cùng reset |
| Thắng 5 quân liên tiếp khi online | ✅ hiện “Bạn thắng!”, tô sáng 5 quân, không cộng điểm local |
| Đồng hồ mỗi lượt 30s/60s/120s (offline) | ✅ đếm ngược, 10s cuối vàng, 5s cuối đỏ + tick, hết giờ hiện overlay thua |
| Đồng hồ online: tạo phòng kèm `turnTime` | ✅ người vào phòng nhận đúng giới hạn của phòng |
| Đồng hồ online: đổi giới hạn (`config`) | ✅ cả hai bên đổi theo, có thông báo |
| Đồng hồ online: một bên hết giờ | ✅ bên hết giờ thấy “Bạn hết giờ”, bên kia thấy “Đối thủ hết giờ” (không lệch kết quả) |
| Đối thủ rời phòng | ✅ hiện “Đối thủ đã rời phòng”, khoá bàn chờ người mới |
| Mở link mời `?room=CODE` | ✅ tự vào phòng |
| Chặn `../` (path traversal) | ✅ trả 403 |
| Chặn truy cập `/server/**` (mã nguồn, `node_modules`) | ✅ trả 403 |
| Chặn file ẩn (`.gitignore`, `.env`, `.git`) | ✅ trả 403 |
| Snake 6 màn + âm thanh + canvas | ✅ |

### 7. Việc còn lại (nếu muốn nâng cấp)

- (Tuỳ chọn) Chống gian lận: server giữ bàn cờ và kiểm tra luật thay vì chỉ chuyển tiếp.
- (Tuỳ chọn) Ghép phòng tự động (matchmaking) thay vì chia mã thủ công.
- (Tuỳ chọn) Xem lại lịch sử nước đi / chat trong phòng.
- (Tuỳ chọn) Thêm game thứ ba vào `assets/games.js` (2048 / Memory đang để “Sắp ra mắt”).

## Ghi chú kỹ thuật

- **Không dùng ES modules** — mọi file JS gắn vào `window` (`window.Sound`, `window.GAMES`, `window.CaroAI`, `window.CaroNet`) và nạp bằng `<script>` thường, nhờ vậy mở bằng `file://` vẫn chạy.
- **Server tĩnh an toàn**: mọi đường dẫn được resolve trong `web-game/`; `../` bị chặn, thư mục `server/` và các file ẩn (`.` prefix) luôn trả 403.
- **Âm thanh tổng hợp hoàn toàn** bằng Web Audio API (oscillator + noise buffer) → không có file `.mp3` nào, tải trang cực nhẹ.
- **Snake** vẽ bằng Canvas 2D, có nội suy chuyển động + `devicePixelRatio` cho màn hình Retina.
- **Caro** dùng DOM grid (225 ô) để tận dụng CSS animation / hover, nhẹ hơn Canvas cho bàn cờ nhỏ.
- **Đồng hồ caro**: mỗi client tự đếm bằng `performance.now()` (server không giữ giờ). Chỉ người đang đến lượt mới gửi `timeout`, nên hai bên không bao giờ ra kết quả lệch nhau; đổi giới hạn thời gian được lan sang đối thủ qua `config`.

## Tuỳ chỉnh nhanh

Tuỳ chỉnh rắn — đầu file `snake/script.js`:

```js
const COLS = 20;        // số ô ngang/dọc
const MIN_SPEED = 60;   // ms mỗi bước, nhỏ hơn = nhanh hơn
// mỗi màn trong mảng LEVELS có: name, target, speed, step, hue, walls
```

Tuỳ chỉnh caro — đầu file `caro/script.js`:

```js
const SIZE = 15;               // kích thước bàn
const WIN_LEN = 5;             // số quân liền nhau để thắng
const AI_DELAY = 260;          // độ "suy nghĩ" của máy (ms)
const TURN_TIMES = [0, 30, 60, 120]; // các mức giới hạn thời gian mỗi lượt (0 = không giới hạn)
```

> Nếu đổi `TURN_TIMES`, nhớ sửa `TURN_TIMES` trong `server/server.js` và thêm nút
> `<button class="time-btn" data-time="...">` tương ứng trong `caro/index.html`.
> Server chỉ chấp nhận các mức nằm trong danh sách của nó (giá trị lạ bị đưa về `0`).
