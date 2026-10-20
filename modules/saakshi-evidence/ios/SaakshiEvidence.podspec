Pod::Spec.new do |s|
  s.name           = 'SaakshiEvidence'
  s.version        = '1.0.0'
  s.summary        = 'Hashing, hardware-key signing and attestation for Saakshi evidence'
  s.description    = 'Single-pass file hashing, Secure Enclave signing and App Attest for the Saakshi evidence module.'
  s.author         = 'Saakshi contributors'
  s.homepage       = 'https://github.com/AayushTainwala/Saakshi'
  s.license        = 'MIT'
  s.platforms      = {
    :ios => '16.4'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
