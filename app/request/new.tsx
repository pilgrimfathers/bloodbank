import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Platform } from 'react-native';
import { router } from 'expo-router';
import { auth, firestore } from '../config/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { BloodRequest } from '../types';
import PageContainer from '../components/PageContainer';
import BackButton from '../components/BackButton';

const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const urgencyLevels = ['low', 'medium', 'high'] as const;

export default function NewRequestScreen() {
  const [formData, setFormData] = useState({
    bloodType: '',
    units: '',
    urgency: '' as typeof urgencyLevels[number],
    hospital: '',
    location: '',
    contactNumber: '',
  });

  const handleSubmit = async () => {
    try {
      if (!formData.bloodType || !formData.units || !formData.urgency || !formData.hospital || !formData.location) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'You must be logged in to create a request');
        return;
      }

      const request: Omit<BloodRequest, 'id'> = {
        requesterId: user.uid,
        requesterName: user.displayName || 'Anonymous',
        bloodType: formData.bloodType,
        units: parseInt(formData.units),
        urgency: formData.urgency,
        hospital: formData.hospital,
        location: formData.location,
        status: 'open',
        createdAt: new Date(),
        contactNumber: formData.contactNumber,
      };

      await addDoc(collection(firestore, 'bloodRequests'), request);
      Alert.alert('Success', 'Blood request created successfully');
      router.back();
    } catch (error) {
      console.error('Error creating request:', error);
      Alert.alert('Error', 'Failed to create blood request');
    }
  };

  return (
    <PageContainer>
      <BackButton />
      <ScrollView style={styles.wrapper}>
        <View style={styles.container}>
          <View style={styles.formCard}>
            <Text style={styles.title}>Create Blood Request</Text>

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
              placeholder="Units Needed"
              value={formData.units}
              onChangeText={(text) => setFormData({...formData, units: text})}
              keyboardType="numeric"
            />

            <View style={styles.urgencyContainer}>
              {urgencyLevels.map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.urgencyButton,
                    formData.urgency === level && styles.urgencySelected,
                    { backgroundColor: level === 'high' ? '#ffebee' : level === 'medium' ? '#fff3e0' : '#e8f5e9' }
                  ]}
                  onPress={() => setFormData({...formData, urgency: level})}
                >
                  <Text style={[
                    styles.urgencyText,
                    formData.urgency === level && styles.urgencyTextSelected,
                    { color: level === 'high' ? '#c62828' : level === 'medium' ? '#ef6c00' : '#2e7d32' }
                  ]}>{level.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.input}
              placeholder="Hospital Name"
              value={formData.hospital}
              onChangeText={(text) => setFormData({...formData, hospital: text})}
            />

            <TextInput
              style={styles.input}
              placeholder="Location"
              value={formData.location}
              onChangeText={(text) => setFormData({...formData, location: text})}
            />

            <TextInput
              style={styles.input}
              placeholder="Contact Number"
              value={formData.contactNumber}
              onChangeText={(text) => setFormData({...formData, contactNumber: text})}
              keyboardType="phone-pad"
            />

            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>Create Request</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </PageContainer>
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
  formCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#E53935',
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
  urgencyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  urgencyButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  urgencySelected: {
    backgroundColor: '#E53935',
  },
  urgencyText: {
    fontWeight: 'bold',
  },
  urgencyTextSelected: {
    color: 'white',
  },
  submitButton: {
    backgroundColor: '#E53935',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    maxWidth: Platform.OS === 'web' ? 400 : '100%',
    alignSelf: 'center',
    width: '100%',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 