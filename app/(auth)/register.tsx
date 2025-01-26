import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { auth, firestore } from '../config/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

type Step = 'account' | 'personal' | 'medical';

export default function Register() {
  const [step, setStep] = useState<Step>('account');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phoneNumber: '',
    address: '',
    bloodType: '',
    lastDonation: '',
    medicalConditions: '',
  });

  const handleNext = () => {
    if (step === 'account') {
      if (!formData.email || !formData.password || !formData.confirmPassword) {
        Alert.alert('Error', 'Please fill in all fields');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return;
      }
      setStep('personal');
    } else if (step === 'personal') {
      if (!formData.name || !formData.phoneNumber) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }
      setStep('medical');
    }
  };

  const handleBack = () => {
    if (step === 'personal') setStep('account');
    if (step === 'medical') setStep('personal');
  };

  const handleRegister = async () => {
    try {
      if (!formData.bloodType) {
        Alert.alert('Error', 'Please select your blood type');
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );

      await updateProfile(userCredential.user, {
        displayName: formData.name
      });

      await setDoc(doc(firestore, 'users', userCredential.user.uid), {
        name: formData.name,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        address: formData.address,
        bloodType: formData.bloodType,
        lastDonation: formData.lastDonation ? new Date(formData.lastDonation) : null,
        medicalConditions: formData.medicalConditions,
        isDonor: true,
        createdAt: new Date(),
      });

    } catch (error: any) {
        console.log(error);
      let errorMessage = 'Registration failed';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Email already registered';
      }
      Alert.alert('Error', errorMessage);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'account':
        return (
          <>
            <Text style={styles.stepTitle}>Create your account</Text>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={formData.email}
              onChangeText={(text) => setFormData({...formData, email: text})}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={formData.password}
              onChangeText={(text) => setFormData({...formData, password: text})}
              secureTextEntry
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChangeText={(text) => setFormData({...formData, confirmPassword: text})}
              secureTextEntry
            />
          </>
        );
      case 'personal':
        return (
          <>
            <Text style={styles.stepTitle}>Personal Information</Text>
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={formData.name}
              onChangeText={(text) => setFormData({...formData, name: text})}
            />
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              value={formData.phoneNumber}
              onChangeText={(text) => setFormData({...formData, phoneNumber: text})}
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Address"
              value={formData.address}
              onChangeText={(text) => setFormData({...formData, address: text})}
              multiline
            />
          </>
        );
      case 'medical':
        return (
          <>
            <Text style={styles.stepTitle}>Medical Information</Text>
            <View style={styles.bloodTypeContainer}>
              {bloodTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.bloodTypeButton,
                    formData.bloodType === type && styles.bloodTypeSelected
                  ]}
                  onPress={() => setFormData({...formData, bloodType: type})}
                >
                  <Text style={[
                    styles.bloodTypeText,
                    formData.bloodType === type && styles.bloodTypeTextSelected
                  ]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Last Donation Date (Optional)"
              value={formData.lastDonation}
              onChangeText={(text) => setFormData({...formData, lastDonation: text})}
            />
            <TextInput
              style={[styles.input, { height: 100 }]}
              placeholder="Medical Conditions (Optional)"
              value={formData.medicalConditions}
              onChangeText={(text) => setFormData({...formData, medicalConditions: text})}
              multiline
            />
          </>
        );
    }
  };

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => router.back()}
      >
        <MaterialCommunityIcons name="arrow-left" size={24} color="#E53935" />
      </TouchableOpacity>
      <View style={styles.formContainer}>
        <Text style={styles.title}>Blood Bank</Text>
        <View style={styles.stepIndicator}>
          <View style={[styles.stepDot, step === 'account' && styles.activeStep]} />
          <View style={styles.stepLine} />
          <View style={[styles.stepDot, step === 'personal' && styles.activeStep]} />
          <View style={styles.stepLine} />
          <View style={[styles.stepDot, step === 'medical' && styles.activeStep]} />
        </View>
        
        {renderStep()}

        <View style={styles.buttonContainer}>
          {step !== 'account' && (
            <TouchableOpacity 
              style={[styles.button, styles.secondaryButton]} 
              onPress={handleBack}
            >
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>Back</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={[styles.button, step === 'medical' && styles.finalButton]} 
            onPress={step === 'medical' ? handleRegister : handleNext}
          >
            <Text style={styles.buttonText}>
              {step === 'medical' ? 'Register' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
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
    maxWidth: 400,
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
  bloodTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  bloodTypeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E53935',
  },
  bloodTypeSelected: {
    backgroundColor: '#E53935',
  },
  bloodTypeText: {
    color: '#E53935',
  },
  bloodTypeTextSelected: {
    color: 'white',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    backgroundColor: '#E53935',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E53935',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButtonText: {
    color: '#E53935',
  },
  backButton: {
    backgroundColor: 'transparent',
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 1,
  },
  finalButton: {
    flex: 1,
  },
});
