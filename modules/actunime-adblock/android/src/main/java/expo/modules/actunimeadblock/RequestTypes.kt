package expo.modules.actunimeadblock

/**
 * `WebResourceRequest` ne donne pas le type de la ressource : on le déduit de l'en-tête `Accept` et de
 * l'extension. Une règle de filtre limitée à un type (`$script`, `$image`…) ne vaut que si le type est
 * reconnu ; les règles sans type (la majorité des domaines publicitaires) valent pour tous.
 */
object RequestTypes {
  private val SCRIPT = setOf("js", "mjs")
  private val STYLE = setOf("css")
  private val IMAGE = setOf("png", "jpg", "jpeg", "gif", "webp", "avif", "svg", "ico", "bmp")
  private val FONT = setOf("woff", "woff2", "ttf", "otf", "eot")
  private val MEDIA = setOf("mp4", "webm", "m3u8", "mp3", "ogg", "m4a", "ts")

  fun classify(url: String, accept: String?, isMainFrame: Boolean): String {
    if (isMainFrame) return "document"
    val extension = extensionOf(url)
    return when {
      extension in SCRIPT -> "script"
      extension in STYLE -> "stylesheet"
      extension in IMAGE -> "image"
      extension in FONT -> "font"
      extension in MEDIA -> "media"
      accept?.contains("text/html") == true -> "subdocument"
      accept?.startsWith("image/") == true -> "image"
      accept?.contains("text/css") == true -> "stylesheet"
      else -> "other"
    }
  }

  private fun extensionOf(url: String): String {
    val path = url.substringBefore('#').substringBefore('?')
    val name = path.substringAfterLast('/')
    return if ('.' in name) name.substringAfterLast('.').lowercase() else ""
  }
}
