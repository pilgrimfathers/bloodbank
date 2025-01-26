import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, ScrollView, RefreshControl } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { firestore, auth } from '../config/firebase';
import { BloodRequest } from '../types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import LoadingSpinner from '../components/LoadingSpinner';
import PageContainer from '../components/PageContainer';
import BackButton from '../components/BackButton';

export default function RequestDetails() {
  const { id } = useLocalSearchParams();
  const [request, setRequest] = useState<BloodRequest | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchRequest();
  }, [id]);

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
    } catch (error) {
      console.error('Error fetching request:', error);
      Alert.alert('Error', 'Failed to load request details');
    }
  };

  const handleStatusUpdate = async (newStatus: 'fulfilled' | 'closed') => {
    try {
      const requestRef = doc(firestore, 'bloodRequests', id as string);
      const updateData: any = { 
        status: newStatus,
        updatedAt: new Date()
      };
      
      // If request is being fulfilled, add donor information
      if (newStatus === 'fulfilled') {
        updateData.donorId = auth.currentUser?.uid;
        updateData.fulfilledAt = new Date();
      }

      await updateDoc(requestRef, updateData);
      router.back();
    } catch (error) {
      console.error('Error updating request:', error);
      Alert.alert('Error', 'Failed to update request status');
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
              <DetailItem icon="map-marker" label="Location" value={request.location} />
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

          {isOwner && request.status === 'open' && (
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
    marginTop: Platform.OS === 'web' ? 80 : 95,
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
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
}); 