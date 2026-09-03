/**
 * Boot screen shown briefly before the router takes over: the brand mark on
 * the ambient backdrop, nothing else.
 */
var SplashPage = (function () {
  function render() {
    document.getElementById('app').innerHTML =
      '<div class="splash-page">' +
      '<img class="splash-logo" src="assets/logo-onedxd.svg" alt="One DxD" />' +
      '<div class="splash-footer">from Dizzgo</div>' +
      '</div>';
  }

  return { render: render };
})();
