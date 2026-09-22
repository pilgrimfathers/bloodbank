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

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

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
      showMessage('Missing details', 'Enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // No need to manually navigate here as the auth state change will trigger the useEffect
    } catch (error: any) {
      let errorMessage = 'Could not log in. Check your connection and try again.';

      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = 'That email address is not valid.';
          break;
        case 'auth/user-not-found':
          errorMessage = 'No account uses this email. Create an account instead.';
          break;
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          errorMessage = 'The email or password is incorrect.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many attempts. Wait a few minutes and try again.';
          break;
      }

      showMessage('Could not log in', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen back title="Log in" subtitle="Welcome back">
      <View>
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />
        <Button label="Log in" onPress={handleLogin} loading={loading} />
      </View>

      <View style={styles.links}>
        <Pressable onPress={() => router.push('/(auth)/register')} accessibilityRole="link" hitSlop={8}>
          <Text variant="body" color={palette.inkMuted} style={styles.center}>
            New here? <Text variant="bodyStrong" color={palette.blood}>Create an account</Text>
          </Text>
        </Pressable>
        <Pressable onPress={() => router.push('/privacy')} accessibilityRole="link" hitSlop={8}>
          <Text variant="label" color={palette.inkMuted} style={styles.center}>Privacy policy</Text>
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
