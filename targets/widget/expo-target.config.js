/**
 * The iPhone widget extension (@bacons/apple-targets): the quick-alert control for Control Center,
 * the Lock Screen and the Action Button (spec S4), a Lock Screen widget, and bug mode's Live
 * Activity (spec E8). Files in _shared/ are also built into the app itself.
 *
 * @type {import('@bacons/apple-targets/app.plugin').Config}
 */
module.exports = {
  type: 'widget',
  name: 'SaakshiWidgets',
  displayName: 'Saakshi',
  bundleIdentifier: '.widgets',
  // Controls need iOS 18; older phones still get the in-app SOS and the Live Activity's dot.
  deploymentTarget: '18.0',
  frameworks: ['SwiftUI', 'WidgetKit', 'ActivityKit', 'AppIntents'],
  colors: {
    $accent: '#B3261E',
  },
};
