import CommonCrypto
import ExpoModulesCore
import Foundation

/**
 * PBKDF2 with HMAC-SHA256 (RFC 8018), for the recovery code's slow hash (round 2, group 1.6),
 * through Apple's CommonCrypto.
 */
enum SlowHash {
  static func pbkdf2Sha256Hex(password: String, saltHex: String, iterations: Int, length: Int) throws -> String {
    guard iterations >= 1, iterations <= Int(UInt32.max), (1...256).contains(length) else {
      throw Exception(name: "ERR_PBKDF2", description: "Bad PBKDF2 parameters")
    }
    guard let salt = bytes(fromHex: saltHex) else {
      throw Exception(name: "ERR_PBKDF2", description: "The salt must be hex")
    }
    let passwordBytes = Array(password.utf8)
    var out = [UInt8](repeating: 0, count: length)
    let status = passwordBytes.withUnsafeBufferPointer { passwordBuffer in
      passwordBuffer.withMemoryRebound(to: CChar.self) { passwordChars in
        CCKeyDerivationPBKDF(
          CCPBKDFAlgorithm(kCCPBKDF2),
          passwordChars.baseAddress, passwordBytes.count,
          salt, salt.count,
          CCPseudoRandomAlgorithm(kCCPRFHmacAlgSHA256),
          UInt32(iterations),
          &out, length
        )
      }
    }
    guard status == Int32(kCCSuccess) else {
      throw Exception(name: "ERR_PBKDF2", description: "PBKDF2 failed (\(status))")
    }
    return out.map { String(format: "%02x", $0) }.joined()
  }

  private static func bytes(fromHex hex: String) -> [UInt8]? {
    let chars = Array(hex.utf8)
    guard chars.count % 2 == 0 else { return nil }
    var result: [UInt8] = []
    result.reserveCapacity(chars.count / 2)
    var i = 0
    while i < chars.count {
      guard let high = nibble(chars[i]), let low = nibble(chars[i + 1]) else { return nil }
      result.append(high << 4 | low)
      i += 2
    }
    return result
  }

  private static func nibble(_ c: UInt8) -> UInt8? {
    switch c {
    case UInt8(ascii: "0")...UInt8(ascii: "9"): return c - UInt8(ascii: "0")
    case UInt8(ascii: "a")...UInt8(ascii: "f"): return c - UInt8(ascii: "a") + 10
    case UInt8(ascii: "A")...UInt8(ascii: "F"): return c - UInt8(ascii: "A") + 10
    default: return nil
    }
  }
}
