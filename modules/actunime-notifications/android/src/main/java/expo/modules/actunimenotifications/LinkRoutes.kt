package expo.modules.actunimenotifications

/** Page de l'app qui correspond au lien d'une notification (l'API renvoie des chemins du site) ; `null` : aucune. */
object LinkRoutes {
  fun routeOf(link: String?): String? {
    if (link.isNullOrBlank()) return null
    val path = link.substringBefore('?').substringBefore('#')
    val parts = path.split('/').filter { it.isNotEmpty() }
    val first = parts.getOrNull(0)
    val second = parts.getOrNull(1)
    return when {
      (first == "animes" || first == "mangas") && second != null -> "media/${if (first == "animes") "anime" else "manga"}/$second"
      first == "membres" && second != null -> "member/$second"
      path == "/suivi/amis" || path == "/settings/amis" -> "settings/amis"
      first == "personnages" && second != null -> "character/$second"
      first == "personnes" && second != null -> "person/$second"
      first == "musiques" && second != null -> "track/$second"
      else -> null
    }
  }
}
