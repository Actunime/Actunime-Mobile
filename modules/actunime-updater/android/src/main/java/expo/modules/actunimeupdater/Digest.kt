package expo.modules.actunimeupdater

import java.io.InputStream
import java.security.MessageDigest

/** Empreinte SHA-256 en hexadécimal minuscule, calculée au fil de la lecture (pas de fichier relu). */
class Sha256Stream {
  private val digest = MessageDigest.getInstance("SHA-256")

  fun update(buffer: ByteArray, length: Int) = digest.update(buffer, 0, length)

  fun hex(): String = digest.digest().joinToString("") { "%02x".format(it) }
}

fun sha256Of(input: InputStream): String {
  val stream = Sha256Stream()
  val buffer = ByteArray(64 * 1024)
  while (true) {
    val read = input.read(buffer)
    if (read < 0) break
    stream.update(buffer, read)
  }
  return stream.hex()
}

/** Compare deux empreintes sans tenir compte de la casse ni des espaces autour. */
fun sameDigest(expected: String, actual: String): Boolean =
  expected.trim().equals(actual.trim(), ignoreCase = true)
