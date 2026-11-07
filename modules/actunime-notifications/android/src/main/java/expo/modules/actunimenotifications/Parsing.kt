package expo.modules.actunimenotifications

import org.json.JSONArray
import org.json.JSONObject

object Parsing {
  /** Une notification de l'API ; `null` si l'identifiant ou la date manquent. L'API renvoie `id` (et parfois `_id`). */
  fun notificationOf(json: JSONObject): IncomingNotification? {
    val id = json.optString("id").ifEmpty { json.optString("_id") }
    val createdAt = json.optString("createdAt")
    if (id.isEmpty() || createdAt.isEmpty()) return null
    return IncomingNotification(
      id = id,
      title = json.optString("title").ifEmpty { "Actunime" },
      description = json.optString("description"),
      link = json.optString("link").takeIf { it.isNotEmpty() && it != "null" },
      createdAt = createdAt,
      updatedAt = json.optString("updatedAt").ifEmpty { createdAt },
    )
  }

  fun notificationsOf(results: JSONArray): List<IncomingNotification> =
    (0 until results.length()).mapNotNull { notificationOf(results.getJSONObject(it)) }

  /** Notifications à annoncer : plus récentes que la dernière traitée, de la plus ancienne à la plus récente. */
  fun newerThan(items: List<IncomingNotification>, baseline: String?): List<IncomingNotification> =
    items.filter { baseline == null || it.updatedAt > baseline }.sortedBy { it.updatedAt }
}
