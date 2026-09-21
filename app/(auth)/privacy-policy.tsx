import { StyleSheet, View } from 'react-native';
import { palette, space } from '@/src/theme';
import Screen from '@/src/components/ui/Screen';
import Section from '@/src/components/ui/Section';
import Text from '@/src/components/ui/Text';

export default function PrivacyPolicyScreen() {
  return (
    <Screen back title="Privacy policy">
      <Section title="Introduction">
        <Text variant="body">
          This privacy policy describes how Blood Bank ("we," "our," or "us") collects, uses, and shares your personal information when you use our mobile application.
        </Text>
      </Section>

      <Section title="Information we collect">
        <Bullets items={[
          'Personal information: name, email address, phone number, blood type, and location',
          'Health information: blood type and donation history',
          'Location data: your approximate location when using location-based features',
        ]} />
      </Section>

      <Section title="How we use your information">
        <Bullets items={[
          'To facilitate blood donation matches',
          'To maintain your user profile',
          'To send notifications about blood requests',
        ]} />
      </Section>

      <Section title="Data security">
        <Text variant="body">
          We implement appropriate security measures to protect your personal information from unauthorized access, alteration, or disclosure.
        </Text>
      </Section>

      <Section title="Data sharing">
        <Text variant="body" style={styles.intro}>We only share your information with:</Text>
        <Bullets items={[
          'Other users when you create or respond to blood requests',
          'Service providers who assist in our operations',
          'Law enforcement when required by law',
        ]} />
      </Section>

      <Section title="Your rights">
        <Text variant="body" style={styles.intro}>You have the right to:</Text>
        <Bullets items={[
          'Access your personal information',
          'Correct inaccurate information',
          'Opt out of communications',
        ]} />
      </Section>

      <Section title="Contact us">
        <Text variant="body">
          If you have any questions about this privacy policy, contact us at pilgrimfathers@gmail.com.
        </Text>
      </Section>

      <Text variant="caption" color={palette.inkFaint}>
        Last updated: {new Date().toLocaleDateString()}
      </Text>
    </Screen>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <View style={styles.bullets}>
      {items.map(item => (
        <View key={item} style={styles.bullet}>
          <View style={styles.dot} />
          <Text variant="body" style={styles.flex}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  intro: {
    marginBottom: space.sm,
  },
  bullets: {
    gap: space.sm,
  },
  bullet: {
    flexDirection: 'row',
    gap: space.md,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.blood,
    marginTop: 9,
  },
  flex: {
    flex: 1,
  },
});
