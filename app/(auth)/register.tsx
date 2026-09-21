import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { auth, firestore } from '@/src/config/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import DonorForm, { DonorFormValues } from '@/src/components/DonorForm';
import Field from '@/src/components/Field';
import Button from '@/src/components/ui/Button';
import Screen from '@/src/components/ui/Screen';
import Text from '@/src/components/ui/Text';
import { showMessage } from '@/src/utils/dialog';
import { logDonation } from '@/src/utils/data';
import { palette, radius, space } from '@/src/theme';
import { UserProfile } from '@/src/types';

type Step = 'account' | 'details';

export default function Register() {
  const [step, setStep] = useState<Step>('account');
  const [account, setAccount] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleNext = () => {
    if (!account.email || !account.password || !account.confirmPassword) {
      showMessage('Missing details', 'Fill in your email and both password fields.');
      return;
    }
    if (account.password.length < 6) {
      showMessage('Password too short', 'Use at least 6 characters.');
      return;
    }
    if (account.password !== account.confirmPassword) {
      showMessage('Passwords do not match', 'Type the same password in both fields.');
      return;
    }
    setStep('details');
  };

  const handleRegister = async (values: DonorFormValues) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        account.email.trim(),
        account.password
      );
      const uid = userCredential.user.uid;

      await updateProfile(userCredential.user, {
        displayName: values.name
      });

      const { lastDonation, notes, ...details } = values;
      const profile = {
        ...details,
        email: account.email.trim(),
        role: 'donor',
        verified: false,
        status: 'active',
        hasAccount: true,
        lastDonation: null,
        donationCount: 0,
        createdBy: uid,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await setDoc(doc(firestore, 'users', uid), profile);

      // A self-reported past donation still starts the cool-off period.
      if (lastDonation) {
        await logDonation(
          { ...profile, id: uid } as UserProfile,
          { date: lastDonation, hospital: 'Self-reported at registration' },
          { id: uid, name: values.name },
        );
      }
    } catch (error: any) {
      let errorMessage = 'Registration failed. Check your connection and try again.';

      // Handle specific Firebase Auth errors
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'This email is already registered. Log in instead.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'That email address is not valid.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password is too weak. Use at least 6 characters.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'No internet connection. Check your network and try again.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many attempts. Wait a few minutes and try again.';
          break;
        default:
          console.error('Registration error:', error);
      }

      showMessage('Could not create account', errorMessage);
    }
  };

  const stepNumber = step === 'account' ? 1 : 2;

  return (
    <Screen
      back
      title={step === 'account' ? 'Create your account' : 'Donor details'}
      subtitle={`Step ${stepNumber} of 2`}
    >
      <View style={styles.progress}>
        <View style={[styles.segment, styles.segmentDone]} />
        <View style={[styles.segment, stepNumber === 2 && styles.segmentDone]} />
      </View>

      {step === 'account' ? (
        <View>
          <Field
            label="Email"
            value={account.email}
            onChangeText={(text) => setAccount({...account, email: text})}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <Field
            label="Password"
            value={account.password}
            onChangeText={(text) => setAccount({...account, password: text})}
            secureTextEntry
            hint="At least 6 characters"
          />
          <Field
            label="Confirm password"
            value={account.confirmPassword}
            onChangeText={(text) => setAccount({...account, confirmPassword: text})}
            secureTextEntry
          />
          <Button label="Continue" onPress={handleNext} />
        </View>
      ) : (
        <View>
          <Text variant="body" color={palette.inkMuted} style={styles.intro}>
            Volunteers use these details to reach you when someone nearby needs your blood group.
          </Text>
          <DonorForm showLastDonation submitLabel="Create account" onSubmit={handleRegister} />
          <Button
            label="Back to account"
            variant="quiet"
            color={palette.inkMuted}
            onPress={() => setStep('account')}
            style={styles.back}
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: {
    flexDirection: 'row',
    gap: space.sm,
  },
  segment: {
    flex: 1,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: palette.line,
  },
  segmentDone: {
    backgroundColor: palette.blood,
  },
  intro: {
    marginBottom: space.lg,
  },
  back: {
    marginTop: space.md,
  },
});
