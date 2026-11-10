import AppIntents
import SwiftUI
import WidgetKit

private let sosURL = URL(string: "saakshi://sos")!

/// A control for Control Center, the Lock Screen and the Action Button: opens the SOS screen.
struct QuickAlertControl: ControlWidget {
  var body: some ControlWidgetConfiguration {
    StaticControlConfiguration(kind: "in.aayushtainwala.saakshi.quick-alert") {
      ControlWidgetButton(action: OpenCodePadIntent()) {
        Label("Saakshi SOS", systemImage: "bell.fill")
      }
    }
    .displayName("Saakshi quick alert")
    .description("Opens Saakshi's SOS screen.")
  }
}

struct QuickAlertEntry: TimelineEntry {
  let date: Date
}

struct QuickAlertProvider: TimelineProvider {
  func placeholder(in context: Context) -> QuickAlertEntry { QuickAlertEntry(date: Date()) }
  func getSnapshot(in context: Context, completion: @escaping (QuickAlertEntry) -> Void) {
    completion(QuickAlertEntry(date: Date()))
  }
  func getTimeline(in context: Context, completion: @escaping (Timeline<QuickAlertEntry>) -> Void) {
    completion(Timeline(entries: [QuickAlertEntry(date: Date())], policy: .never))
  }
}

/// A Lock Screen or Home Screen widget that opens the SOS screen. From the Lock Screen, iPhone may ask
/// for Face ID or the passcode first.
struct QuickAlertWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "SaakshiQuickAlert", provider: QuickAlertProvider()) { _ in
      QuickAlertView()
        .widgetURL(sosURL)
        .containerBackground(.background, for: .widget)
    }
    .configurationDisplayName("Saakshi quick alert")
    .description("Opens Saakshi's SOS screen.")
    .supportedFamilies([.accessoryCircular, .accessoryRectangular, .systemSmall])
  }
}

struct QuickAlertView: View {
  @Environment(\.widgetFamily) private var family

  var body: some View {
    switch family {
    case .accessoryCircular:
      ZStack {
        AccessoryWidgetBackground()
        Image(systemName: "bell.fill").font(.title2)
      }
      .accessibilityLabel(Text("Saakshi SOS"))
    case .accessoryRectangular:
      Label("Saakshi SOS", systemImage: "bell.fill").font(.headline)
    default:
      VStack(spacing: 8) {
        Image(systemName: "bell.fill").font(.largeTitle).foregroundStyle(.red)
        Text("Saakshi SOS").font(.headline)
      }
    }
  }
}
