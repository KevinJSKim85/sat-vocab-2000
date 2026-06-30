/* app.js — bootstrap. Waits for DOM + data, then starts the router. */
(function () {
  "use strict";
  function boot() {
    if (!window.DAYS) {
      document.getElementById("app").textContent = "Data failed to load.";
      return;
    }
    window.Router.start();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
