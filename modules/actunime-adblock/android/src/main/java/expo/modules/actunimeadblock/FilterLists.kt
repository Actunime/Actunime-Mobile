package expo.modules.actunimeadblock

import java.io.File
import java.net.HttpURLConnection
import java.net.URL

/** Listes de filtres téléchargées à l'usage (rien n'est embarqué dans l'APK) et conservées sur le disque. */
class FilterLists(private val directory: File) {
  data class Source(val id: String, val url: String)

  companion object {
    val SOURCES = listOf(
      Source("easylist", "https://easylist.to/easylist/easylist.txt"),
      Source("easyprivacy", "https://easylist.to/easylist/easyprivacy.txt"),
      Source("ublock-filters", "https://ublockorigin.github.io/uAssets/filters/filters.min.txt"),
      Source("ublock-privacy", "https://ublockorigin.github.io/uAssets/filters/privacy.min.txt"),
      Source("ublock-unbreak", "https://ublockorigin.github.io/uAssets/filters/unbreak.min.txt"),
      Source("liste-fr", "https://easylist-downloads.adblockplus.org/liste_fr.txt"),
    )
    const val MAX_AGE_MS = 7L * 24 * 60 * 60 * 1000
    private const val TIMEOUT_MS = 20_000
  }

  init {
    directory.mkdirs()
  }

  private fun file(source: Source) = File(directory, "${source.id}.txt")

  /** Contenu des listes disponibles sur le disque (celles qui n'ont jamais pu être téléchargées sont ignorées). */
  fun readAll(): List<String> = SOURCES.map(::file).filter(File::exists).map(File::readText)

  fun isStale(): Boolean {
    val files = SOURCES.map(::file)
    return files.any { !it.exists() } || files.any { System.currentTimeMillis() - it.lastModified() > MAX_AGE_MS }
  }

  /** Télécharge les listes périmées ; renvoie vrai si au moins une a changé. Une erreur réseau garde l'ancienne copie. */
  fun refresh(force: Boolean = false): Boolean {
    var changed = false
    for (source in SOURCES) {
      val target = file(source)
      val fresh = target.exists() && System.currentTimeMillis() - target.lastModified() <= MAX_AGE_MS
      if (fresh && !force) continue
      val body = download(source.url) ?: continue
      target.writeText(body)
      changed = true
    }
    return changed
  }

  private fun download(url: String): String? =
    try {
      val connection = URL(url).openConnection() as HttpURLConnection
      connection.connectTimeout = TIMEOUT_MS
      connection.readTimeout = TIMEOUT_MS
      connection.instanceFollowRedirects = true
      try {
        if (connection.responseCode == 200) connection.inputStream.bufferedReader().use { it.readText() } else null
      } finally {
        connection.disconnect()
      }
    } catch (_: java.io.IOException) {
      null
    }
}
