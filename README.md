# 🎮 Mini Game Hub

Sân chơi nhỏ gồm nhiều game, tất cả viết bằng **HTML + CSS + JavaScript thuần** — không build, không framework, không cần `npm install` để chơi.

Mở `web-game/index.html` bằng trình duyệt là chơi được ngay.

## Danh sách game

| Game | Trạng thái | Mô tả |
|---|---|---|
| 🐍 Rắn săn mồi | ✅ Sẵn sàng | 6 màn, có tường chắn, âm thanh, đồ họa neon |
| ⚫ Cờ caro | ✅ Sẵn sàng | Bàn 15×15, đấu máy (3 độ khó), 2 người, **online** (mã phòng) |
| ♟️ Cờ vua | ✅ Sẵn sàng | Bàn 8×8, đủ luật (phong cấp, nhập thành, bắt tốt qua đường), đấu máy (3 độ khó), 2 người, **online** |
| 🏮 Cờ tướng | ✅ Sẵn sàng | Bàn 9×10 có sông và cung, đấu máy (3 độ khó), 2 người, **online** |
| ⚡ Phản Xạ Ngoại Ngữ | ✅ Sẵn sàng | 2 chế độ: **Học** 12 chủ đề · 336 từ/câu (Anh **và** Trung) và **Chơi** phản xạ 3 cấp độ × 3 màn, 7 kiểu câu hỏi; 🇨🇳 hiện chữ Hán + pinyin, gõ pinyin có dấu hay không dấu đều đúng |
| 🔢 2048 | 🚧 Sắp có | — |
| 🃏 Lật thẻ | 🚧 Sắp có | — |

Cả 3 game cờ đều có **giới hạn thời gian mỗi lượt** (`30s` / `60s` / `120s` / `Không`) — hết giờ là thua ván đó.

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
│   ├── audio.js        # Thư viện âm thanh tổng hợp (Web Audio API)
│   ├── net.js          # ⭐ Online qua relay WebSocket (dùng chung, theo game)
│   ├── p2p.js          # ⭐ Online ngang hàng WebRTC — KHÔNG cần server
│   ├── clock.js        # ⭐ Đồng hồ đếm ngược mỗi lượt (dùng chung)
│   ├── online.js       # ⭐ Bảng "🌐 Online" + kết nối (dùng chung)
│   └── online.css      # ⭐ Giao diện bảng Online + thanh thời gian + clock
├── snake/              # 🐍 Game rắn
│   ├── index.html
│   ├── style.css
│   └── script.js
├── caro/               # ⚫ Cờ caro
│   ├── index.html
│   ├── style.css
│   ├── script.js       # Luật chơi + giao diện
│   ├── ai.js           # Máy đánh cờ (easy / normal / hard)
│   ├── net.js          # Online qua relay WebSocket (tuỳ chọn)
│   └── p2p.js          # Online ngang hàng WebRTC — KHÔNG cần server
├── chess/              # ♟️ Cờ vua
│   ├── index.html
│   ├── style.css
│   ├── script.js       # Giao diện + điều khiển + online + đồng hồ
│   └── engine.js       # Luật cờ vua + AI minimax (alpha-beta)
├── xiangqi/            # 🏮 Cờ tướng
│   ├── index.html
│   ├── style.css
│   ├── script.js       # Giao diện + điều khiển + online + đồng hồ
│   └── engine.js       # Luật cờ tướng + AI minimax (alpha-beta)
├── reflex/             # ⚡ Phản Xạ Ngoại Ngữ
│   ├── index.html
│   ├── style.css
│   ├── data.js         # ⭐ Nội dung chơi: ngôn ngữ, cấp độ, màn, câu hỏi
│   ├── lessons.js      # ⭐ Nội dung học: 12 chủ đề × 3 cấp độ (336 từ/câu)
│   ├── lessons-zh.js   # 🇨🇳 Nội dung học tiếng Trung: 12 chủ đề × 3 cấp độ (336 mục)
│   ├── pinyin.js       # Tiện ích pinyin: bỏ dấu, chấp nhận ü/v, mặt nạ gợi ý
│   └── script.js       # Luật chơi: đồng hồ, tính điểm, mạng, mở khoá màn, chế độ Học
└── server/             # Server Node.js: web tĩnh + relay online (tuỳ chọn)
    ├── package.json
    ├── server.js
    └── _test-relay.js  # Script kiểm thử giao thức
