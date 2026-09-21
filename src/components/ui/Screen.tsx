import { ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
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

// Page shell: red header band (safe-area aware) over a warm background,
// with width-capped content below.
export default function Screen({
  title, subtitle, back, right, hero, children, scroll = true, refreshing, onRefresh, contentStyle,
}: Props) {
  const insets = useSafeAreaInsets();

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
          contentContainerStyle={{ paddingBottom: (back ? insets.bottom : 0) + space.xxl }}
          keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh && (
            <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor="#fff" colors={[palette.blood]} />
          )}
        >
          {band}
          <View style={[styles.content, hero ? null : styles.contentTop, contentStyle]}>{body}</View>
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
