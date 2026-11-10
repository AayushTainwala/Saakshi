Pod::Spec.new do |s|
  s.name           = 'SaakshiDevice'
  s.version        = '1.0.0'
  s.summary        = "The phone's own passcode prompt and haptics for Saakshi"
  s.description    = 'Asks for the device passcode alone (never Face ID or Touch ID) to reset the secret code, and gives a light haptic tap.'
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

  s.frameworks = 'LocalAuthentication', 'Security', 'UIKit'

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
