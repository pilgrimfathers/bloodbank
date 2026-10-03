import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/src/config/firebase';
import { showMessage } from '@/src/utils/dialog';
import { palette, space } from '@/src/theme';
import Field from '@/src/components/Field';
import Button from '@/src/components/ui/Button';
import Screen from '@/src/components/ui/Screen';
import Text from '@/src/components/ui/Text';
import { StringKey, useI18n } from '@/src/i18n';

export default function ForgotPassword() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const { t } = useI18n();

  const handleSend = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      showMessage(t('auth.missingDetails'), t('auth.reset.missing'));
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, trimmed);
      setSentTo(trimmed);
    } catch (error: any) {
      let errorMessage: StringKey = 'auth.reset.failedMessage';

      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = 'auth.invalidEmail';
          break;
        // Only reported when email enumeration protection is off. Treat it
        // like success so the screen never reveals who has an account.
        case 'auth/user-not-found':
          setSentTo(trimmed);
          return;
        case 'auth/too-many-requests':
          errorMessage = 'auth.tooManyRequests';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'auth.register.noInternet';
          break;
      }

      showMessage(t('auth.reset.failed'), t(errorMessage));
    } finally {
      setLoading(false);
    }
  };

  if (sentTo) {
    return (
      <Screen back title={t('auth.reset.sentTitle')}>
        <View>
          <Text variant="body" style={styles.message}>{t('auth.reset.sentMessage', { email: sentTo })}</Text>
          <Text variant="body" color={palette.inkMuted} style={styles.message}>{t('auth.reset.checkSpam')}</Text>
          <Button label={t('auth.reset.backToLogin')} onPress={() => router.back()} />
          <Button label={t('auth.reset.resend')} variant="quiet" onPress={handleSend} loading={loading} style={styles.resend} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen back title={t('auth.reset.title')} subtitle={t('auth.reset.subtitle')}>
      <View>
        <Field
          label={t('auth.email')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          autoFocus={!email}
        />
        <Button label={t('auth.reset.submit')} onPress={handleSend} loading={loading} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  message: {
    marginBottom: space.lg,
  },
  resend: {
    marginTop: space.md,
  },
});
