import { View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { useCallback, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { auth } from '@/src/config/firebase';
import { router, useFocusEffect } from 'expo-router';
import { Donation } from '@/src/types';
import { useCurrentUser } from '@/src/context/UserContext';
import { getDonations } from '@/src/utils/data';
import { showMessage } from '@/src/utils/dialog';
import DonationList from '@/src/components/DonationList';
import EligibilityBadge from '@/src/components/EligibilityBadge';
import LoadingSpinner from '@/src/components/LoadingSpinner';

export default function ProfileScreen() {
  const { profile } = useCurrentUser();
  const [donations, setDonations] = useState<Donation[]>([]);

  useFocusEffect(useCallback(() => {
    if (!profile?.id) return;
    getDonations(profile.id)
      .then(setDonations)
      .catch(error => console.error('Error fetching donations:', error));
  }, [profile?.id, profile?.lastDonation?.getTime()]));

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.replace('/(auth)/login');
      // _layout.tsx will handle navigation due to auth state change
    } catch (error) {
      showMessage('Error', 'Failed to logout');
    }
  };

  if (!profile) {
    return <LoadingSpinner />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <MaterialCommunityIcons name="account-circle" size={80} color="#E53935" />
        </View>
        <Text style={styles.name}>{profile.name}</Text>
        <View style={styles.badges}>
          <View style={styles.bloodTypeBadge}>
            <Text style={styles.bloodType}>{profile.bloodType}</Text>
          </View>
          {profile.role && profile.role !== 'donor' && (
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{profile.role.toUpperCase()}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <EligibilityBadge lastDonation={profile.lastDonation} variant="card" />
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/donation/new')}>
            <MaterialCommunityIcons name="water-plus" size={20} color="white" />
            <Text style={styles.primaryButtonText}>I donated</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/profile/edit')}>
            <MaterialCommunityIcons name="pencil" size={20} color="#E53935" />
            <Text style={styles.secondaryButtonText}>Edit profile</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.infoSection}>
        <InfoItem icon="email" label="Email" value={profile.email} />
        <InfoItem icon="phone" label="Phone" value={profile.phoneNumber} />
        <InfoItem
          icon="map-marker"
          label="District"
          value={[profile.area, profile.district].filter(Boolean).join(', ') || 'Not set, please edit your profile'}
        />
        <InfoItem icon="home" label="Address" value={profile.address} />
        <InfoItem
          icon="hand-heart"
          label="Availability"
          value={profile.isDonor ? 'Available to donate' : 'Not available right now'}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My donations ({donations.length})</Text>
        <DonationList donations={donations} />
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <MaterialCommunityIcons name="logout" size={24} color="white" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function InfoItem({ icon, label, value }: { icon: string, label: string, value?: string }) {
  return (
    <View style={styles.infoItem}>
      <MaterialCommunityIcons name={icon as any} size={24} color="#666" />
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || '-'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    paddingBottom: 32,
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
  badges: {
    flexDirection: 'row',
    gap: 8,
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
  roleBadge: {
    backgroundColor: '#1565c0',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  section: {
    paddingHorizontal: Platform.OS === 'web' ? '20%' : 16,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E53935',
    padding: 12,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E53935',
    padding: 12,
    borderRadius: 8,
  },
  secondaryButtonText: {
    color: '#E53935',
    fontWeight: 'bold',
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
    marginTop: 32,
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 32,
  },
  logoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
