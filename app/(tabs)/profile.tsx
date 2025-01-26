import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { auth, firestore } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { router } from 'expo-router';
import { UserProfile } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const docRef = doc(firestore, 'users', userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setProfile({
          id: docSnap.id,
          ...docSnap.data(),
          lastDonation: docSnap.data().lastDonation?.toDate(),
        } as UserProfile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.replace('/(auth)/login');
      // _layout.tsx will handle navigation due to auth state change
    } catch (error) {
      Alert.alert('Error', 'Failed to logout');
    }
  };

  if (!profile) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <MaterialCommunityIcons name="account-circle" size={80} color="#E53935" />
        </View>
        <Text style={styles.name}>{profile.name}</Text>
        <View style={styles.bloodTypeBadge}>
          <Text style={styles.bloodType}>{profile.bloodType}</Text>
        </View>
      </View>

      <View style={styles.infoSection}>
        <InfoItem icon="email" label="Email" value={profile.email} />
        <InfoItem icon="phone" label="Phone" value={profile.phoneNumber} />
        <InfoItem icon="map-marker" label="Address" value={profile.address} />
        {profile.lastDonation && (
          <InfoItem 
            icon="calendar" 
            label="Last Donation" 
            value={profile.lastDonation.toLocaleDateString()} 
          />
        )}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <MaterialCommunityIcons name="logout" size={24} color="white" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

function InfoItem({ icon, label, value }: { icon: string, label: string, value: string }) {
  return (
    <View style={styles.infoItem}>
      <MaterialCommunityIcons name={icon as any} size={24} color="#666" />
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    marginTop: Platform.OS === 'ios' ? 60 : 0,
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  bloodTypeBadge: {
    backgroundColor: '#E53935',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  bloodType: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  infoSection: {
    backgroundColor: 'white',
    marginTop: 16,
    paddingHorizontal: Platform.OS === 'web' ? '20%' : 24,
    paddingVertical: 24,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  infoContent: {
    marginLeft: 16,
    flex: 1,
  },
  infoLabel: {
    color: '#666',
    fontSize: 14,
  },
  infoValue: {
    color: '#000',
    fontSize: 16,
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: '#E53935',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: Platform.OS === 'web' ? '20%' : '30%',
    marginHorizontal: 'auto',
  },
  logoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
}); 