import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import PageContainer from '../components/PageContainer';
import BackButton from '../components/BackButton';

export default function PrivacyPolicyScreen() {
  return (
    <PageContainer>
      <BackButton />
      <ScrollView style={styles.wrapper}>
        <View style={styles.container}>
          <Text style={styles.title}>Privacy Policy</Text>
          
          <Section title="Introduction">
            <Text style={styles.text}>
              This Privacy Policy describes how Blood Bank ("we," "our," or "us") collects, uses, and shares your personal information when you use our mobile application.
            </Text>
          </Section>

          <Section title="Information We Collect">
            <Text style={styles.text}>
              • Personal Information: Name, email address, phone number, blood type, and location{'\n'}
              • Health Information: Blood type and donation history{'\n'}
              • Location Data: Your approximate location when using location-based features
            </Text>
          </Section>

          <Section title="How We Use Your Information">
            <Text style={styles.text}>
              • To facilitate blood donation matches{'\n'}
              • To maintain your user profile{'\n'}
              • To send notifications about blood requests{'\n'}
            </Text>
          </Section>

          <Section title="Data Security">
            <Text style={styles.text}>
              We implement appropriate security measures to protect your personal information from unauthorized access, alteration, or disclosure.
            </Text>
          </Section>

          <Section title="Data Sharing">
            <Text style={styles.text}>
              We only share your information with:{'\n'}
              • Other users when you create or respond to blood requests{'\n'}
              • Service providers who assist in our operations{'\n'}
              • Law enforcement when required by law
            </Text>
          </Section>

          <Section title="Your Rights">
            <Text style={styles.text}>
              You have the right to:{'\n'}
              • Access your personal information{'\n'}
              • Correct inaccurate information{'\n'}
              • Opt-out of communications
            </Text>
          </Section>

          <Section title="Contact Us">
            <Text style={styles.text}>
              If you have any questions about this Privacy Policy, please contact us at:{'\n'}
              pilgrimfathers@gmail.com
            </Text>
          </Section>

          <Text style={styles.lastUpdated}>Last updated: {new Date().toLocaleDateString()}</Text>
        </View>
      </ScrollView>
    </PageContainer>
  );
}

function Section({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    marginTop: 100,
  },
  container: {
    flex: 1,
    maxWidth: Platform.OS === 'web' ? 800 : '100%',
    alignSelf: 'center',
    width: '100%',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#E53935',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    color: '#666',
  },
  lastUpdated: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
}); 