import ActivityKit
import SwiftUI
import WidgetKit

/// Must match modules/saakshi-sos/ios/BugModeActivity.swift field for field.
struct BugModeAttributes: ActivityAttributes {
  struct ContentState: Codable, Hashable {
    var detail: String
  }

  var title: String
  var startedAt: Date
}

/// Bug mode's Live Activity (spec E8): shows that sound is being recorded, for how long, and how
/// many pieces are saved. The words come from the app, in its language.
struct BugModeLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: BugModeAttributes.self) { context in
      HStack(spacing: 12) {
        Image(systemName: "mic.fill").foregroundStyle(.red).font(.title2)
        VStack(alignment: .leading, spacing: 2) {
          Text(context.attributes.title).font(.headline)
          Text(context.state.detail).font(.subheadline)
        }
        Spacer()
        Text(context.attributes.startedAt, style: .timer)
          .monospacedDigit()
          .font(.headline)
          .frame(maxWidth: 80, alignment: .trailing)
      }
      .padding()
      .widgetURL(URL(string: "saakshi://sos/bugmode"))
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Image(systemName: "mic.fill").foregroundStyle(.red)
        }
        DynamicIslandExpandedRegion(.center) {
          Text(context.attributes.title).font(.headline)
        }
        DynamicIslandExpandedRegion(.trailing) {
          Text(context.attributes.startedAt, style: .timer).monospacedDigit().frame(maxWidth: 64)
        }
        DynamicIslandExpandedRegion(.bottom) {
          Text(context.state.detail).font(.subheadline)
        }
      } compactLeading: {
        Image(systemName: "mic.fill").foregroundStyle(.red)
      } compactTrailing: {
        Text(context.attributes.startedAt, style: .timer).monospacedDigit().frame(maxWidth: 44)
      } minimal: {
        Image(systemName: "mic.fill").foregroundStyle(.red)
      }
      .widgetURL(URL(string: "saakshi://sos/bugmode"))
    }
  }
}
