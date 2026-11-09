(function () {
  function fit() {
    var vv = window.visualViewport;
    var width = vv && vv.width ? vv.width : window.innerWidth;
    document.documentElement.style.setProperty("--im-viewport", Math.max(1, Math.round(width)) + "px");
  }
  fit();
  window.addEventListener("resize", fit);
  if (window.visualViewport) window.visualViewport.addEventListener("resize", fit);
})();