```

## Cách chạy trên máy

**Cách 1 — mở trực tiếp (chơi offline + online P2P)**

Double-click `web-game/index.html`. Mọi game chạy được vì không dùng ES modules.
Chế độ online **⚡ P2P** cũng chạy được ngay, không cần server (cần mạng Internet).

**Cách 2 — chạy server Node.js (có thêm relay WebSocket)**

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

**Chơi online:** chọn `🌐 Online` → giữ nút **⚡ P2P** (mặc định, không cần server) → **Tạo phòng** → **📋 Copy link mời** → gửi link cho bạn. Người mở link được tự động vào phòng và cầm quân Trắng. Nếu mạng chặn P2P thì bấm **🖥 Server riêng** và deploy `server/` (xem mục *Chơi online với bạn*).

## Cờ vua — luật & điều khiển

- Bàn **8×8**, đủ luật: **phong cấp**, **nhập thành**, **bắt tốt qua đường**, chiếu bí / hết nước đi / hòa 50 nước.
- Chế độ: **Đấu với máy** (bạn cầm Trắng), **2 người cùng máy**, hoặc **🌐 Online**.
- Độ khó: `Dễ` / `Thường` / `Khó` (minimax alpha-beta, càng khó càng tính sâu).

| Phím | Tác dụng |
|---|---|
| Click / chạm vào quân rồi tới ô đích | Đi quân |
| `U` | Hoàn tác (không dùng được khi online) |
| `R` | Ván mới (online: báo cả đối thủ) |
| `M` | Bật / tắt âm thanh |

Điểm thắng lưu trong `localStorage` (`chess-score`) — **không** cộng điểm khi chơi online.

## Cờ tướng — luật & điều khiển

- Bàn **9×10** có **sông** và **cung**, Tướng không được lộ mặt, hết nước đi là thua.
- Chế độ: **Đấu với máy** (bạn cầm Đỏ), **2 người cùng máy**, hoặc **🌐 Online**.
- Độ khó: `Dễ` / `Thường` / `Khó`.

| Phím | Tác dụng |
|---|---|
| Click / chạm vào quân rồi tới ô đích | Đi quân |
| `U` | Hoàn tác (không dùng được khi online) |
| `R` | Ván mới (online: báo cả đối thủ) |
| `M` | Bật / tắt âm thanh |

Điểm thắng lưu trong `localStorage` (`xiangqi-score`).

## Phản Xạ Ngoại Ngữ — học từ vựng bằng phản xạ

Hiện từ / câu bằng **tiếng Việt**, bạn phải gõ đáp án bằng **ngoại ngữ** trước khi đồng hồ về 0.

- **3 cấp độ**: `Cơ bản` (20s/câu) · `Trung cấp` (15s/câu) · `Nâng cao` (11s/câu).
- Mỗi cấp có **3 màn × 8 câu**; qua màn mới mở màn tiếp theo (mỗi cấp khoá riêng).
- **3 mạng** cho mỗi màn. Sai hoặc hết giờ: mất 1 mạng và hiện đáp án đúng. Hết mạng → `Hết lượt 😢`.
- **Điểm**: 50 điểm cơ bản + tối đa 50 điểm thưởng tốc độ + 10 điểm mỗi câu trong chuỗi (tối đa +50).
- **💡 Gợi ý**: mở gợi ý của câu, trừ 3 giây (mỗi câu chỉ 1 lần).
- Không phân biệt hoa/thường, có/không dấu câu; bỏ qua khác biệt `a/an/the` và tha 1 lỗi gõ cho từ dài (≥ 6 ký tự).

**7 kiểu câu hỏi** (khai báo bằng trường `k`):

| `k` | Hiển thị | Cách trả lời |
|---|---|---|
| `word` | Từ tiếng Việt | Gõ từ ngoại ngữ |
| `sentence` | Câu tiếng Việt | Gõ cả câu |
| `gap` | Câu ngoại ngữ có chỗ trống `___` | Gõ từ còn thiếu (gợi ý luôn hiện) |
| `question` | Câu hỏi ngoại ngữ | Gõ câu trả lời |
| `open` | Câu hỏi mở | Gõ câu tự do (≥ 2 từ) — luôn được tính đúng |
| `choice` | Câu hỏi + 4 lựa chọn | Bấm đáp án đúng |
| `listen` | Phát âm bằng giọng máy (🔊) | Nghe rồi gõ lại |

**Phím tắt**: `Enter` gửi câu trả lời · `Tab` tới nút Gợi ý · `Esc` về chọn màn (trong phần Học: `Esc` lùi từng bước Chủ đề → Danh sách chủ đề → menu).

**localStorage**: `reflex-progress` (điểm kỷ lục + màn đã qua), `reflex-lang` (ngôn ngữ đang chọn), `reflex-last` (vị trí chơi gần nhất), `reflex-learned` (các mục đã thuộc), `reflex-study` (chủ đề / cấp độ / ẩn nghĩa gần nhất).

### 📚 Học từ vựng theo chủ đề

Tab **📚 Học từ vựng** mở thư viện từ vựng song ngữ (ngoại ngữ ↔ Việt) để học trước, rồi luyện lại bằng chính bộ từ đó. Có **2 ngôn ngữ**: 🇬🇧 English và 🇨🇳 中文 (chữ Hán + pinyin).

- **12 chủ đề**: Gia đình · Giao tiếp hằng ngày · Trường học & học tập · Công việc & văn phòng · Môi trường & thiên nhiên · Du lịch & di chuyển · Ẩm thực & nhà hàng · Sức khỏe & cơ thể · Công nghệ & internet · Cảm xúc & tính cách · Mua sắm & tiền · Thể thao & giải trí.
- Mỗi chủ đề có **3 cấp độ**: `Cơ bản` (10 từ) · `Trung cấp` (10 từ) · `Nâng cao` (8 câu) → **28 mục/chủ đề, 336 mục** tổng cộng.
- Thẻ từ hiển thị **chữ ngoại ngữ** (Anh hoặc **chữ Hán**), **phiên âm** (IPA hoặc **pinyin**) và **nghĩa tiếng Việt**.
- Hai nút **🇬🇧 English / 🇨🇳 中文** ở đầu màn Học để đổi ngôn ngữ; tiến độ, cấp độ đang chọn và từ đã thuộc được ghi nhớ **riêng cho từng ngôn ngữ**.
- Bấm vào thẻ để **ẩn / hiện nghĩa** từng thẻ; bấm **🙈 Ẩn nghĩa** để ẩn toàn bộ (chế độ tự kiểm tra).
- **🔊** đọc to từ/câu bằng giọng máy (tiếng Anh dùng `en-US`, tiếng Trung dùng `zh-CN`); **✓** đánh dấu **đã thuộc** (lưu vào `reflex-learned`, thanh tiến độ và % từng chủ đề cập nhật ngay).
- **🔍 Tìm kiếm** theo tiếng Anh, tiếng Việt (không cần dấu), **chữ Hán** hoặc **pinyin** (`mama`, `jiā`, `妈妈` đều tìm được).
- **✓ Đánh dấu đã thuộc tất cả** / **↺ Bỏ đánh dấu tất cả** cho nhanh.
- **🎯 Luyện chủ đề này**: tạo ngay một lượt chơi 12 câu từ đúng cấp độ đang học (20s / 15s / 11s mỗi câu) — câu hỏi tự trộn kiểu *gõ từ*, *gõ câu* và *chọn đáp án*; kết thúc có `↺ Luyện lại` và `← Về phần Học`.
- **🔀 Luyện tổng hợp 12 chủ đề**: trộn ngẫu nhiên từ vựng của cả 12 chủ đề.
- Lượt luyện theo chủ đề **không** ảnh hưởng điểm kỷ lục / màn đã mở của chế độ Chơi.

### 🇨🇳 Tiếng Trung & pinyin

Chọn 🇨🇳 **中文** ở menu (chế độ Chơi) hoặc ở đầu tab Học. Mọi từ/câu tiếng Trung đều hiện **chữ Hán + pinyin + nghĩa tiếng Việt**.

- Khi câu hỏi bằng tiếng Việt, bạn gõ **pinyin** — và **gõ chữ Hán cũng được**.
- Pinyin **có dấu** (`nǐ hǎo`) và **không dấu** (`ni hao`) đều tính đúng; gõ liền không khoảng trắng (`nihao`) cũng đúng.
- `ü` có thể gõ là `u` hoặc `v` (`nǚ` → `nu` / `nv`).
- 💡 Gợi ý hiện **mặt nạ pinyin** (`m…`, `j… j…`) kèm ghi chú, không lộ đáp án.
- Sai / hết giờ sẽ hiện đáp án dạng `猫 · māo`.
- Pinyin được sinh tự động bởi `reflex/pinyin.js` (`ReflexPinyin.answers(pinyin)`), nên không cần khai báo từng biến thể không dấu.

### Thêm chủ đề / từ vựng mới

- Tiếng Anh: mở `reflex/lessons.js`, thêm object vào mảng `topics`.
- Tiếng Trung: mở `reflex/lessons-zh.js`, thêm object vào mảng `topics` với helper `z(chữ Hán, pinyin, nghĩa)` và `p(chữ Hán, pinyin, nghĩa)` cho câu.

Ví dụ tiếng Anh:

```js
T("music", "🎵", "Âm nhạc", "Nhạc cụ, thể loại, ca sĩ", [
  L("basic", "Cơ bản", [
    e("guitar", "đàn ghi-ta", "/ɡɪˈtɑːr/"),
    e("singer", "ca sĩ", "/ˈsɪŋ.ər/"),
  ]),
  L("medium", "Trung cấp", [ e("melody", "giai điệu") ]),
  L("hard", "Nâng cao", [ p("Can you play the piano?", "Bạn có biết chơi piano không?") ]),
]);
```

- `e(en, vi, ipa?)` = một từ; `p(en, vi)` = một câu (dùng `phrase: true`, không cần IPA).
- Tiếng Trung: `z(zh, pinyin, vi)` = một từ, `p(zh, pinyin, vi)` = một câu — hậu tố pinyin cũng là đáp án gợi ý khi luyện.
- `T(id, icon, name, desc, levels)` = chủ đề; `L(id, name, items)` = cấp độ (`basic` / `medium` / `hard` là quy ước thời gian 20s / 15s / 11s).
- Không cần sửa `script.js`: danh sách chủ đề, tiến độ, tìm kiếm và chế độ luyện tự cập nhật theo dữ liệu.

### Thêm ngôn ngữ mới

Toàn bộ nội dung nằm trong `reflex/data.js` — **không cần sửa `script.js`**. Thêm một object vào mảng `packs`:

```js
{
  id: "jp",
  flag: "🇯🇵",
  name: "Japanese",
  targetLabel: "tiếng Nhật",   // ngôn ngữ người chơi phải gõ
  sourceLabel: "tiếng Việt",   // ngôn ngữ của câu hỏi
  voice: "ja-JP",              // giọng đọc cho kiểu câu `listen`
  levels: [ /* basic / medium / hard, mỗi cấp 3 màn × 8 câu */ ],
}
```

Mỗi câu hỏi dùng một helper cho gọn:

```js
w("con mèo", "neko", "🐱")                 // word
s("Tôi thích ăn táo.", "ringo ga suki")    // sentence
g("Watashi wa ___ desu.", "gakusei", "học sinh")  // gap
qa("What is your name?", "My name is…")    // question
op("How old are you?", "I am twenty", "tuổi")     // open
mc("Từ nào có nghĩa là “nhà”?", ["ie","mizu","hon","sora"], "ie")  // choice
ls("neko", "🐱")                            // listen
```

Riêng **tiếng Trung** có thêm bộ helper chấp nhận cả chữ Hán lẫn pinyin:

```js
zh("con mèo", "猫", "māo", "🐱")           // word  → đáp án: 猫 / māo / mao
zs("Tôi thích ăn táo.", "我喜欢吃苹果。", "Wǒ xǐhuan chī píngguǒ.")  // sentence
zg("我___北京工作。", "在", "zài", "ở / tại")  // gap
zl("朋友", "péngyou")                       // listen

