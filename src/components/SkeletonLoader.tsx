import { View, Animated, StyleSheet, Platform } from 'react-native';
import { useEffect, useRef } from 'react';

export default function SkeletonLoader() {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={styles.container}>
      <View style={styles.greeting}>
        <View style={styles.greetingContent}>
          <Animated.View style={[styles.skeletonText, { opacity }]} />
          <Animated.View style={[styles.skeletonSubtext, { opacity }]} />
        </View>
      </View>

      <View style={styles.carouselPlaceholder}>
        <Animated.View style={[styles.carouselCard, { opacity }]} />
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.statsContainer}>
          {[1, 2, 3].map((i) => (
            <Animated.View key={i} style={[styles.statCard, { opacity }]} />
          ))}
        </View>

        <View style={styles.requestsContainer}>
          <Animated.View style={[styles.sectionTitle, { opacity }]} />
          {[1, 2, 3].map((i) => (
            <Animated.View key={i} style={[styles.requestCard, { opacity }]} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  greeting: {
    backgroundColor: 'white',
    paddingVertical: 24,
  },
  greetingContent: {
    paddingHorizontal: Platform.OS === 'web' ? '20%' : 24,
  },
  skeletonText: {
    height: 32,
    backgroundColor: '#E1E1E1',
    borderRadius: 4,
    width: '60%',
    marginBottom: 8,
  },
  skeletonSubtext: {
    height: 16,
    backgroundColor: '#E1E1E1',
    borderRadius: 4,
    width: '40%',
  },
  carouselPlaceholder: {
    padding: 16,
    alignItems: 'center',
  },
  carouselCard: {
    width: Platform.OS === 'web' ? 600 : '80%',
    height: 100,
    backgroundColor: '#E1E1E1',
    borderRadius: 12,
  },
  contentContainer: {
    paddingHorizontal: Platform.OS === 'web' ? '20%' : 0,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  statCard: {
    flex: 1,
    height: 80,
    backgroundColor: '#E1E1E1',
    borderRadius: 12,
  },
  requestsContainer: {
    padding: 16,
  },
  sectionTitle: {
    height: 24,
    backgroundColor: '#E1E1E1',
    borderRadius: 4,
    width: '30%',
    marginBottom: 16,
  },
  requestCard: {
    height: 120,
    backgroundColor: '#E1E1E1',
    borderRadius: 12,
    marginBottom: 16,
  },
}); 