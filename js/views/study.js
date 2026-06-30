/* views/study.js — #/study/:day : iOS-style flashcards */
(function () {
  "use strict";
  var S = window.Store;
  var el = S.el;

  function pad2(n) { return String(n).padStart(2, "0"); }

  function renderStudy(root, day) {
    var dayObj = S.getDay(day);
    if (!dayObj || !dayObj.words.length) {
      location.hash = "#/home";
      return;
    }

    var words = dayObj.words;
    var idx = 0;
    var flipped = false;

    root.innerHTML = "";
    var header = el("div", { class: "study-header" });
    var stage = el("div", { class: "card-stage" });
    var controlsWrap = el("div");
    root.appendChild(header);
    root.appendChild(stage);
    root.appendChild(controlsWrap);

    function drawHeader() {
      header.innerHTML = "";
      header.appendChild(el("a", { class: "back-chevron", href: "#/home", "aria-label": "Back to home" }, ["←"]));
      header.appendChild(el("div", {}, [
        el("div", { class: "study-title", text: dayObj.theme }),
        el("div", { class: "study-sub", text: pad2(idx + 1) + "/" + pad2(words.length) + " words" })
      ]));
      header.appendChild(el("div")); // right spacer to keep title centered
    }

    function drawCard() {
      var item = words[idx];
      stage.innerHTML = "";

      var front = el("div", { class: "face face-front" }, [
        el("div", { class: "front-word", text: item.w }),
        el("div", { class: "front-hint", text: "tap to flip" })
      ]);

      var defs = el("ol", { class: "back-defs" }, [
        el("li", {}, [el("span", { class: "num", text: "1." }), el("span", { text: item.en })]),
        el("li", {}, [el("span", { class: "num", text: "2." }), el("span", { class: "def-ko", text: item.ko })]),
        el("li", {}, [el("span", { class: "num", text: "3." }), el("span", { class: "def-ex", text: item.ex })])
      ]);

      var audioBtn = el("button", {
        class: "audio-btn",
        type: "button",
        "aria-label": "Pronounce " + item.w,
        onclick: function (e) { e.stopPropagation(); S.speak(item.w); }
      }, ["🔊"]);

      var back = el("div", { class: "face face-back" }, [
        el("div", { class: "back-word", text: item.w }),
        el("div", { class: "back-meta" }, [
          el("span", { class: "back-pos", text: item.pos }),
          el("span", { class: "back-ipa", text: "[ " + item.ipa + " ]" }),
          audioBtn
        ]),
        el("div", { class: "back-divider" }),
        defs
      ]);

      var card = el("div", { class: "flashcard" + (flipped ? " flipped" : "") }, [front, back]);
      card.addEventListener("click", function () {
        flipped = !flipped;
        card.classList.toggle("flipped", flipped);
      });

      attachSwipe(card);
      stage.appendChild(card);
    }

    function advance() {
      if (idx < words.length - 1) {
        idx++;
        flipped = false;
        drawHeader();
        drawCard();
      } else {
        showComplete();
      }
    }

    function mark(status) {
      S.setWordStatus(dayObj.day, words[idx].w, status);
      advance();
    }

    function drawControls() {
      controlsWrap.innerHTML = "";
      controlsWrap.appendChild(el("div", { class: "controls" }, [
        el("button", { class: "ctrl ctrl-side", type: "button", title: "Still learning", "aria-label": "Still learning", onclick: function () { mark("learning"); } }, ["×"]),
        el("button", { class: "ctrl ctrl-know", type: "button", title: "I know it", "aria-label": "I know it", onclick: function () { mark("known"); } }, ["✓"]),
        el("button", { class: "ctrl ctrl-side", type: "button", title: "Skip", "aria-label": "Skip", onclick: function () { advance(); } }, ["→"])
      ]));
      controlsWrap.appendChild(el("div", { class: "ctrl-label", text: "× still learning   ·   ✓ I know it   ·   → skip" }));
    }

    function showComplete() {
      header.innerHTML = "";
      stage.innerHTML = "";
      controlsWrap.innerHTML = "";
      var pct = S.learnedPct(dayObj);
      root.innerHTML = "";
      root.appendChild(el("div", { class: "study-header" }, [
        el("a", { class: "back-chevron", href: "#/home", "aria-label": "Back to home" }, ["←"]),
        el("div", {}, [el("div", { class: "study-title", text: dayObj.theme })]),
        el("div")
      ]));
      root.appendChild(el("div", { class: "complete" }, [
        el("h2", { text: "Day complete" }),
        el("p", { text: "You marked " + pct + "% of Day " + pad2(dayObj.day) + " as known." }),
        el("div", { class: "stack" }, [
          el("a", { class: "btn btn-primary btn-block", href: "#/quiz/" + dayObj.day, text: "Take the Day " + pad2(dayObj.day) + " quiz" }),
          el("a", { class: "btn btn-block", href: "#/study/" + dayObj.day, onclick: function () { setTimeout(function () { location.reload(); }, 0); }, text: "Study again" }),
          el("a", { class: "btn btn-block", href: "#/home", text: "Back to home" })
        ])
      ]));
    }

    // --- touch swipe ---
    function attachSwipe(card) {
      var startX = 0, startY = 0, moved = false;
      card.addEventListener("touchstart", function (e) {
        startX = e.touches[0].clientX; startY = e.touches[0].clientY; moved = false;
      }, { passive: true });
      card.addEventListener("touchmove", function (e) {
        if (Math.abs(e.touches[0].clientX - startX) > 10) moved = true;
      }, { passive: true });
      card.addEventListener("touchend", function (e) {
        var dx = e.changedTouches[0].clientX - startX;
        var dy = e.changedTouches[0].clientY - startY;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
          if (dx < 0) mark("learning"); // swipe left = still learning
          else mark("known");           // swipe right = know it
        }
      });
    }

    // --- keyboard ---
    function onKey(e) {
      if (!document.body.contains(stage)) { window.removeEventListener("keydown", onKey); return; }
      if (e.key === "ArrowRight") { advance(); }
      else if (e.key === "ArrowLeft") { mark("learning"); }
      else if (e.key === "ArrowUp" || e.key === "ArrowDown") { mark("known"); e.preventDefault(); }
      else if (e.key === " " || e.key === "Enter") {
        var card = stage.querySelector(".flashcard");
        if (card) { flipped = !flipped; card.classList.toggle("flipped", flipped); e.preventDefault(); }
      }
    }
    window.addEventListener("keydown", onKey);

    drawHeader();
    drawCard();
    drawControls();
  }

  window.Views = window.Views || {};
  window.Views.study = renderStudy;
})();
