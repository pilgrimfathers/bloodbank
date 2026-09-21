import { View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView, RefreshControl } from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { firestore, auth } from '@/src/config/firebase';
import { BloodRequest, Donation } from '@/src/types';
import { useCurrentUser } from '@/src/context/UserContext';
import { coversDistrict, isVolunteer, mapDonation } from '@/src/utils/data';
import { showMessage } from '@/src/utils/dialog';
import DonationList from '@/src/components/DonationList';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import LoadingSpinner from '@/src/components/LoadingSpinner';
import PageContainer, { HEADER_OFFSET } from '@/src/components/PageContainer';
import BackButton from '@/src/components/BackButton';

export default function RequestDetails() {
  const { id } = useLocalSearchParams();
  const { profile } = useCurrentUser();
  const [request, setRequest] = useState<BloodRequest | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => {
    fetchRequest();
  }, [id, profile?.role]));

  const fetchRequest = async () => {
    try {
      const docRef = doc(firestore, 'bloodRequests', id as string);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setRequest({
          id: docSnap.id,
          ...docSnap.data(),
          createdAt: docSnap.data().createdAt?.toDate(),
        } as BloodRequest);
      }

      if (isVolunteer(profile)) {
        const snap = await getDocs(query(collection(firestore, 'donations'), where('requestId', '==', id)));
        setDonations(snap.docs.map(mapDonation));
      }
    } catch (error) {
      console.error('Error fetching request:', error);
      showMessage('Error', 'Failed to load request details');
    }
  };

  const handleStatusUpdate = async (newStatus: 'fulfilled' | 'closed') => {
    try {
      const requestRef = doc(firestore, 'bloodRequests', id as string);
      const updateData: any = { 
        status: newStatus,
        updatedAt: new Date()
      };

      // Donors are credited through donation records, not on the request itself.
      if (newStatus === 'fulfilled') {
        updateData.fulfilledAt = new Date();
      }

      await updateDoc(requestRef, updateData);
      router.back();
    } catch (error) {
      console.error('Error updating request:', error);
      showMessage('Error', 'Failed to update request status');
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchRequest();
    } catch (error) {
      console.error('Error refreshing request:', error);
    } finally {
      setRefreshing(false);
    }
  }, [id]);

  if (!request) {
    return <LoadingSpinner />;
  }

  const isOwner = auth.currentUser?.uid === request.requesterId;
  const isManager = coversDistrict(profile, request.district);
  const canUpdate = isOwner || isManager;

  return (
    <PageContainer>
      <BackButton />
      <ScrollView 
        style={styles.wrapper}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.bloodTypeContainer}>
                <Text style={styles.bloodType}>{request.bloodType}</Text>
              </View>
              <View style={styles.dateContainer}>
                <Text style={styles.requesterName}>by {request.requesterName}</Text>
                <Text style={styles.date}>
                  {request.createdAt.toLocaleDateString()}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.detailsContainer}>
            <View style={styles.detailsCard}>
              <DetailItem icon="account" label="Patient" value={request.patientName} />
              <DetailItem icon="account-circle" label="Requester" value={request.requesterName} />
              <DetailItem icon="hospital" label="Hospital" value={request.hospital} />
              <DetailItem icon="map-marker" label="Location" value={[request.location, request.district].filter(Boolean).join(', ')} />
              <DetailItem icon="water" label="Units Needed" value={`${request.units} units`} />
              <DetailItem icon="phone" label="Contact" value={request.contactNumber} />
              <DetailItem 
                icon="alert" 
                label="Urgency" 
                value={request.urgency.toUpperCase()}
                color={request.urgency === 'high' ? '#c62828' : request.urgency === 'medium' ? '#ef6c00' : '#2e7d32'}
              />
              <DetailItem 
                icon="information" 
                label="Status" 
                value={request.status.toUpperCase()}
                color={request.status === 'open' ? '#2e7d32' : '#666'}
                isLast
              />
            </View>
          </View>

          {isManager && request.status === 'open' && (
            <TouchableOpacity
              style={styles.findButton}
              onPress={() => router.push({
                pathname: '/(tabs)/manage',
                params: { bloodType: request.bloodType, district: request.district ?? '', requestId: request.id },
              })}
            >
              <MaterialCommunityIcons name="account-search" size={20} color="white" />
              <Text style={styles.actionButtonText}>Find eligible donors</Text>
            </TouchableOpacity>
          )}

          {canUpdate && request.status === 'open' && (
            <View style={styles.actionContainer}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#43A047' }]}
                onPress={() => handleStatusUpdate('fulfilled')}
              >
                <MaterialCommunityIcons name="check-circle" size={20} color="white" />
                <Text style={styles.actionButtonText}>Fulfill</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#666' }]}
                onPress={() => handleStatusUpdate('closed')}
              >
                <MaterialCommunityIcons name="close-circle" size={20} color="white" />
                <Text style={styles.actionButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          )}

          {isManager && (
            <View style={styles.donations}>
              <Text style={styles.sectionTitle}>Donations for this request ({donations.length}/{request.units})</Text>
              <DonationList donations={donations} />
            </View>
          )}
        </View>
      </ScrollView>
    </PageContainer>
  );
}

function DetailItem({ icon, label, value, color, isLast }: { 
  icon: string, 
  label: string, 
  value: string, 
  color?: string,
  isLast?: boolean 
}) {
  return (
    <View style={[
      styles.detailItem, 
      isLast && { borderBottomWidth: 0 }
    ]}>
      <MaterialCommunityIcons name={icon as any} size={24} color={color || '#666'} />
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={[styles.detailValue, color ? { color } : null]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    marginTop: HEADER_OFFSET,
  },
  container: {
    flex: 1,
    maxWidth: Platform.OS === 'web' ? 800 : '100%',
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    backgroundColor: 'transparent',
    borderRadius: Platform.OS === 'web' ? 12 : 0,
    marginTop: Platform.OS === 'web' ? 20 : 0,
  },
  headerContent: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bloodTypeContainer: {
    backgroundColor: '#E53935',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  bloodType: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requesterName: {
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
  },
  date: {
    color: '#666',
    fontSize: 16,
  },
  detailsContainer: {
    padding: 10,
  },
  detailsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  detailContent: {
    marginLeft: 16,
    flex: 1,
  },
  detailLabel: {
    color: '#666',
    fontSize: 14,
  },
  detailValue: {
    color: '#000',
    fontSize: 16,
    marginTop: 2,
    fontWeight: '500',
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    padding: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    minWidth: 100,
    justifyContent: 'center',
  },
  findButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1565c0',
    padding: 12,
    borderRadius: 20,
    marginHorizontal: 20,
    marginTop: 10,
  },
  donations: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
}); 