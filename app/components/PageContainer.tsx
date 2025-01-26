import { View, StyleSheet, Platform } from 'react-native';

export default function PageContainer({ children, style }: { children: React.ReactNode, style?: any }) {
  // Only apply maxWidth on web platform
  const isWeb = Platform.OS === 'web';
  
  return (
    <View style={[
      styles.container,
      isWeb && { 
        alignSelf: 'center',
        width: '100%',
        marginHorizontal: 'auto',
      },
      style
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
}); 