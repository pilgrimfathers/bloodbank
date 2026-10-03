import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { palette, radius, space } from '@/src/theme';
import Text from './Text';

type Props = {
  title?: string;
  subtitle?: string;
  // Stack screens show a back arrow; tab screens don't.
  back?: boolean;
  right?: ReactNode;
  // Extra content inside the red band, e.g. the donor card on Home. It
  // overlaps the band's lower edge so the page reads as one piece.
  hero?: ReactNode;
  children: ReactNode;
  // Set false for screens that render their own FlatList.
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: ViewStyle;
};

const HERO_OVERLAP = 56;

type Measurable = Pick<View, 'measureInWindow'>;

// Lets content inside a scrolling Screen ask to be scrolled clear of the
// keyboard, e.g. an input whose suggestion list just opened below it.
const RevealContext = createContext<(node: Measurable | null) => void>(() => {});
export const useReveal = () => useContext(RevealContext);

// Page shell: red header band (safe-area aware) over a warm background,
// with width-capped content below.
export default function Screen({
  title, subtitle, back, right, hero, children, scroll = true, refreshing, onRefresh, contentStyle,
}: Props) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const keyboardTop = useRef<number | null>(null);
  // A reveal asked for before the keyboard finished opening, run once it has.
  const pending = useRef<Measurable | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Android draws edge to edge, so the keyboard covers the page instead of
  // shrinking it. Scroll whatever was asked for into the space above it.
  const reveal = useCallback((node: Measurable | null) => {
    if (!node) return;
    if (keyboardTop.current === null) { pending.current = node; return; }
    node.measureInWindow((_x, y, _width, height) => {
      const top = insets.top + space.md;
      const hiddenBelow = y + height + space.md - keyboardTop.current!;
      // Never scroll the node's top out of view, even if it can't fit.
      const by = Math.min(hiddenBelow, y - top);
      if (by > 0) scrollRef.current?.scrollTo({ y: scrollY.current + by, animated: true });
    });
  }, [insets.top]);

  useEffect(() => {
    if (!scroll) return;
    const shown = Keyboard.addListener('keyboardDidShow', event => {
      keyboardTop.current = event.endCoordinates.screenY;
      setKeyboardHeight(event.endCoordinates.height);
      // Wait for the extra padding to lay out so there is room to scroll.
      const node = pending.current ?? (TextInput.State.currentlyFocusedInput() as Measurable | null);
      pending.current = null;
      requestAnimationFrame(() => reveal(node));
    });
    const hidden = Keyboard.addListener('keyboardDidHide', () => {
      keyboardTop.current = null;
      pending.current = null;
      setKeyboardHeight(0);
    });
    return () => { shown.remove(); hidden.remove(); };
  }, [scroll, reveal]);

  const band = (
    <View style={[styles.band, { paddingTop: insets.top + space.md }, hero ? { paddingBottom: HERO_OVERLAP + space.md } : null]}>
      <View style={styles.bar}>
        {back && (
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={({ pressed }) => [styles.back, pressed && { opacity: 0.7 }]}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
          </Pressable>
        )}
        <View style={styles.titles}>
          {title && (
            <Text variant={back ? 'heading' : 'title'} color="#fff" numberOfLines={1}>{title}</Text>
          )}
          {subtitle && <Text variant="caption" color="rgba(255,255,255,0.78)" numberOfLines={1}>{subtitle}</Text>}
        </View>
        {right && <View style={styles.right}>{right}</View>}
      </View>
    </View>
  );

  const body = (
    <>
      {hero && <View style={styles.hero}>{hero}</View>}
      {children}
    </>
  );

  return (
    <View style={styles.page}>
      {scroll ? (
        <ScrollView
          ref={scrollRef}
          onScroll={event => { scrollY.current = event.nativeEvent.contentOffset.y; }}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: (back ? insets.bottom : 0) + space.xxl + keyboardHeight }}
          keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh && (
            <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor="#fff" colors={[palette.blood]} />
          )}
        >
          {band}
          <RevealContext.Provider value={reveal}>
            <View style={[styles.content, hero ? null : styles.contentTop, contentStyle]}>{body}</View>
          </RevealContext.Provider>
        </ScrollView>
      ) : (
        <View style={[styles.fill, { paddingBottom: back ? insets.bottom : 0 }]}>
          {band}
          <View style={[styles.fill, styles.content, hero ? null : styles.contentTop, contentStyle]}>{body}</View>
        </View>
      )}
    </View>
  );
}

// Round white button for the red header band.
export function HeaderButton({ icon, onPress, label }: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.back, pressed && { opacity: 0.7 }]}
    >
      <MaterialCommunityIcons name={icon} size={22} color="#fff" />
    </Pressable>
  );
}

export const CONTENT_MAX_WIDTH = 720;

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: palette.paper,
  },
  band: {
    backgroundColor: palette.blood,
    paddingHorizontal: space.lg,
    paddingBottom: space.xl,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  titles: {
    flex: 1,
  },
  right: {
    flexDirection: 'row',
    gap: space.sm,
  },
  hero: {
    marginTop: -HERO_OVERLAP,
  },
  content: {
    paddingHorizontal: space.lg,
    gap: space.xl,
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
  },
  contentTop: {
    paddingTop: space.xl,
  },
  fill: {
    flex: 1,
  },
});
