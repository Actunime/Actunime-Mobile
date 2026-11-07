package expo.modules.actunimenotifications

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class NotificationsTest {
  @Test
  fun routesDuSite() {
    assertEquals("media/anime/123", LinkRoutes.routeOf("/animes/123"))
    assertEquals("media/manga/9", LinkRoutes.routeOf("/mangas/9?tab=x"))
    assertEquals("member/maud", LinkRoutes.routeOf("/membres/maud"))
    assertEquals("settings/amis", LinkRoutes.routeOf("/suivi/amis"))
    assertNull(LinkRoutes.routeOf("/contribute/proposals/4"))
    assertNull(LinkRoutes.routeOf(null))
  }

  @Test
  fun analyseUneNotificationDeLApi() {
    val json = JSONObject("""{"id":"n1","title":"Demande d'ami reçue","description":"Une demande","link":"/suivi/amis","createdAt":"2026-11-07T10:00:00.000Z"}""")
    val item = Parsing.notificationOf(json)!!
    assertEquals("n1", item.id)
    assertEquals("/suivi/amis", item.link)
  }

  @Test
  fun ignoreUneNotificationSansIdentifiant() {
    assertNull(Parsing.notificationOf(JSONObject("""{"title":"x","createdAt":"2026-11-07T10:00:00.000Z"}""")))
  }

  @Test
  fun uneNotificationMiseAJourEstAnnonceeDeNouveau() {
    val items = Parsing.notificationsOf(
      JSONArray("""[{"id":"n1","createdAt":"2026-11-07T10:00:00Z","updatedAt":"2026-11-07T12:00:00Z"}]"""),
    )
    assertEquals(listOf("n1"), Parsing.newerThan(items, "2026-11-07T11:00:00Z").map { it.id })
    assertEquals("n1@2026-11-07T12:00:00Z", items[0].seenKey)
  }

  @Test
  fun neGardeQueLesPlusRecentesDansLOrdre() {
    val items = Parsing.notificationsOf(
      JSONArray("""[{"id":"b","createdAt":"2026-11-07T12:00:00Z"},{"id":"a","createdAt":"2026-11-07T11:00:00Z"},{"id":"old","createdAt":"2026-11-06T09:00:00Z"}]"""),
    )
    assertEquals(listOf("a", "b"), Parsing.newerThan(items, "2026-11-07T10:00:00Z").map { it.id })
  }
}
