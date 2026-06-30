/* store.js — localStorage helpers + small DOM/util shared across views.
 * Namespaced keys under "satv2000.*".
 */
(function () {
  "use strict";

  var NS = "satv2000.";

  function lsGet(key, fallback) {
    try {
      var raw = localStorage.getItem(NS + key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }
  function lsSet(key, value) {
    try {
      localStorage.setItem(NS + key, JSON.stringify(value));
    } catch (e) {
      /* quota / private mode — fail silently */
    }
  }

  // Per-day progress: { word: "known" | "learning" }
  function progressKey(day) { return "progress.day" + day; }
  function getProgress(day) { return lsGet(progressKey(day), {}); }
  function setWordStatus(day, word, status) {
    var p = getProgress(day);
    p[word] = status;
    lsSet(progressKey(day), p);
  }
  // % learned = words marked "known" / total words in day
  function learnedPct(dayObj) {
    if (!dayObj.words.length) return 0;
    var p = getProgress(dayObj.day);
    var known = 0;
    dayObj.words.forEach(function (w) { if (p[w.w] === "known") known++; });
    return Math.round((known / dayObj.words.length) * 100);
  }

  function getStudentName() { return lsGet("studentName", ""); }
  function setStudentName(name) { lsSet("studentName", name); }

  // ---- tiny DOM helpers ----
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "class") node.className = attrs[k];
        else if (k === "html") node.innerHTML = attrs[k];
        else if (k === "text") node.textContent = attrs[k];
        else if (k.slice(0, 2) === "on" && typeof attrs[k] === "function") {
          node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        } else if (attrs[k] != null && attrs[k] !== false) {
          node.setAttribute(k, attrs[k]);
        }
      });
    }
    (children || []).forEach(function (c) {
      if (c == null) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function getDay(n) {
    return (window.DAYS || []).find(function (d) { return d.day === Number(n); });
  }

  function speak(word) {
    try {
      if (!("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(word);
      u.lang = "en-US";
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    } catch (e) { /* unsupported */ }
  }

  var toastTimer = null;
  function toast(msg) {
    var t = document.getElementById("toast");
    if (!t) {
      t = el("div", { id: "toast", class: "toast" });
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 1400);
  }

  function todayStr() {
    var d = new Date();
    var mm = String(d.getMonth() + 1).padStart(2, "0");
    var dd = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + mm + "-" + dd;
  }

  window.Store = {
    getProgress: getProgress,
    setWordStatus: setWordStatus,
    learnedPct: learnedPct,
    getStudentName: getStudentName,
    setStudentName: setStudentName,
    el: el,
    escapeHtml: escapeHtml,
    getDay: getDay,
    speak: speak,
    toast: toast,
    todayStr: todayStr
  };
})();
