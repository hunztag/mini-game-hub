/* ============================================================
   Hub: render danh sách game từ window.GAMES (assets/games.js)
   ============================================================ */
(() => {
  "use strict";

  const host = document.getElementById("games");
  const games = Array.isArray(window.GAMES) ? window.GAMES : [];

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };

  function buildCard(game) {
    const soon = game.status === "soon";
    const card = document.createElement(soon ? "div" : "a");

    card.className = `card${soon ? " soon" : ""}`;
    if (soon) {
      card.setAttribute("aria-disabled", "true");
    } else {
      card.href = game.href;
    }

    card.appendChild(el("div", "icon", game.icon));
    card.appendChild(el("h2", "", game.name));
    card.appendChild(el("p", "", game.desc));

    const tags = el("div", "tags");
    for (const t of game.tags || []) {
      tags.appendChild(el("span", `tag${t.color ? ` ${t.color}` : ""}`, t.text));
    }
    card.appendChild(tags);

    // Vệt sáng chạy theo con trỏ
    if (!soon) {
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${e.clientX - r.left}px`);
        card.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    }

    return card;
  }

  const fragment = document.createDocumentFragment();
  for (const game of games) fragment.appendChild(buildCard(game));
  host.appendChild(fragment);
})();
