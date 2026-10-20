package expo.modules.saakshievidence

import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyInfo
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyFactory
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.MessageDigest
import java.security.PrivateKey
import java.security.ProviderException
import java.security.SecureRandom
import java.security.Signature
import java.security.spec.ECGenParameterSpec

/**
 * The install's evidence signing key: EC P-256 in the Android Keystore, in StrongBox where the phone
 * has it and otherwise in the TEE, created with a Key Attestation challenge so the Keystore returns
 * a certificate chain describing the key, the app and the phone's boot state.
 * See docs/spec/evidence-bundle.md, section 6.
 */
object DeviceKey {
  private const val ALIAS = "saakshi.evidence.device-key.v1"
  private const val PROVIDER = "AndroidKeyStore"

  data class Info(
    val keyId: String,
    val publicKeySpki: String,
    val storage: String,
    val certificateChain: List<String>?,
    val attestationError: String?
  ) {
    fun toMap(): Map<String, Any?> = mapOf(
      "keyId" to keyId,
      "publicKeySpki" to publicKeySpki,
      "platform" to "android",
      "storage" to storage,
      "attestation" to certificateChain?.let {
        mapOf("format" to "android-key-attestation", "certificateChain" to it)
      },
      "attestationError" to attestationError
    )
  }

  private fun keyStore(): KeyStore = KeyStore.getInstance(PROVIDER).apply { load(null) }

  fun exists(): Boolean = keyStore().containsAlias(ALIAS)

  /**
   * Creates the key if there is none. Tries StrongBox, then the TEE, each with attestation, and
   * last a TEE key without attestation, since some phones fail to attest.
   */
  fun create(context: Context): Info {
    if (exists()) return info()
    val challenge = ByteArray(32).also { SecureRandom().nextBytes(it) }
    val strongBox = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P &&
      context.packageManager.hasSystemFeature(PackageManager.FEATURE_STRONGBOX_KEYSTORE)
    val attempts = listOfNotNull(
      if (strongBox) Pair(challenge, true) else null,
      Pair(challenge, false),
      Pair(null, false)
    )
    var lastError: ProviderException? = null
    for ((attestationChallenge, useStrongBox) in attempts) {
      try {
        generate(attestationChallenge, useStrongBox)
        val info = info()
        return if (attestationChallenge == null) {
          info.copy(attestationError = "Key attestation failed: ${lastError?.message}")
        } else {
          info
        }
      } catch (e: ProviderException) {
        // StrongBoxUnavailableException is a ProviderException too.
        lastError = e
        if (exists()) keyStore().deleteEntry(ALIAS)
      }
    }
    throw lastError ?: IllegalStateException("Could not create the device key")
  }

  private fun generate(challenge: ByteArray?, strongBox: Boolean) {
    val builder = KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_SIGN)
      .setAlgorithmParameterSpec(ECGenParameterSpec("secp256r1"))
      .setDigests(KeyProperties.DIGEST_SHA256)
    if (challenge != null) builder.setAttestationChallenge(challenge)
    if (strongBox && Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) builder.setIsStrongBoxBacked(true)
    KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_EC, PROVIDER).apply {
      initialize(builder.build())
      generateKeyPair()
    }
  }

  fun info(): Info {
    val store = keyStore()
    val certificate = store.getCertificate(ALIAS) ?: throw IllegalStateException("No device key")
    val spki = certificate.publicKey.encoded
    val chain = store.getCertificateChain(ALIAS)
    // A chain of one certificate is the Keystore's self-signed placeholder: no attestation.
    val attested = chain != null && chain.size > 1
    return Info(
      keyId = StreamingHasher.hex(MessageDigest.getInstance("SHA-256").digest(spki)),
      publicKeySpki = Base64.encodeToString(spki, Base64.NO_WRAP),
      storage = storage(store),
      certificateChain = if (attested) chain.map { Base64.encodeToString(it.encoded, Base64.NO_WRAP) } else null,
      attestationError = if (attested) null else "The Keystore returned no attestation chain"
    )
  }

  @Suppress("DEPRECATION")
  private fun storage(store: KeyStore): String {
    val privateKey = store.getKey(ALIAS, null) as PrivateKey
    val keyInfo = KeyFactory.getInstance(privateKey.algorithm, PROVIDER)
      .getKeySpec(privateKey, KeyInfo::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      return when (keyInfo.securityLevel) {
        KeyProperties.SECURITY_LEVEL_STRONGBOX -> "strongbox"
        KeyProperties.SECURITY_LEVEL_TRUSTED_ENVIRONMENT -> "tee"
        else -> "software"
      }
    }
    return if (keyInfo.isInsideSecureHardware) "tee" else "software"
  }

  /** ES256 signature, ASN.1 DER, over [data]. */
  fun sign(data: ByteArray): ByteArray {
    val privateKey = keyStore().getKey(ALIAS, null) as? PrivateKey
      ?: throw IllegalStateException("No device key")
    return Signature.getInstance("SHA256withECDSA").run {
      initSign(privateKey)
      update(data)
      sign()
    }
  }
}
