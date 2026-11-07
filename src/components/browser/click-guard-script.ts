/**
 * Script injecté avant le contenu de chaque page : signale à l'application le dernier vrai clic de l'utilisateur
 * sur un lien visible. Le jeton, propre à l'onglet, empêche une page de falsifier ce signal ; `postMessage`
 * est copié avant tout script de la page. Un lien transparent ou qui couvre l'écran sans contenu compte pour
 * « pas un lien » (superposition publicitaire).
 */
export function clickGuardScript(token: string): string {
  return `(function () {
  var bridge = window.ReactNativeWebView;
  if (!bridge || window.__actGuardOn) return;
  window.__actGuardOn = true;
  var send = bridge.postMessage.bind(bridge);
  document.addEventListener('click', function (e) {
    if (!e.isTrusted) return;
    var href = null;
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (a) {
      var r = a.getBoundingClientRect();
      var cs = getComputedStyle(a);
      var w = Math.min(r.right, innerWidth) - Math.max(r.left, 0);
      var h = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
      var covers = w > 0 && h > 0 && w * h > 0.5 * innerWidth * innerHeight;
      var empty = !a.textContent.trim() && !a.querySelector('img,svg,picture,video,canvas');
      var hidden = parseFloat(cs.opacity) < 0.05 || cs.visibility === 'hidden';
      if (!hidden && !(covers && empty)) href = a.href;
    }
    send(JSON.stringify({ actunimeGuard: ${JSON.stringify(token)}, href: href }));
  }, true);
})(); true;`;
}
