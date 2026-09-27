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
import { UserProfile } from '@/shared/types';
import { StringKey, useI18n } from '@/src/i18n';

type Step = 'account' | 'details';

export default function Register() {
  const { t } = useI18n();
  const [step, setStep] = useState<Step>('account');
  const [account, setAccount] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleNext = () => {
    if (!account.email || !account.password || !account.confirmPassword) {
      showMessage(t('auth.missingDetails'), t('auth.register.missing'));
      return;
    }
    if (account.password.length < 6) {
      showMessage(t('auth.register.passwordShort'), t('auth.register.passwordShortMessage'));
      return;
    }
    if (account.password !== account.confirmPassword) {
      showMessage(t('auth.register.passwordMismatch'), t('auth.register.passwordMismatchMessage'));
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
      let errorMessage: StringKey = 'auth.register.failedMessage';

      // Handle specific Firebase Auth errors
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'auth.register.emailInUse';
          break;
        case 'auth/invalid-email':
          errorMessage = 'auth.invalidEmail';
          break;
        case 'auth/weak-password':
          errorMessage = 'auth.register.weakPassword';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'auth.register.noInternet';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'auth.tooManyRequests';
          break;
        default:
          console.error('Registration error:', error);
      }

      showMessage(t('auth.register.failed'), t(errorMessage));
    }
  };

  const stepNumber = step === 'account' ? 1 : 2;

  return (
    <Screen
      back
      title={step === 'account' ? t('auth.register.accountTitle') : t('auth.register.detailsTitle')}
      subtitle={t('auth.register.step', { step: stepNumber })}
    >
      <View style={styles.progress}>
        <View style={[styles.segment, styles.segmentDone]} />
        <View style={[styles.segment, stepNumber === 2 && styles.segmentDone]} />
      </View>

      {step === 'account' ? (
        <View>
          <Field
            label={t('auth.email')}
            value={account.email}
            onChangeText={(text) => setAccount({...account, email: text})}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <Field
            label={t('auth.password')}
            value={account.password}
            onChangeText={(text) => setAccount({...account, password: text})}
            secureTextEntry
            hint={t('auth.register.passwordHint')}
          />
          <Field
            label={t('auth.register.confirmPassword')}
            value={account.confirmPassword}
            onChangeText={(text) => setAccount({...account, confirmPassword: text})}
            secureTextEntry
          />
          <Button label={t('auth.register.continue')} onPress={handleNext} />
        </View>
      ) : (
        <View>
          <Text variant="body" color={palette.inkMuted} style={styles.intro}>
            {t('auth.register.intro')}
          </Text>
          <DonorForm showLastDonation submitLabel={t('auth.register.submit')} onSubmit={handleRegister} />
          <Button
            label={t('auth.register.backToAccount')}
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
