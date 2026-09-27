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
import { palette, radius, space } from '@/src/theme';
import VisibilityPicker from '@/src/components/VisibilityPicker';
import Button from '@/src/components/ui/Button';
import Text from '@/src/components/ui/Text';

type Icon = keyof typeof MaterialCommunityIcons.glyphMap;

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
  const [index, setIndex] = useState(0);

  if (!profile) return null;

  const steps = buildSteps(profile);
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
        <Text variant="label" color={palette.inkMuted}>{index + 1} of {steps.length}</Text>
        {!last && <Button label="Skip" variant="quiet" color={palette.inkMuted} onPress={finish} />}
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
              label="Back"
              variant="secondary"
              onPress={() => setIndex(index - 1)}
              style={styles.flex}
            />
          )}
          <Button
            label={last ? 'Start using the app' : 'Next'}
            onPress={last ? finish : () => setIndex(index + 1)}
            style={styles.flex}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

function buildSteps(profile: UserProfile): Step[] {
  const firstName = profile.name?.split(' ')[0];
  const steps: Step[] = [
    {
      key: 'welcome',
      icon: 'water',
      tone: palette.blood,
      tint: palette.bloodTint,
      title: firstName ? `Welcome, ${firstName}` : 'Welcome',
      intro: 'Blood Bank Kerala connects blood donors with patients across all 14 districts. Volunteers run it, and it is free. Here is a quick look at how it works and how your details are kept safe.',
    },
    {
      key: 'card',
      icon: 'card-account-details-outline',
      tone: palette.leaf,
      tint: palette.leafTint,
      title: 'Your donor card',
      intro: 'The card at the top of Home shows your blood group and whether you can donate today.',
      points: [
        { icon: 'calendar-clock', text: `After you donate, there is a ${COOLOFF_MONTHS}-month gap before you can give again. The ring counts down the days.` },
        { icon: 'hand-heart', text: 'Tap "I donated" after each donation, so nobody asks you too early.' },
        { icon: 'bell-ring-outline', text: 'We remind you on the day you can donate again.' },
      ],
    },
    {
      key: 'requests',
      icon: 'water-plus',
      tone: palette.blood,
      tint: palette.bloodTint,
      title: 'Requests for blood',
      intro: 'When a patient needs blood, anyone can post a request from Home with "Request blood".',
      points: [
        { icon: 'format-list-bulleted', text: 'Open requests near you show on Home, and all of them on the Requests tab.' },
        { icon: 'account-group-outline', text: 'Volunteers are told right away, and they call matching donors.' },
        { icon: 'phone-outline', text: 'The contact number in a request is visible to everyone signed in, so they can call. Use a number the family is happy to share.' },
      ],
    },
    {
      key: 'find',
      icon: 'account-search',
      tone: palette.info,
      tint: palette.infoTint,
      title: 'Find donors',
      intro: 'You can also look for donors yourself from "Find donors" on Home.',
      points: [
        { icon: 'eye-outline', text: 'You only see donors who chose to be listed, and only what they agreed to share.' },
        { icon: 'send-outline', text: `If a donor's number is hidden, tap "Ask to donate" to send them your request. You can ask up to ${DAILY_ASK_LIMIT} donors a day.` },
        { icon: 'phone-in-talk-outline', text: 'The donor gets a notification and calls you if they can help.' },
      ],
    },
    {
      key: 'alerts',
      icon: 'bell-ring-outline',
      tone: palette.info,
      tint: palette.infoTint,
      title: 'Request alerts',
      intro: `Get a notification when someone needs ${profile.bloodType || 'your blood group'} blood, or when a person asks you directly.`,
      action: <AlertsStep uid={profile.id} />,
    },
    {
      key: 'visibility',
      icon: 'account-eye-outline',
      tone: palette.leaf,
      tint: palette.leafTint,
      title: 'Who can find you',
      intro: 'You decide whether people who need blood can find you. Private is the default: only volunteers can see you.',
      action: (
        <>
          <VisibilityPicker profile={profile} />
          <Text variant="caption" color={palette.inkMuted} style={styles.hint}>
            Change this any time in Profile, under "Who can find you".
          </Text>
        </>
      ),
    },
    {
      key: 'privacy',
      icon: 'shield-lock-outline',
      tone: palette.kasavu,
      tint: palette.kasavuTint,
      title: 'Your data stays yours',
      intro: 'What we keep, who sees it, and how to take it back.',
      points: [
        { icon: 'account-tie-outline', text: 'Volunteers see your details, including your phone number, only for the districts they manage, and only to arrange donations.' },
        { icon: 'eye-off-outline', text: 'Your address, email, medical conditions and donation dates are never shown to the public.' },
        { icon: 'map-marker-off-outline', text: 'We never track your location. We only know the district and area you enter.' },
        { icon: 'pause-circle-outline', text: 'Turn off "Available to donate" in Edit profile to stop being called.' },
        { icon: 'delete-outline', text: 'Delete your account from Profile at any time. It erases your profile, donation history and requests.' },
        { icon: 'cash-off', text: 'We never sell your data or use it for ads.' },
      ],
      action: (
        <Button
          icon="shield-account-outline"
          label="Read the privacy policy"
          variant="secondary"
          onPress={() => router.push('/privacy')}
        />
      ),
    },
  ];

  if (isVolunteer(profile)) {
    const districts = profile.volunteerDistricts?.length ? profile.volunteerDistricts.join(', ') : 'all of Kerala';
    steps.push({
      key: 'volunteer',
      icon: 'account-group',
      tone: palette.info,
      tint: palette.infoTint,
      title: profile.role === 'admin' ? 'Your admin tools' : 'Your volunteer tools',
      intro: `You manage donors in ${districts}. The Donors tab is only visible to volunteers and admins.`,
      points: [
        { icon: 'account-plus-outline', text: "Add donors who don't use the app, and verify or deactivate donors." },
        { icon: 'water-check-outline', text: 'Log donations, including ones linked to a request, to start the cool-off.' },
        { icon: 'bullhorn-outline', text: 'From a request, use "Notify donors" to alert everyone who matches.' },
        ...(profile.role === 'admin'
          ? [
              { icon: 'call-merge' as Icon, text: 'When a donor you added signs up, merge the two so history stays in one place.' },
              { icon: 'shield-crown-outline' as Icon, text: 'Change roles and districts from a donor page.' },
            ]
          : []),
        { icon: 'lock-outline', text: "Donor details are private. Use them only to arrange donations, and never share them outside the team." },
      ],
    });
  }

  steps.push({
    key: 'done',
    icon: 'heart-outline',
    tone: palette.blood,
    tint: palette.bloodTint,
    title: "You're all set",
    intro: 'Thank you for being part of Blood Bank Kerala. One donation can help up to three people.',
    points: [
      { icon: 'map-marker-outline', text: 'Keep your district and phone number up to date in Profile.' },
      { icon: 'replay', text: 'You can see this tour again from Profile.' },
    ],
  });

  return steps;
}

function AlertsStep({ uid }: { uid: string }) {
  const { permission, enable } = useAlertPermission(uid);
  if (!permission) return null;
  if (permission.granted) {
    return (
      <View style={styles.done}>
        <MaterialCommunityIcons name="check-circle" size={22} color={palette.leaf} />
        <Text variant="bodyStrong" color={palette.leaf}>Alerts are on</Text>
      </View>
    );
  }
  return (
    <>
      <Button
        icon={permission.canAskAgain ? 'bell-ring-outline' : 'cog-outline'}
        label={permission.canAskAgain ? 'Turn on alerts' : 'Open settings'}
        color={palette.info}
        onPress={enable}
      />
      <Text variant="caption" color={palette.inkMuted} style={styles.hint}>
        You can also turn them on later from Home.
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