Khi `packs` có từ 2 phần tử trở lên, ô chọn ngôn ngữ **tự xuất hiện** ở menu.

## Đồng hồ & chơi online (cờ caro · cờ vua · cờ tướng)

Ba game cờ dùng **cùng một bộ module dùng chung** trong `assets/`, nên hành vi giống nhau hoàn toàn:

| Thành phần | Vai trò |
|---|---|
| `assets/net.js` (`window.GameNet`) | Relay online qua WebSocket (`?ws`) — mỗi game một kênh riêng |
| `assets/p2p.js` (`window.GameP2P`) | P2P WebRTC qua PeerJS — **không cần server** |
| `assets/clock.js` (`window.GameClock`) | Đồng hồ đếm ngược mỗi lượt, tự dừng khi không phải lượt mình |
| `assets/online.js` (`window.GameOnline`) | Bảng Online: chọn kiểu kết nối, tạo / vào phòng, link mời, trạng thái |

**Thanh `⏱ Mỗi lượt`** ngay trên bàn cờ có 4 lựa chọn — `30s`, `60s`, `120s`, `Không` (mặc định).

- Đồng hồ chạy từ **nước đi đầu tiên**, đếm ngược cho người đang đến lượt (lượt của máy AI không bị tính).
- 10 giây cuối thanh đổi màu vàng, 5 giây cuối đỏ + tiếng tick.
- **Hết giờ = thua ván đó.** Lựa chọn được nhớ trong `localStorage` (`<game>-turn-time`).
- Khi online: giới hạn do **người tạo phòng** quyết định, đổi giới hạn được báo cho đối thủ (`config`); chỉ bên hết giờ mới gửi `timeout` nên hai máy không bao giờ lệch kết quả.

