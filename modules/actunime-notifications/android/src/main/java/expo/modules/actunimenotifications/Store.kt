package expo.modules.actunimenotifications

import android.content.Context

/**
 * Réglages et jeton partagés entre l'app, la tâche périodique et le service. Le jeton d'accès est celui de l'app,
 * copié ici à chaque connexion ou renouvellement ; la partie native ne le renouvelle jamais (une seule source du
 * renouvellement, pour ne pas invalider le jeton de renouvellement qui tourne à chaque usage).
 */
class Store(context: Context) {
  private val prefs = context.applicationContext.getSharedPreferences("actunime_notifications", Context.MODE_PRIVATE)

  var apiUrl: String?
    get() = prefs.getString("apiUrl", null)
    set(value) = prefs.edit().putString("apiUrl", value).apply()

  var accessToken: String?
    get() = prefs.getString("accessToken", null)
    set(value) = prefs.edit().putString("accessToken", value).apply()

  /** Échéance du jeton d'accès, en millisecondes ; 0 si inconnue. */
  var expiresAt: Long
    get() = prefs.getLong("expiresAt", 0L)
    set(value) = prefs.edit().putLong("expiresAt", value).apply()

  var polling: Boolean
    get() = prefs.getBoolean("polling", true)
    set(value) = prefs.edit().putBoolean("polling", value).apply()

  var instant: Boolean
    get() = prefs.getBoolean("instant", false)
    set(value) = prefs.edit().putBoolean("instant", value).apply()

  /** Date de création (ISO) de la dernière notification déjà traitée : seules les plus récentes sont annoncées. */
  var baseline: String?
    get() = prefs.getString("baseline", null)
    set(value) = prefs.edit().putString("baseline", value).apply()

  fun tokenUsable(now: Long = System.currentTimeMillis()): Boolean =
    !accessToken.isNullOrEmpty() && !apiUrl.isNullOrEmpty() && (expiresAt == 0L || expiresAt > now)

  /** Annonce une notification une seule fois, même si l'interrogation et la socket la voient toutes les deux. */
  @Synchronized
  fun firstTimeSeen(id: String): Boolean {
    val seen = prefs.getString("seen", "")!!.split(',').filter { it.isNotEmpty() }.toMutableList()
    if (seen.contains(id)) return false
    seen.add(id)
    prefs.edit().putString("seen", seen.takeLast(60).joinToString(",")).apply()
    return true
  }

  fun clearSession() {
    prefs.edit().remove("apiUrl").remove("accessToken").remove("expiresAt").remove("baseline").remove("seen").apply()
  }
}
