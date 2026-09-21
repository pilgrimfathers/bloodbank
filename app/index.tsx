import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BLOOD_TYPES } from '@/src/constants';
import { palette, radius, space } from '@/src/theme';
import Button from '@/src/components/ui/Button';
import Text from '@/src/components/ui/Text';

export default function LandingScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.page}>
      <View style={[styles.band, { paddingTop: insets.top + space.xxl }]}>
        <View style={styles.inner}>
          <MaterialCommunityIcons name="water" size={56} color="#fff" />
          <Text variant="display" color="#fff" style={styles.title}>Blood Bank Kerala</Text>
          <Text variant="body" color="rgba(255,255,255,0.85)">
            Donors, volunteers and patients across all 14 districts, one phone call apart.
          </Text>
          <View style={styles.groups}>
            {BLOOD_TYPES.map(type => (
              <View key={type} style={styles.group}>
                <Text variant="bodyStrong" color="#fff">{type}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space.xl }]}>
        <View style={styles.inner}>
          <Text variant="heading">Every donation counts</Text>
          <Text variant="body" color={palette.inkMuted} style={styles.lead}>
            Sign up as a donor, track your cool-off, and help volunteers find blood when someone needs it.
          </Text>
          <Button label="Get started" onPress={() => router.push('/(auth)/login')} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: palette.paper,
  },
  band: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: palette.blood,
    paddingHorizontal: space.xl,
    paddingBottom: space.xxl,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  inner: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  title: {
    marginTop: space.lg,
    marginBottom: space.sm,
  },
  groups: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    marginTop: space.xl,
  },
  group: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  footer: {
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
  },
  lead: {
    marginTop: space.xs,
    marginBottom: space.xl,
  },
});
