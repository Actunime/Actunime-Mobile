package expo.modules.actunimeadblock

import android.os.Handler
import android.os.Looper
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import com.reactnativecommunity.webview.RequestFilter
import java.io.File
import java.util.concurrent.atomic.AtomicInteger
import kotlin.concurrent.thread

private const val TAG = "ActunimeAdblock"
private const val BRIDGE_NAME = "ActunimeShield"
private const val STATS_THROTTLE_MS = 400L

/**
 * Chargement du moteur, filtrage des requêtes de la WebView et masquage cosmétique des pages.
 * [onBlocked] reçoit le nombre de requêtes bloquées sur la page courante (hors thread principal).
 */
class AdblockEngine(
  private val directory: File,
  private val onBlocked: (pageUrl: String, count: Int) -> Unit,
) : RequestFilter.Delegate {
  @Volatile var ready = false
    private set

  @Volatile var enabled = true

  private val blockedOnPage = AtomicInteger(0)
  @Volatile private var currentPage = ""
  private val main = Handler(Looper.getMainLooper())
  @Volatile private var statsPending = false
  private val lists = FilterLists(File(directory, "lists"))
  private val cache = File(directory, "engine.dat")

  /** Charge le moteur en arrière-plan : cache sérialisé d'abord (démarrage rapide), puis mise à jour des listes. */
  fun start() {
    thread(name = "actunime-adblock-load") {
      try {
        val cached = cache.takeIf(File::exists)?.readBytes()
        if (cached != null && AdblockNative.loadSerialized(cached)) ready = true
        if (lists.isStale() && lists.refresh() || !ready) rebuild()
      } catch (e: Exception) {
        Log.w(TAG, "Chargement du moteur impossible", e)
      }
    }
  }

  /** Retélécharge les listes (même fraîches) puis reconstruit le moteur. */
  fun refresh() {
    thread(name = "actunime-adblock-refresh") {
      lists.refresh(force = true)
      rebuild()
    }
  }

  private fun rebuild() {
    val texts = lists.readAll()
    if (texts.isEmpty()) return
    if (!AdblockNative.load(texts.toTypedArray())) return
    ready = true
    AdblockNative.serialize()?.let { cache.writeBytes(it) }
  }

  override fun shouldBlock(url: String, pageUrl: String, accept: String?, isMainFrame: Boolean): Boolean {
    // Les navigations de premier niveau ne sont jamais bloquées : on ne remplace pas une page par du vide.
    if (!enabled || !ready || isMainFrame) return false
    val blocked = AdblockNative.shouldBlock(url, pageUrl, RequestTypes.classify(url, accept, isMainFrame))
    if (blocked) {
      blockedOnPage.incrementAndGet()
      scheduleStats()
    }
    return blocked
  }

  private fun scheduleStats() {
    if (statsPending) return
    statsPending = true
    main.postDelayed({
      statsPending = false
      onBlocked(currentPage, blockedOnPage.get())
    }, STATS_THROTTLE_MS)
  }

  override fun onWebViewCreated(view: WebView) {
    if (!WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) return
    view.addJavascriptInterface(CosmeticBridge(), BRIDGE_NAME)
    WebViewCompat.addDocumentStartJavaScript(view, COSMETIC_SCRIPT, setOf("*"))
  }

  override fun onPageStarted(view: WebView, url: String) {
    currentPage = url
    blockedOnPage.set(0)
    onBlocked(url, 0)
  }

  /** Appelé par le script de début de document : sélecteurs à masquer pour l'adresse de la page. */
  private inner class CosmeticBridge {
    @JavascriptInterface
    fun cosmetic(url: String): String? = if (enabled && ready) AdblockNative.cosmetic(url) else null
  }

  private companion object {
    /** Masque les éléments publicitaires dès le début du document, avant que la page ne s'affiche. */
    const val COSMETIC_SCRIPT = """
      (function () {
        try {
          var raw = window.$BRIDGE_NAME && window.$BRIDGE_NAME.cosmetic(location.href);
          if (!raw) return;
          var hide = JSON.parse(raw).hide || [];
          if (!hide.length) return;
          var css = '';
          for (var i = 0; i < hide.length; i += 100) {
            css += hide.slice(i, i + 100).join(',') + '{display:none!important}\n';
          }
          var style = document.createElement('style');
          style.textContent = css;
          (document.head || document.documentElement).appendChild(style);
        } catch (e) {}
      })();
    """
  }
}
