/* views/home.js — #/home : 40-day challenge grid */
(function () {
  "use strict";
  var el = window.Store.el;

  function pad2(n) { return String(n).padStart(2, "0"); }

  function renderHome(root) {
    var S = window.Store;
    var frag = document.createDocumentFragment();

    frag.appendChild(el("header", { class: "topbar" }, [
      el("h1", { class: "app-title", text: "SAT 2000" }),
      el("p", { class: "app-subtitle", text: "Hard Vocabulary · 40-Day Challenge · 2000 words" })
    ]));

    frag.appendChild(el("div", { class: "home-actions" }, [
      el("a", { class: "pill-link", href: "#/lists", text: "Lists / Export" })
    ]));

    var grid = el("div", { class: "day-grid" });

    (window.DAYS || []).forEach(function (d) {
      var active = d.words.length > 0;
      var pct = S.learnedPct(d);

      if (active) {
        var card = el("a", { class: "day-card active", href: "#/study/" + d.day }, [
          el("div", { class: "day-num", text: "Day " + pad2(d.day) }),
          el("div", { class: "day-theme", text: d.theme }),
          el("div", { class: "day-theme-ko", text: d.theme_ko }),
          el("div", { class: "day-count", text: d.words.length + " words" }),
          el("div", { class: "progress-track" }, [
            el("div", { class: "progress-fill", style: "width:" + pct + "%" })
          ]),
          el("a", {
            class: "card-quiz-link",
            href: "#/quiz/" + d.day,
            onclick: function (e) { e.stopPropagation(); }
          }, ["Take quiz →"])
        ]);
        grid.appendChild(card);
      } else {
        grid.appendChild(el("div", { class: "day-card locked", "aria-disabled": "true" }, [
          el("span", { class: "lock-tag", text: "Soon" }),
          el("div", { class: "day-num", text: "Day " + pad2(d.day) }),
          el("div", { class: "day-theme", text: d.theme }),
          el("div", { class: "day-theme-ko", text: d.theme_ko }),
          el("div", { class: "day-count", text: "Coming soon" })
        ]));
      }
    });

    frag.appendChild(grid);

    root.innerHTML = "";
    root.appendChild(frag);
  }

  window.Views = window.Views || {};
  window.Views.home = renderHome;
})();
