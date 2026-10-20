Pod::Spec.new do |s|
  s.name           = 'SaakshiSos'
  s.version        = '1.0.0'
  s.summary        = 'Phone-number picker, quick-trigger bridge and Live Activity for Saakshi'
  s.description    = 'Picks one phone number without contacts permission, for the Saakshi SOS module.'
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

  s.frameworks = 'ActivityKit', 'Contacts', 'ContactsUI'

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