**Vào phòng:** chọn `🌐 Online` → **⚡ P2P** (mặc định) hoặc **🖥 Server riêng** → **Tạo phòng** → **📋 Copy link mời** → gửi link (`.../<game>/?room=K7M2Q`).

- Người mở link **tự động vào phòng** và cầm bên đi sau (Đen); bàn cờ **tự lật 180°** để quân của họ ở phía dưới.
- Mọi nước đi, xin ván mới, đổi giới hạn thời gian đều được đồng bộ hai chiều; **hoàn tác bị tắt** khi online để tránh lệch trạng thái.
- Phòng thuộc về một game: vào nhầm mã của game khác sẽ báo *“Phòng này thuộc game khác”*.

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

**Muốn game mới có online + đồng hồ như 3 game cờ?** Không cần viết lại gì, chỉ cần:

```html
<link rel="stylesheet" href="../assets/online.css" />
<script src="../assets/clock.js"></script>
<script src="../assets/net.js"></script>
<script src="../assets/p2p.js"></script>
<script src="../assets/online.js"></script>
```

rồi copy khối `.online-panel` + `.time-bar` + `#clock` từ `chess/index.html` và gọi
`GameClock.create({...})` / `GameOnline.create({...})` như mục *Giao thức* ở trên
(xem `chess/script.js` làm mẫu — khoảng 60 dòng).

