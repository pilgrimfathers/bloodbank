import { TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function BackButton() {
  return (
    <TouchableOpacity 
      style={[
        styles.backButton,
        Platform.OS === 'web' && styles.webBackButton
      ]} 
      onPress={() => router.back()}
    >
      <MaterialCommunityIcons name="arrow-left" size={24} color="#E53935" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 1,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  webBackButton: {
    position: 'fixed',
    top: 20,
    left: 20,
  }
}); 