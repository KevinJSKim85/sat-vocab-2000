/* router.js — hash-based routing. Routes:
 *   #/home
 *   #/study/:day
 *   #/quiz/:day
 *   #/lists
 */
(function () {
  "use strict";

  function parseHash() {
    var h = location.hash.replace(/^#/, "");
    if (!h || h === "/") return { name: "home", params: [] };
    var parts = h.split("/").filter(Boolean); // e.g. ["study","1"]
    return { name: parts[0], params: parts.slice(1) };
  }

  function route() {
    var root = document.getElementById("app");
    var V = window.Views || {};
    var r = parseHash();

    window.speechSynthesis && window.speechSynthesis.cancel();
    window.scrollTo(0, 0);

    switch (r.name) {
      case "home":
        V.home(root);
        break;
      case "study":
        V.study(root, r.params[0]);
        break;
      case "quiz":
        V.quiz(root, r.params[0]);
        break;
      case "lists":
        V.lists(root);
        break;
      default:
        location.hash = "#/home";
    }
  }

  window.Router = { start: function () {
    window.addEventListener("hashchange", route);
    if (!location.hash) location.replace("#/home");
    route();
  }};
})();
