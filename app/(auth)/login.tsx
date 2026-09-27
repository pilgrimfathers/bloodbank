import React, { useState, useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { auth } from '@/src/config/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { showMessage } from '@/src/utils/dialog';
import { palette, space } from '@/src/theme';
import Field from '@/src/components/Field';
import Button from '@/src/components/ui/Button';
import Screen from '@/src/components/ui/Screen';
import Text from '@/src/components/ui/Text';
import { StringKey, useI18n } from '@/src/i18n';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        router.replace('/(tabs)/home');
      }
    });

    if (auth.currentUser) {
      router.replace('/(tabs)/home');
    }

    return unsubscribe;
  }, [auth]);

  const handleLogin = async () => {
    if (!email || !password) {
      showMessage(t('auth.missingDetails'), t('auth.login.missing'));
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // No need to manually navigate here as the auth state change will trigger the useEffect
    } catch (error: any) {
      let errorMessage: StringKey = 'auth.login.failedMessage';

      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = 'auth.invalidEmail';
          break;
        case 'auth/user-not-found':
          errorMessage = 'auth.login.userNotFound';
          break;
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          errorMessage = 'auth.login.wrongPassword';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'auth.tooManyRequests';
          break;
      }

      showMessage(t('auth.login.failed'), t(errorMessage));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen back title={t('auth.login.title')} subtitle={t('auth.login.subtitle')}>
      <View>
        <Field
          label={t('auth.email')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <Field
          label={t('auth.password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />
        <Button label={t('auth.login.title')} onPress={handleLogin} loading={loading} />
      </View>

      <View style={styles.links}>
        <Pressable onPress={() => router.push('/(auth)/register')} accessibilityRole="link" hitSlop={8}>
          <Text variant="body" color={palette.inkMuted} style={styles.center}>
            {t('auth.login.newHere')} <Text variant="bodyStrong" color={palette.blood}>{t('auth.login.createAccount')}</Text>
          </Text>
        </Pressable>
        <Pressable onPress={() => router.push('/privacy')} accessibilityRole="link" hitSlop={8}>
          <Text variant="label" color={palette.inkMuted} style={styles.center}>{t('auth.privacyPolicy')}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  links: {
    gap: space.lg,
    alignItems: 'center',
  },
  center: {
    textAlign: 'center',
  },
});
