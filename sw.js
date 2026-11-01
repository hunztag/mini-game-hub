/* ============================================================
   SERVICE WORKER — Mini Game Hub
   ------------------------------------------------------------
   • Chỉ cache tài nguyên CÙNG NGUỒN (same-origin).
   • Chiến lược "network-first": luôn thử mạng trước để không bao
     giờ phục vụ bản cũ khi đang online; mất mạng mới dùng cache.
   • Không can thiệp vào request âm thanh TTS của máy khác nguồn
     (dict.youdao.com…) để khỏi làm hỏng phát âm.
   ============================================================ */
const CACHE = "game-hub-v2";

/* Trang + tài nguyên cần có để mở game khi offline */
const CORE = [
  "./index.html",
  "./manifest.webmanifest",
  "./assets/shared.css",
  "./assets/hub.css",
  "./assets/audio.js",
  "./assets/hub.js",
  "./assets/games.js",
  "./assets/icon.svg",
  "./reflex/index.html",
  "./reflex/style.css",
  "./reflex/script.js",
  "./reflex/data.js",
  "./reflex/lessons.js",
  "./reflex/lessons-zh.js",
  "./reflex/pinyin.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        // từng tài nguyên một: file nào thiếu cũng không làm hỏng cả lần cài
        Promise.allSettled(CORE.map((url) => cache.add(new Request(url, { cache: "reload" }))))
      )
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
      .catch(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try {
    url = new URL(req.url);
  } catch (_) {
    return;
  }
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) => {
          if (hit) return hit;
          if (req.mode === "navigate") {
            return caches.match("./index.html").then((page) => page || Response.error());
          }
          return Response.error();
        })
      )
  );
});
