import { View, Text, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { useRef, useState, useCallback, useEffect } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.8;
const SPACING = width * 0.1;

const quotes = [
  {
    text: "The blood you donate gives someone another chance at life.",
    icon: "heart",
  },
  {
    text: "A single drop of blood can make a huge difference.",
    icon: "water",
  },
  {
    text: "Your blood donation can give a precious smile to someone's face.",
    icon: "emoticon",
  }
];

export default function QuoteCarousel() {
  const scrollX = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<any>(null);

  const scrollToIndex = useCallback((index: number) => {
    scrollViewRef.current?.scrollTo({
      x: index * (CARD_WIDTH + SPACING),
      animated: true,
      duration: 2000,
      easing: Easing.bezier(0.6, 1, 0.4, 2)
    });
    setCurrentIndex(index);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const nextIndex = (currentIndex + 1) % quotes.length;
      scrollToIndex(nextIndex);
    }, 5000);

    return () => clearInterval(timer);
  }, [currentIndex, scrollToIndex]);

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + SPACING}
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        onMomentumScrollEnd={(event) => {
          const newIndex = Math.round(event.nativeEvent.contentOffset.x / (CARD_WIDTH + SPACING));
          setCurrentIndex(newIndex);
        }}
      >
        {quotes.map((quote, index) => {
          const inputRange = [
            (index - 1) * (CARD_WIDTH + SPACING),
            index * (CARD_WIDTH + SPACING),
            (index + 1) * (CARD_WIDTH + SPACING),
          ];

          const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.9, 1, 0.9],
          });

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.5, 1, 0.5],
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.card,
                {
                  transform: [{ scale }],
                  opacity,
                },
              ]}
            >
              <MaterialCommunityIcons name={quote.icon as any} size={32} color="#E53935" />
              <Text style={styles.quoteText}>{quote.text}</Text>
            </Animated.View>
          );
        })}
      </Animated.ScrollView>
      
      <View style={styles.pagination}>
        {quotes.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              currentIndex === index && styles.paginationDotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
  },
  scrollContent: {
    paddingHorizontal: SPACING / 2,
  },
  card: {
    width: CARD_WIDTH,
    marginHorizontal: SPACING / 2,
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  quoteText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 24,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ddd',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#E53935',
    transform: [{ scale: 1.2 }],
  },
}); 