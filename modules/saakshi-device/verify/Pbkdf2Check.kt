import expo.modules.saakshidevice.Pbkdf2

/**
 * Checks Pbkdf2.kt on the JVM: RFC 7914 section 11's PBKDF2-HMAC-SHA256 vectors, and the values
 * Node's crypto.pbkdf2Sync gives for the recovery code's own settings (passed in by pbkdf2.sh).
 */
fun main(args: Array<String>) {
  fun hex(s: String) = s.toByteArray(Charsets.UTF_8).joinToString("") { "%02x".format(it) }
  val vectors = listOf(
    Triple("passwd", hex("salt"), 1) to
      "55ac046e56e3089fec1691c22544b605f94185216dde0465e68b9d57c20dacbc49ca9cccf179b645991664b39d77ef317c71b845b1e30bd509112041d3a19783",
    Triple("Password", hex("NaCl"), 80000) to
      "4ddcd8f60b98be21830cee5ef22701f9641a4418d04c0414aeff08876b34ab56a1d425a1225833549adb841b51c9b3176a272bdebba1d078478f62b397f33c8d",
  )
  for ((input, expected) in vectors) {
    val got = Pbkdf2.sha256Hex(input.first, input.second, input.third, 64)
    check(got == expected) { "RFC 7914 vector ${input.first}/${input.third}: got $got" }
    println("RFC 7914 ${input.first}, ${input.third} iterations: ok")
  }
  // From pbkdf2.sh: password, salt hex, iterations, length, Node's answer.
  var i = 0
  while (i + 4 < args.size) {
    val got = Pbkdf2.sha256Hex(args[i], args[i + 1], args[i + 2].toInt(), args[i + 3].toInt())
    check(got == args[i + 4]) { "Node vector ${args[i]}: got $got, expected ${args[i + 4]}" }
    println("Node ${args[i]}, ${args[i + 2]} iterations, ${args[i + 3]} bytes: ok")
    i += 5
  }
}
