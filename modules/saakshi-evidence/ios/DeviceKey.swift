import CryptoKit
import DeviceCheck
import ExpoModulesCore
import Foundation
import Security

/// What the module returns to JavaScript about the device key.
struct DeviceKeyRecord: Record {
  @Field var keyId: String = ""
  @Field var publicKeySpki: String = ""
  @Field var platform: String = "ios"
  @Field var storage: String = ""
  @Field var attestation: [String: String]?
  @Field var attestationError: String?
}

/// The install's evidence signing key: a Secure Enclave P-256 key (a software P-256 key where there
/// is no Secure Enclave, such as the simulator), bound to Apple App Attest by attesting the SHA-256 of
/// its public key. See docs/spec/evidence-bundle.md, section 6.
enum DeviceKey {
  private static let service = "in.aayushtainwala.saakshi.evidence"
  private static let keyAccount = "device-key.v1"
  private static let storageAccount = "device-key-storage.v1"
  private static let appAttestAccount = "app-attest-key-id.v1"

  enum Failure: LocalizedError {
    case noKey
    case keychain(OSStatus)
    case appAttestUnsupported

    var errorDescription: String? {
      switch self {
      case .noKey: return "No device key"
      case .keychain(let status): return "Keychain error \(status)"
      case .appAttestUnsupported: return "App Attest is not available on this device"
      }
    }
  }

  private enum SigningKey {
    case enclave(SecureEnclave.P256.Signing.PrivateKey)
    case software(P256.Signing.PrivateKey)

    var publicKey: P256.Signing.PublicKey {
      switch self {
      case .enclave(let key): return key.publicKey
      case .software(let key): return key.publicKey
      }
    }

    var storage: String {
      switch self {
      case .enclave: return "secure-enclave"
      case .software: return "software"
      }
    }

    func sign(_ data: Data) throws -> Data {
      switch self {
      case .enclave(let key): return try key.signature(for: data).derRepresentation
      case .software(let key): return try key.signature(for: data).derRepresentation
      }
    }
  }

  // MARK: Public API

  static func exists() -> Bool {
    (try? load()) != nil
  }

  static func create() throws -> DeviceKeyRecord {
    if let key = try load() { return info(key) }
    let key: SigningKey
    if SecureEnclave.isAvailable {
      // Usable after the first unlock, so it can sign while the screen is locked.
      var error: Unmanaged<CFError>?
      guard
        let access = SecAccessControlCreateWithFlags(
          nil, kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly, .privateKeyUsage, &error)
      else { throw error!.takeRetainedValue() as Error }
      let enclaveKey = try SecureEnclave.P256.Signing.PrivateKey(accessControl: access)
      try save(account: keyAccount, data: enclaveKey.dataRepresentation)
      key = .enclave(enclaveKey)
    } else {
      let softwareKey = P256.Signing.PrivateKey()
      try save(account: keyAccount, data: softwareKey.rawRepresentation)
      key = .software(softwareKey)
    }
    try save(account: storageAccount, data: Data(key.storage.utf8))
    return info(key)
  }

  static func current() throws -> DeviceKeyRecord? {
    try load().map(info)
  }

  static func sign(_ data: Data) throws -> Data {
    guard let key = try load() else { throw Failure.noKey }
    return try key.sign(data)
  }

  /// Attests the device key with App Attest. Needs the internet; Apple's servers are contacted once.
  static func attest() async throws -> [String: String] {
    guard let key = try load() else { throw Failure.noKey }
    let service = DCAppAttestService.shared
    guard service.isSupported else { throw Failure.appAttestUnsupported }

    let clientDataHash = Data(SHA256.hash(data: key.publicKey.derRepresentation))
    var keyId = try read(account: appAttestAccount).flatMap { String(data: $0, encoding: .utf8) }
    if keyId == nil {
      keyId = try await service.generateKey()
      try save(account: appAttestAccount, data: Data(keyId!.utf8))
    }

    let attestation: Data
    do {
      attestation = try await service.attestKey(keyId!, clientDataHash: clientDataHash)
    } catch let error as DCError where error.code == .invalidKey {
      // Apple rejected the App Attest key; start again with a new one.
      let freshId = try await service.generateKey()
      try save(account: appAttestAccount, data: Data(freshId.utf8))
      attestation = try await service.attestKey(freshId, clientDataHash: clientDataHash)
      keyId = freshId
    }

    return [
      "format": "apple-app-attest",
      "keyId": keyId!,
      "attestationObject": attestation.base64EncodedString(),
      "clientDataHash": clientDataHash.base64EncodedString(),
    ]
  }

  // MARK: Internals

  private static func info(_ key: SigningKey) -> DeviceKeyRecord {
    let spki = key.publicKey.derRepresentation
    var record = DeviceKeyRecord()
    record.keyId = StreamingHasher.hex(SHA256.hash(data: spki))
    record.publicKeySpki = spki.base64EncodedString()
    record.storage = key.storage
    return record
  }

  private static func load() throws -> SigningKey? {
    guard let data = try read(account: keyAccount) else { return nil }
    let storage = try read(account: storageAccount).flatMap { String(data: $0, encoding: .utf8) }
    if storage == "software" {
      return .software(try P256.Signing.PrivateKey(rawRepresentation: data))
    }
    return .enclave(try SecureEnclave.P256.Signing.PrivateKey(dataRepresentation: data))
  }

  private static func baseQuery(account: String) -> [String: Any] {
    [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: account,
    ]
  }

  private static func read(account: String) throws -> Data? {
    var query = baseQuery(account: account)
    query[kSecReturnData as String] = true
    query[kSecMatchLimit as String] = kSecMatchLimitOne
    var result: AnyObject?
    let status = SecItemCopyMatching(query as CFDictionary, &result)
    if status == errSecItemNotFound { return nil }
    guard status == errSecSuccess else { throw Failure.keychain(status) }
    return result as? Data
  }

  private static func save(account: String, data: Data) throws {
    SecItemDelete(baseQuery(account: account) as CFDictionary)
    var query = baseQuery(account: account)
    query[kSecValueData as String] = data
    query[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
    let status = SecItemAdd(query as CFDictionary, nil)
    guard status == errSecSuccess else { throw Failure.keychain(status) }
  }
}