## Chơi online với bạn

Bảng **🌐 Online** (trong cờ caro, cờ vua và cờ tướng — cùng một bộ module `assets/`) có **2 kiểu kết nối** — bấm nút tương ứng ở hàng «Kết nối»:

| Kiểu | Cần gì | Khi nào dùng |
|---|---|---|
| **⚡ P2P (không cần server)** | Chỉ cần mạng Internet | Mặc định. Chạy được trên **GitHub Pages**, Vercel static, Netlify… vì hai máy nói chuyện trực tiếp với nhau qua WebRTC (thư viện PeerJS nạp từ CDN, broker công khai chỉ dùng để "bắt cặp"). |
| **🖥 Server riêng** | Một tiến trình Node chạy `server/server.js` | Khi muốn relay ổn định, chơi trong LAN không có Internet, hoặc mạng chặn WebRTC. Nhập địa chỉ `ws://…` / `wss://…` vào ô **Server**. |

Cả hai kiểu dùng **chung một giao thức tin nhắn** (`move`, `restart`, `config`, `timeout`, `peer`) nên luật chơi và đồng hồ hoạt động y hệt nhau.

### Cách dùng nhanh (P2P — không cần deploy gì)

1. Mở trang game (local hay `https://<tên-bạn>.github.io/mini-game-hub/chess/` đều được).
2. Chọn `🌐 Online` → giữ nút **⚡ P2P** → bấm **Tạo phòng** → nhận mã 5 ký tự (ví dụ `K7M2Q`).
3. Bấm **📋 Copy link mời** → gửi link (`.../<game>/?room=K7M2Q`) cho bạn.
4. Bạn mở link là **tự động vào phòng** và đi sau (cờ vua: Đen · cờ tướng: Đen · caro: Trắng) — bàn cờ của người vào sau được **lật 180°**.
5. Đổi mức thời gian (30s / 60s / 120s) ở bên tạo phòng sẽ được báo cho đối thủ.

