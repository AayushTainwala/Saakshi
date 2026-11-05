import AVFoundation
import AVKit
import UIKit

/// Reads volume-up presses for body-cam mode's lock screen and its unlock practice: volume-up twice
/// unlocks (owner's decision of 5 Nov 2026).
///
/// - iOS 17.2 and later: `AVCaptureEventInteraction`, Apple's API for camera apps. Apple (WWDC 2025,
///   session 253): "Primary actions are triggered by the volume down button, Action button, and the
///   Camera Control, while the secondary action is triggered by the volume up button", and from
///   iOS 26 AirPods stem clicks are primary too. A capture event carries no way to tell those
///   primary buttons apart, so only the secondary event, volume-up, counts. Primary events are taken
///   and ignored, so while the lock shows, volume-down, Camera Control, the Action button and AirPods
///   do nothing. Events arrive only while the app is on screen and actively using the camera, and
///   the buttons don't change the volume while the interaction is enabled.
/// - Earlier iOS: no public API reads the buttons. The fallback watches the system output volume
///   and treats each increase as a press, so it doesn't fire when the volume is already at its
///   highest, and the presses do change the volume.
final class VolumeButtons: NSObject {
  static let shared = VolumeButtons()

  var onVolumeUp: (() -> Void)?
  private var interaction: UIInteraction?
  private weak var host: UIView?
  private var observation: NSKeyValueObservation?

  /// Call on the main thread.
  func start() {
    guard interaction == nil && observation == nil else { return }
    if #available(iOS 17.2, *), let view = Self.keyWindow()?.rootViewController?.view {
      let capture = AVCaptureEventInteraction(
        primary: { _ in
          // Volume-down, Camera Control, the Action button or AirPods: deliberately nothing.
        },
        secondary: { [weak self] event in
          if event.phase == .ended { self?.onVolumeUp?() }
        }
      )
      view.addInteraction(capture)
      interaction = capture
      host = view
    } else {
      observation = AVAudioSession.sharedInstance().observe(\.outputVolume, options: [.old, .new]) {
        [weak self] _, change in
        if let old = change.oldValue, let new = change.newValue, new > old { self?.onVolumeUp?() }
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

/// The unlock practice on the body-cam start screen. iOS sends button presses to an app only while
/// it actively uses the camera, so on iOS 17.2 and later the practice runs the camera (nothing is
/// recorded or kept) while it waits for the presses. Earlier iOS reads the volume level, which needs
/// an active audio session instead.
enum UnlockPractice {
  private static let queue = DispatchQueue(label: "in.aayushtainwala.saakshi.unlock-practice")
  private static var session: AVCaptureSession?

  /// Calls back on the main thread once the buttons can be read.
  static func start(completion: @escaping () -> Void) {
    queue.async {
      if session == nil, !BodyCamRecorder.shared.isRunning {
        if #available(iOS 17.2, *) {
          let capture = AVCaptureSession()
          capture.automaticallyConfiguresApplicationAudioSession = false
          capture.beginConfiguration()
          if let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
            let input = try? AVCaptureDeviceInput(device: device), capture.canAddInput(input)
          {
            capture.addInput(input)
          }
          // Frames go nowhere: the output only makes the camera run.
          let output = AVCaptureVideoDataOutput()
          if capture.canAddOutput(output) { capture.addOutput(output) }
          capture.commitConfiguration()
          capture.startRunning()
          session = capture
        } else {
          let audio = AVAudioSession.sharedInstance()
          try? audio.setCategory(.ambient, options: [.mixWithOthers])
          try? audio.setActive(true)
        }
      }
      DispatchQueue.main.async {
        VolumeButtons.shared.start()
        completion()
      }
    }
  }

  /// Calls back on the main thread once the camera is off again.
  static func stop(completion: @escaping () -> Void) {
    DispatchQueue.main.async {
      VolumeButtons.shared.stop()
      queue.async {
        session?.stopRunning()
        session = nil
        DispatchQueue.main.async { completion() }
      }
    }
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
