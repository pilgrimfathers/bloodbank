import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { auth, firestore } from '../config/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import BackButton from '../components/BackButton';
import DonorForm, { DonorFormValues } from '../components/DonorForm';
import { showMessage } from '../utils/dialog';
import { logDonation } from '../utils/data';
import { UserProfile } from '../types';

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
      showMessage('Error', 'Please fill in all fields');
      return;
    }
    if (account.password.length < 6) {
      showMessage('Error', 'Password must be at least 6 characters long');
      return;
    }
    if (account.password !== account.confirmPassword) {
      showMessage('Error', 'Passwords do not match');
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
      let errorMessage = 'Registration failed';

      // Handle specific Firebase Auth errors
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'This email is already registered';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password is too weak. Please use at least 6 characters';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your internet connection';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many attempts. Please try again later';
          break;
        default:
          console.error('Registration error:', error);
      }

      showMessage('Error', errorMessage);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <BackButton />
      <View style={styles.formContainer}>
        <Text style={styles.title}>Blood Bank</Text>
        <View style={styles.stepIndicator}>
          <View style={[styles.stepDot, step === 'account' && styles.activeStep]} />
          <View style={styles.stepLine} />
          <View style={[styles.stepDot, step === 'details' && styles.activeStep]} />
        </View>

        {step === 'account' ? (
          <>
            <Text style={styles.stepTitle}>Create your account</Text>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={account.email}
              onChangeText={(text) => setAccount({...account, email: text})}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={account.password}
              onChangeText={(text) => setAccount({...account, password: text})}
              secureTextEntry
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              value={account.confirmPassword}
              onChangeText={(text) => setAccount({...account, confirmPassword: text})}
              secureTextEntry
            />
            <TouchableOpacity style={styles.button} onPress={handleNext}>
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.stepTitle}>Donor details</Text>
            <DonorForm showLastDonation submitLabel="Register" onSubmit={handleRegister} />
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => setStep('account')}
            >
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>Back</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  formContainer: {
    padding: 20,
    paddingBottom: 60,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: '#E53935',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ddd',
  },
  activeStep: {
    backgroundColor: '#E53935',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#ddd',
    marginHorizontal: 8,
    maxWidth: 60,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#f8f8f8',
  },
  button: {
    backgroundColor: '#E53935',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E53935',
    marginTop: 12,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButtonText: {
    color: '#E53935',
  },
});