> P2P phụ thuộc broker công khai của PeerJS và cần WebRTC. Nếu mạng công ty/trường chặn P2P, hãy chuyển sang **🖥 Server riêng**.
> Mã phòng P2P dùng tiền tố riêng theo game (`gmk-<game>-v1-<MÃ>`) nên phòng cờ vua và cờ tướng không bao giờ đụng nhau.

### Chế độ Server riêng (relay WebSocket)

Mô hình: **client tĩnh** + **relay server** (WebSocket) chuyển nước đi giữa 2 người. Server **không** chứa luật chơi — mỗi máy tự tính, server chỉ chuyển tiếp, nên rất nhẹ.

#### 1. Bật server local

```powershell
cd web-game/server
npm install
npm start
```

Sau đó mở **http://localhost:8080/**

Server này phục vụ luôn file web tĩnh (thư mục `web-game`) ở cổng 8080 và WebSocket ở đường dẫn `/ws`, nên không cần chạy thêm server tĩnh nào khác.

- `GET /` → trang chủ chọn game
- `GET /` → trang chủ chọn game
- `GET /caro/`, `/chess/`, `/xiangqi/` → từng game
- `GET /healthz` → `{"ok":true,"rooms":0}`
- `WS /ws` → relay chơi online (dùng chung cho cả 3 game)

### 2. Thử chơi online (kiểu Server riêng)

1. Trong bảng Online, bấm **🖥 Server riêng** rồi kiểm tra ô **Server** (mặc định đã đúng khi mở cùng domain).
2. Mở `http://localhost:8080/caro/` trên **hai tab** (hoặc hai máy trong cùng mạng LAN dùng `http://<IP-máy-bạn>:8080/caro/`).
3. Tab A: bấm **Tạo phòng** → nhận mã 5 ký tự (ví dụ `K7M2Q`) → **📋 Copy link mời** → dán link cho bạn.
4. Bạn của bạn mở link là **tự động vào phòng**, không cần nhập mã.
5. Tab A cầm **Đen** (đi trước), người vào sau cầm **Trắng**. Hai bên tự thấy nước đi của nhau.

Ô **Server** cho phép đổi địa chỉ relay; giá trị được ghi nhớ trong `localStorage` (`<game>-server-url`). Mặc định:

- mở bằng `file://` → `ws://localhost:8080/ws`
- mở bằng `http://` hoặc `https://` → cùng host với trang (`ws://` hoặc `wss://` + `/ws`)

