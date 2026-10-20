import ActivityKit
import Foundation

/// Must match targets/widget/_shared/BugModeAttributes.swift field for field: ActivityKit pairs the
/// app's activity with the widget's view by this type.
struct BugModeAttributes: ActivityAttributes {
  struct ContentState: Codable, Hashable {
    var detail: String
  }

  var title: String
  var startedAt: Date
}

/// Starts, updates and ends bug mode's Live Activity. iOS 16.2 and later; elsewhere it does nothing.
enum BugModeActivity {
  static func start(title: String, detail: String) throws -> Bool {
    guard #available(iOS 16.2, *) else { return false }
    guard ActivityAuthorizationInfo().areActivitiesEnabled else { return false }
    let attributes = BugModeAttributes(title: title, startedAt: Date())
    _ = try Activity.request(
      attributes: attributes,
      content: ActivityContent(state: BugModeAttributes.ContentState(detail: detail), staleDate: nil),
      pushType: nil
    )
    return true
  }

  static func update(detail: String) async {
    guard #available(iOS 16.2, *) else { return }
    for activity in Activity<BugModeAttributes>.activities {
      await activity.update(ActivityContent(state: BugModeAttributes.ContentState(detail: detail), staleDate: nil))
    }
  }

  static func end() async {
    guard #available(iOS 16.2, *) else { return }
    for activity in Activity<BugModeAttributes>.activities {
      await activity.end(nil, dismissalPolicy: .immediate)
    }
  }
}
