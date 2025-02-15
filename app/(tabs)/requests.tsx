import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { firestore } from '../config/firebase';
import { BloodRequest } from '../types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function RequestsScreen() {
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRequests = async () => {
    try {
      const q = query(collection(firestore, 'bloodRequests'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const requestsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as BloodRequest[];
      setRequests(requestsData);
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRequests();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return '#E53935';
      case 'medium': return '#FB8C00';
      case 'low': return '#43A047';
      default: return '#757575';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#43A047';
      case 'fulfilled': case 'closed': return 'green';
      default: return '#757575';
    }
  };

  const renderRequest = ({ item }: { item: BloodRequest }) => (
    <TouchableOpacity 
      style={styles.requestCard}
      onPress={() => router.push(`/request/${item.id}` as any)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.bloodTypeContainer}>
          <Text style={styles.bloodType}>{item.bloodType}</Text>
        </View>
        <View style={styles.badges}>
          <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(item.urgency) }]}>
            <Text style={styles.badgeText}>{item.urgency.toUpperCase()}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.badgeText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.hospital}>{item.hospital}</Text>
      <Text style={styles.patientName}>Patient: {item.patientName}</Text>
      <Text style={styles.location}>{item.location}</Text>
      
      <View style={styles.footer}>
        <Text style={styles.units}>{item.units} units needed</Text>
        <View style={styles.dateContainer}>
          <Text style={styles.requesterName}>by {item.requesterName}</Text>
          <Text style={styles.date}>{item.createdAt.toLocaleDateString()}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Blood Requests</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => router.push('/request/new')}
        >
          <MaterialCommunityIcons name="plus" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.listContainer}>
        <FlatList
            data={requests}
            renderItem={renderRequest}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Platform.OS === 'web' ? '20%' : 24,
    paddingVertical: 24,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#E53935',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
  },
  listContainer: {
    flex: 1,
    maxWidth: Platform.OS === 'web' ? 800 : '100%',
    alignSelf: 'center',
    width: '100%',
    padding: 20,
  },
  requestCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  bloodTypeContainer: {
    backgroundColor: '#E53935',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  bloodType: {
    color: 'white',
    fontWeight: 'bold',
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  urgencyText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  hospital: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  patientName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  location: {
    color: '#666',
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  units: {
    color: '#E53935',
    fontWeight: '500',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requesterName: {
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
  },
  date: {
    color: '#666',
    fontSize: 12,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
}); 