### 3. Giao thức (`assets/net.js` cho relay, `assets/p2p.js` cho P2P — giống hệt nhau)

| Client → Server | Server → Client | Ý nghĩa |
|---|---|---|
| `{t:"create", turnTime, game}` | `{t:"created", room, player, game, turnTime}` | Tạo phòng, nhận mã 5 ký tự (kèm giới hạn thời gian + game) |
| `{t:"join", room, game}` | `{t:"joined", room, player, game, turnTime}` | Vào phòng bằng mã (sai game → `error`) |
| — | `{t:"peer", online}` | Đối thủ vào / rời phòng |
| `{t:"move", move:{from,to}, index}` | chuyển tiếp cho người còn lại | Đánh quân (payload trong suốt — server không hiểu luật) |
| `{t:"restart"}` | chuyển tiếp | Xin ván mới |
| `{t:"config", turnTime}` | `{t:"config", turnTime}` | Đổi giới hạn thời gian mỗi lượt (`0` = không giới hạn) |
| `{t:"timeout"}` | `{t:"timeout", player}` | Người đến lượt báo đã hết giờ (server tự điền ghế thật) |
| — | `{t:"error", message}` | Phòng không tồn tại / đã đủ / sai game |

> `move` được chuyển tiếp **nguyên vẹn**: caro gửi `{index}`, cờ vua gửi `{from,to,promo}`, cờ tướng gửi `{from,to}`.

Dùng `assets/net.js` (Server riêng) hoặc `assets/p2p.js` (P2P) — **API giống hệt nhau**:

