package expo.modules.actunimeupdater

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class DigestTest {
  @Test
  fun sha256OfKnownValue() {
    // SHA-256 de "abc"
    assertEquals(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
      sha256Of("abc".byteInputStream()),
    )
  }

  @Test
  fun sameDigestIgnoresCaseAndSpaces() {
    assertTrue(sameDigest("ABCDEF", " abcdef "))
    assertFalse(sameDigest("abcdef", "abcdee"))
  }
}
