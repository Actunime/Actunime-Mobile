package expo.modules.actunimeadblock

import org.junit.Assert.assertEquals
import org.junit.Test

class RequestTypesTest {
  @Test fun mainFrameIsADocument() = assertEquals("document", RequestTypes.classify("https://a.com/", "text/html", true))

  @Test fun extensionWinsOverAccept() {
    assertEquals("script", RequestTypes.classify("https://cdn.a.com/app.js?v=3", "*/*", false))
    assertEquals("image", RequestTypes.classify("https://cdn.a.com/p.PNG#x", "*/*", false))
  }

  @Test fun fallsBackToAcceptThenOther() {
    assertEquals("subdocument", RequestTypes.classify("https://a.com/frame", "text/html,application/xhtml+xml", false))
    assertEquals("image", RequestTypes.classify("https://a.com/img", "image/avif,image/webp,*/*", false))
    assertEquals("other", RequestTypes.classify("https://a.com/api/items", "*/*", false))
  }
}