```js
// Cách 1 — dùng transport trực tiếp (cờ caro đang làm như vậy)
await CaroNet.connect("wss://ten-server-cua-ban.onrender.com/ws");
const { room, player, turnTime } = await CaroNet.createRoom(60); // player = 1 | 2
CaroNet.on("move", ({ index, player }) => applyRemoteMove(index, player));

// Cách 2 — dùng bảng Online dựng sẵn (cờ vua / cờ tướng đang dùng)
const online = GameOnline.create({
  game: "chess",                                  // phân phòng theo game
  seatName: (seat) => (seat === 1 ? "Trắng" : "Đen"),
  els: { panel, serverRow, serverInput, roomInput, createBtn, joinBtn, shareBtn, leaveBtn, status, connBtns },
  getTurnTime: () => clock.turnTime,
  onReset: () => restart(false),
  onMove: (payload) => applyRemoteMove(payload),
  onRemoteRestart: () => restart(false),
  onRemoteConfig: (seconds) => clock.set(seconds, false),
  onRemoteTimeout: (seat) => applyRemoteTimeout(seat),
  onPeerChange: () => updateTurnUI(),
});
online.init();       // bind transport + nút bấm + khôi phục lựa chọn đã lưu
online.setActive(true); // hiện bảng khi chọn chế độ Online
online.joinRoom("K7M2Q"); // hoặc online.createRoom()
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

> 💡 **GitHub Pages / Netlify / Vercel static không chạy được WebSocket** — nhưng **không sao**: cờ caro online mặc định dùng **⚡ P2P (WebRTC)**, nên chỉ cần host tĩnh là chơi online được, không phải deploy `server/`. Chỉ khi mạng chặn P2P mới cần deploy thêm `server/` rồi chuyển sang **🖥 Server riêng**.

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
| **P2P (WebRTC): tạo phòng → vào phòng → 2 chiều** | ✅ chạy không cần server, mã phòng = Peer ID rút gọn |
| **P2P: đổi giới hạn thời gian / restart / hết giờ** | ✅ đồng bộ y như relay WebSocket |
| **P2P: đối thủ đóng tab** | ✅ hiện “Đối thủ đã rời phòng …” |
| **Chuyển qua lại ⚡ P2P ↔ 🖥 Server riêng** | ✅ nhớ lựa chọn trong `localStorage` (`<game>-conn-kind`) |
| Mở link mời `?room=CODE` | ✅ tự vào phòng |
| **Cờ vua online (relay WS)**: nước đi 2 chiều, `restart`, `config` | ✅ quân đi đúng ô ở cả hai máy, đồng hồ theo phòng |
| **Cờ vua online (P2P)**: tạo / vào phòng, nước đi 2 chiều, restart | ✅ chạy không cần server |
| **Cờ vua online: bàn cờ lật cho người vào sau** | ✅ toạ độ (`a–h`, `1–8`) vẫn đúng sau khi lật |
| **Cờ vua online: hết giờ** | ✅ bên hết giờ “Bạn hết giờ 😢”, bên kia “Đối thủ hết giờ 🎉”, không cộng điểm |
| **Cờ tướng online (relay WS)**: nước đi 2 chiều, `config` | ✅ bàn 9×10 lật đúng, quân hai bên khớp |
| **Cờ tướng online: hết giờ ở ghế người vào sau** | ✅ hai bên ra cùng một kết quả (Đỏ thắng) |
| Chơi offline (AI / 2 người) sau khi thêm online | ✅ không hồi quy: AI trả lời, hoàn tác, điểm vẫn lưu |
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

- **Không dùng ES modules** — mọi file JS gắn vào `window` (`window.Sound`, `window.GAMES`, `window.CaroAI`, `window.CaroNet`, `window.GameNet`, `window.GameP2P`, `window.GameClock`, `window.GameOnline`, `window.ChessEngine`, `window.XiangqiEngine`) và nạp bằng `<script>` thường, nhờ vậy mở bằng `file://` vẫn chạy.
- **Server tĩnh an toàn**: mọi đường dẫn được resolve trong `web-game/`; `../` bị chặn, thư mục `server/` và các file ẩn (`.` prefix) luôn trả 403.
- **Âm thanh tổng hợp hoàn toàn** bằng Web Audio API (oscillator + noise buffer) → không có file `.mp3` nào, tải trang cực nhẹ.
- **Snake** vẽ bằng Canvas 2D, có nội suy chuyển động + `devicePixelRatio` cho màn hình Retina.
- **Caro** dùng DOM grid (225 ô) để tận dụng CSS animation / hover, nhẹ hơn Canvas cho bàn cờ nhỏ.
- **Cờ vua / cờ tướng** cũng dùng DOM grid (64 / 90 ô); luật + AI nằm trong `engine.js` riêng, `script.js` chỉ lo giao diện và đồng bộ online.
- **Online dùng chung**: `assets/net.js`, `assets/p2p.js`, `assets/clock.js`, `assets/online.js` là **factory** — mỗi game gọi `GameOnline.create({ game, els, getTurnTime, onMove, … })` và chỉ cần khai báo phần DOM + callback của mình. Nhờ vậy 3 game có hành vi online/đồng hồ giống nhau mà không copy code.
- **Đồng hồ**: mỗi client tự đếm bằng `performance.now()` (server không giữ giờ) và chỉ chạy khi `shouldRun()` đúng — lượt của máy AI và lượt của đối thủ không bị trừ giờ của bạn. Chỉ bên đang hết giờ mới gửi `timeout`, nên hai bên không bao giờ ra kết quả lệch nhau; đổi giới hạn thời gian được lan sang đối thủ qua `config`.
- **Đồng bộ nước đi online**: payload chỉ là `{from, to, promo?}` (chỉ số ô), bên nhận kiểm tra lại bằng `engine.genLegalMoves()` rồi mới áp dụng — sai lệch thì bỏ qua, không phá ván.

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

Tuỳ chỉnh cờ vua / cờ tướng — đầu file `chess/script.js` / `xiangqi/script.js`:

```js
const AI_DELAY = 220;          // độ "suy nghĩ" của máy (ms)
// độ sâu minimax nằm trong engine.js (DEPTH theo độ khó)
// các mức thời gian lấy từ GameClock.TIMES = [0, 30, 60, 120]
```

> Đổi mức thời gian cho **cả 3 game**: sửa `TIMES` trong `assets/clock.js` + `TURN_TIMES` trong
> `server/server.js`, rồi thêm/bớt nút `.time-btn[data-time]` trong `index.html` của từng game.
