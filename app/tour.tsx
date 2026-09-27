import { ReactNode, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { doc, updateDoc } from 'firebase/firestore';
import { firestore } from '@/src/config/firebase';
import { useCurrentUser } from '@/src/context/UserContext';
import { useAlertPermission } from '@/src/hooks/useAlertPermission';
import { COOLOFF_MONTHS } from '@/shared/constants';
import { DAILY_ASK_LIMIT } from '@/shared/donors';
import { UserProfile } from '@/shared/types';
import { isVolunteer } from '@/src/utils/data';
import { useI18n } from '@/src/i18n';
import { palette, radius, space } from '@/src/theme';
import VisibilityPicker from '@/src/components/VisibilityPicker';
import Button from '@/src/components/ui/Button';
import Text from '@/src/components/ui/Text';

type Icon = keyof typeof MaterialCommunityIcons.glyphMap;

type I18n = ReturnType<typeof useI18n>;

type Step = {
  key: string;
  icon: Icon;
  tone: string;
  tint: string;
  title: string;
  intro: string;
  points?: { icon: Icon; text: string }[];
  // Something to do on this step, e.g. choosing who can find you.
  action?: ReactNode;
};

// Saved on the profile so the tour shows once per person, not once per phone.
async function markTourSeen(uid: string) {
  await updateDoc(doc(firestore, 'users', uid), { tourSeenAt: new Date(), updatedAt: new Date() });
}

// Shown once after sign-up (see app/_layout.tsx), and from Profile any time.
export default function TourScreen() {
  const { profile } = useCurrentUser();
  const i18n = useI18n();
  const { t } = i18n;
  const [index, setIndex] = useState(0);

  if (!profile) return null;

  const steps = buildSteps(profile, i18n);
  const step = steps[index];
  const last = index === steps.length - 1;

  const finish = () => {
    if (!profile.tourSeenAt) markTourSeen(profile.id).catch(error => console.error('Error saving tour:', error));
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/home');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Text variant="label" color={palette.inkMuted}>{t('tour.progress', { step: index + 1, total: steps.length })}</Text>
        {!last && <Button label={t('common.skip')} variant="quiet" color={palette.inkMuted} onPress={finish} />}
      </View>

      <ScrollView key={step.key} contentContainerStyle={styles.content}>
        <View style={[styles.badge, { backgroundColor: step.tint }]}>
          <MaterialCommunityIcons name={step.icon} size={44} color={step.tone} />
        </View>
        <Text variant="title" style={styles.title}>{step.title}</Text>
        <Text variant="body" color={palette.inkMuted}>{step.intro}</Text>

        {step.points && (
          <View style={styles.points}>
            {step.points.map(point => (
              <View key={point.text} style={styles.point}>
                <MaterialCommunityIcons name={point.icon} size={22} color={step.tone} />
                <Text variant="body" style={styles.flex}>{point.text}</Text>
              </View>
            ))}
          </View>
        )}

        {step.action && <View style={styles.action}>{step.action}</View>}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {steps.map((s, i) => (
            <View key={s.key} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <View style={styles.buttons}>
          {index > 0 && (
            <Button
              label={t('common.back')}
              variant="secondary"
              onPress={() => setIndex(index - 1)}
              style={styles.flex}
            />
          )}
          <Button
            label={last ? t('tour.start') : t('common.next')}
            onPress={last ? finish : () => setIndex(index + 1)}
            style={styles.flex}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

function buildSteps(profile: UserProfile, { t, districtName }: I18n): Step[] {
  const firstName = profile.name?.split(' ')[0];
  const steps: Step[] = [
    {
      key: 'welcome',
      icon: 'water',
      tone: palette.blood,
      tint: palette.bloodTint,
      title: firstName ? t('tour.welcome.titleName', { name: firstName }) : t('tour.welcome.title'),
      intro: t('tour.welcome.intro'),
    },
    {
      key: 'card',
      icon: 'card-account-details-outline',
      tone: palette.leaf,
      tint: palette.leafTint,
      title: t('tour.card.title'),
      intro: t('tour.card.intro'),
      points: [
        { icon: 'calendar-clock', text: t('tour.card.gap', { months: COOLOFF_MONTHS }) },
        { icon: 'hand-heart', text: t('tour.card.logIt') },
        { icon: 'bell-ring-outline', text: t('tour.card.reminder') },
      ],
    },
    {
      key: 'requests',
      icon: 'water-plus',
      tone: palette.blood,
      tint: palette.bloodTint,
      title: t('tour.requests.title'),
      intro: t('tour.requests.intro'),
      points: [
        { icon: 'format-list-bulleted', text: t('tour.requests.where') },
        { icon: 'account-group-outline', text: t('tour.requests.volunteers') },
        { icon: 'phone-outline', text: t('tour.requests.contact') },
      ],
    },
    {
      key: 'find',
      icon: 'account-search',
      tone: palette.info,
      tint: palette.infoTint,
      title: t('tour.find.title'),
      intro: t('tour.find.intro'),
      points: [
        { icon: 'eye-outline', text: t('tour.find.listed') },
        { icon: 'send-outline', text: t('tour.find.ask', { limit: DAILY_ASK_LIMIT }) },
        { icon: 'phone-in-talk-outline', text: t('tour.find.callback') },
      ],
    },
    {
      key: 'alerts',
      icon: 'bell-ring-outline',
      tone: palette.info,
      tint: palette.infoTint,
      title: t('tour.alerts.title'),
      intro: profile.bloodType
        ? t('tour.alerts.introGroup', { group: profile.bloodType })
        : t('tour.alerts.introAny'),
      action: <AlertsStep uid={profile.id} />,
    },
    {
      key: 'visibility',
      icon: 'account-eye-outline',
      tone: palette.leaf,
      tint: palette.leafTint,
      title: t('tour.visibility.title'),
      intro: t('tour.visibility.intro'),
      action: (
        <>
          <VisibilityPicker profile={profile} />
          <Text variant="caption" color={palette.inkMuted} style={styles.hint}>
            {t('tour.visibility.hint')}
          </Text>
        </>
      ),
    },
    {
      key: 'privacy',
      icon: 'shield-lock-outline',
      tone: palette.kasavu,
      tint: palette.kasavuTint,
      title: t('tour.privacy.title'),
      intro: t('tour.privacy.intro'),
      points: [
        { icon: 'account-tie-outline', text: t('tour.privacy.volunteers') },
        { icon: 'eye-off-outline', text: t('tour.privacy.hidden') },
        { icon: 'map-marker-off-outline', text: t('tour.privacy.location') },
        { icon: 'pause-circle-outline', text: t('tour.privacy.pause') },
        { icon: 'delete-outline', text: t('tour.privacy.delete') },
        { icon: 'cash-off', text: t('tour.privacy.noAds') },
      ],
      action: (
        <Button
          icon="shield-account-outline"
          label={t('tour.privacy.read')}
          variant="secondary"
          onPress={() => router.push('/privacy')}
        />
      ),
    },
  ];

  if (isVolunteer(profile)) {
    const districts = profile.volunteerDistricts?.length
      ? profile.volunteerDistricts.map(district => districtName(district)).join(', ')
      : t('tour.volunteer.allKerala');
    steps.push({
      key: 'volunteer',
      icon: 'account-group',
      tone: palette.info,
      tint: palette.infoTint,
      title: profile.role === 'admin' ? t('tour.volunteer.titleAdmin') : t('tour.volunteer.title'),
      intro: t('tour.volunteer.intro', { districts }),
      points: [
        { icon: 'account-plus-outline', text: t('tour.volunteer.add') },
        { icon: 'water-check-outline', text: t('tour.volunteer.log') },
        { icon: 'bullhorn-outline', text: t('tour.volunteer.notify') },
        ...(profile.role === 'admin'
          ? [
              { icon: 'call-merge' as Icon, text: t('tour.volunteer.merge') },
              { icon: 'shield-crown-outline' as Icon, text: t('tour.volunteer.roles') },
            ]
          : []),
        { icon: 'lock-outline', text: t('tour.volunteer.private') },
      ],
    });
  }

  steps.push({
    key: 'done',
    icon: 'heart-outline',
    tone: palette.blood,
    tint: palette.bloodTint,
    title: t('tour.done.title'),
    intro: t('tour.done.intro'),
    points: [
      { icon: 'map-marker-outline', text: t('tour.done.update') },
      { icon: 'replay', text: t('tour.done.again') },
    ],
  });

  return steps;
}

function AlertsStep({ uid }: { uid: string }) {
  const { permission, enable } = useAlertPermission(uid);
  const { t } = useI18n();
  if (!permission) return null;
  if (permission.granted) {
    return (
      <View style={styles.done}>
        <MaterialCommunityIcons name="check-circle" size={22} color={palette.leaf} />
        <Text variant="bodyStrong" color={palette.leaf}>{t('tour.alerts.on')}</Text>
      </View>
    );
  }
  return (
    <>
      <Button
        icon={permission.canAskAgain ? 'bell-ring-outline' : 'cog-outline'}
        label={permission.canAskAgain ? t('tour.alerts.turnOn') : t('tour.alerts.openSettings')}
        color={palette.info}
        onPress={enable}
      />
      <Text variant="caption" color={palette.inkMuted} style={styles.hint}>
        {t('tour.alerts.later')}
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: palette.paper,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: space.xl,
  },
  content: {
    padding: space.xl,
    paddingTop: space.md,
  },
  badge: {
    width: 88,
    height: 88,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xl,
  },
  title: {
    marginBottom: space.sm,
  },
  points: {
    gap: space.lg,
    marginTop: space.xl,
  },
  point: {
    flexDirection: 'row',
    gap: space.md,
  },
  action: {
    marginTop: space.xl,
  },
  hint: {
    marginTop: space.sm,
  },
  done: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  footer: {
    gap: space.lg,
    paddingHorizontal: space.xl,
    paddingBottom: space.lg,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: space.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: palette.line,
  },
  dotActive: {
    width: 24,
    backgroundColor: palette.blood,
  },
  buttons: {
    flexDirection: 'row',
    gap: space.md,
  },
  flex: {
    flex: 1,
  },
});
