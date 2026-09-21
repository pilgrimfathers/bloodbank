import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Full-screen wrapper for stack screens. Keeps content (and the absolutely
// positioned BackButton) clear of the status bar, notch and gesture bar.
export default function PageContainer({ children, style }: { children: React.ReactNode, style?: any }) {
  const insets = useSafeAreaInsets();
  // Only apply maxWidth on web platform
  const isWeb = Platform.OS === 'web';

  return (
    <View style={[
      styles.container,
      { paddingTop: insets.top, paddingBottom: insets.bottom },
      isWeb && {
        alignSelf: 'center',
        width: '100%',
        marginHorizontal: 'auto',
      },
      style
    ]}>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

// Space to leave above screen content so it clears the BackButton.
export const HEADER_OFFSET = Platform.OS === 'web' ? 80 : 60;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
});
