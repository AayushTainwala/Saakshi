package expo.modules.saakshidevice

import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/**
 * PBKDF2 with HMAC-SHA256 (RFC 8018, section 5.2), for the recovery code's slow hash (round 2,
 * group 1.6). Written out over the platform's HmacSHA256 because Android's own
 * "PBKDF2WithHmacSHA256" key factory exists only from Android 8 (API 26) and the app supports 7.
 * Checked against RFC 7914's test vectors and Node's crypto.pbkdf2Sync
 * (modules/saakshi-device/verify/pbkdf2.sh).
 */
object Pbkdf2 {
  fun sha256Hex(password: String, saltHex: String, iterations: Int, length: Int): String {
    require(iterations >= 1) { "iterations must be at least 1" }
    require(length in 1..256) { "length must be 1 to 256 bytes" }
    val salt = fromHex(saltHex)
    val mac = Mac.getInstance("HmacSHA256")
    mac.init(SecretKeySpec(password.toByteArray(Charsets.UTF_8), "HmacSHA256"))
    val out = ByteArray(length)
    var block = 1
    var written = 0
    while (written < length) {
      mac.update(salt)
      mac.update(byteArrayOf((block ushr 24).toByte(), (block ushr 16).toByte(), (block ushr 8).toByte(), block.toByte()))
      var u = mac.doFinal()
      val t = u.copyOf()
      for (i in 1 until iterations) {
        u = mac.doFinal(u)
        for (j in t.indices) t[j] = (t[j].toInt() xor u[j].toInt()).toByte()
      }
      val take = minOf(t.size, length - written)
      System.arraycopy(t, 0, out, written, take)
      written += take
      block++
    }
    return out.joinToString("") { "%02x".format(it.toInt() and 0xff) }
  }

  private fun fromHex(hex: String): ByteArray {
    require(hex.length % 2 == 0 && hex.all { it in "0123456789abcdefABCDEF" }) { "salt must be hex" }
    return ByteArray(hex.length / 2) { i -> hex.substring(i * 2, i * 2 + 2).toInt(16).toByte() }
  }
}
