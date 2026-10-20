import { requireNativeView } from 'expo';
import { Platform, View, type ViewProps } from 'react-native';

const NativePreview: React.ComponentType<ViewProps> | null =
  Platform.OS === 'android' ? requireNativeView('SaakshiEvidence') : null;

/** Android: the preview for the app's own recorder. Elsewhere: an empty view. */
export function RecorderPreview(props: ViewProps) {
  return NativePreview ? <NativePreview {...props} /> : <View {...props} />;
}
