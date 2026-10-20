import AVFoundation
import AVKit
import UIKit

/// Reads volume-down presses for body-cam mode's lock screen.
///
/// - iOS 17.2 and later: `AVCaptureEventInteraction`, Apple's API for camera apps. Volume down is
///   a "primary" capture event (as are the Action button and Camera Control); volume up is
///   "secondary" and is swallowed here. Events arrive only while the app is on screen and actively
///   using the camera. While the interaction is enabled, the buttons don't change the volume.
/// - Earlier iOS: no public API reads the buttons. The fallback watches the system output volume
///   and treats each decrease as a press, so it doesn't fire when the volume is already at zero.
final class VolumeButtons: NSObject {
  static let shared = VolumeButtons()

  var onVolumeDown: (() -> Void)?
  private var interaction: UIInteraction?
  private weak var host: UIView?
  private var observation: NSKeyValueObservation?

  /// Call on the main thread.
  func start() {
    guard interaction == nil && observation == nil else { return }
    if #available(iOS 17.2, *), let view = Self.keyWindow()?.rootViewController?.view {
      let capture = AVCaptureEventInteraction(
        primary: { [weak self] event in
          if event.phase == .ended { self?.onVolumeDown?() }
        },
        secondary: { _ in }
      )
      view.addInteraction(capture)
      interaction = capture
      host = view
    } else {
      observation = AVAudioSession.sharedInstance().observe(\.outputVolume, options: [.old, .new]) {
        [weak self] _, change in
        if let old = change.oldValue, let new = change.newValue, new < old { self?.onVolumeDown?() }
      }
    }
  }

  /// Call on the main thread.
  func stop() {
    if let interaction, let host { host.removeInteraction(interaction) }
    interaction = nil
    host = nil
    observation?.invalidate()
    observation = nil
  }

  private static func keyWindow() -> UIWindow? {
    UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .flatMap { $0.windows }
      .first { $0.isKeyWindow }
  }
}

/// Dims the screen for body-cam mode and puts it back. On iPhone the brightness is the system's,
/// so the previous level is kept and restored; iOS also restores it itself when the phone locks.
enum ScreenDimmer {
  private static var previous: CGFloat?

  static func set(dimmed: Bool) {
    if dimmed {
      if previous == nil { previous = UIScreen.main.brightness }
      UIScreen.main.brightness = 0
    } else if let level = previous {
      UIScreen.main.brightness = level
      previous = nil
    }
  }
}
