import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { firestore, auth } from '../config/firebase';
import { BloodRequest } from '../types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import QuoteCarousel from '../components/QuoteCarousel';

export default function HomeScreen() {
  const [userName, setUserName] = useState('');
  const [urgentRequests, setUrgentRequests] = useState<BloodRequest[]>([]);
  const [stats, setStats] = useState({
    totalRequests: 0,
    urgentRequests: 0,
    myDonations: 0,
  });

  useEffect(() => {
    fetchData();
    fetchUserName();
  }, []);

  const fetchData = async () => {
    try {
      const urgentQuery = query(
        collection(firestore, 'bloodRequests'),
        where('urgency', '==', 'high'),
        where('status', '==', 'open'),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      
      const urgentSnapshot = await getDocs(urgentQuery);
      const urgentData = urgentSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as BloodRequest[];
      
      setUrgentRequests(urgentData);
      setStats({
        totalRequests: urgentData.length,
        urgentRequests: urgentData.length,
        myDonations: 0,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchUserName = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const userDoc = await getDoc(doc(firestore, 'users', userId));
      if (userDoc.exists()) {
        setUserName(userDoc.data().name);
      }
    } catch (error) {
      console.error('Error fetching user name:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.greeting}>
        <View style={styles.greetingRow}>
          <Text style={styles.greetingText}>Hello, {userName}</Text>
          <MaterialCommunityIcons name="hand-wave" size={28} color="#DEB887" />
        </View>
        <Text style={styles.greetingSubtext}>Thank you for being a lifesaver!</Text>
      </View>

      <QuoteCarousel />

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalRequests}</Text>
          <Text style={styles.statLabel}>Total Requests</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.urgentRequests}</Text>
          <Text style={styles.statLabel}>Urgent Needs</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.myDonations}</Text>
          <Text style={styles.statLabel}>My Donations</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Urgent Blood Needs</Text>
        {urgentRequests.length === 0 ? (
          <Text style={styles.noRequests}>No urgent requests found</Text>
        ) : (
          urgentRequests.map(request => (
            <View key={request.id} style={styles.requestCard}>
              <View style={styles.requestHeader}>
              <View style={styles.bloodTypeContainer}>
                <Text style={styles.bloodType}>{request.bloodType}</Text>
              </View>
              <Text style={styles.date}>
                {request.createdAt.toLocaleDateString()}
              </Text>
            </View>
            <Text style={styles.hospital}>{request.hospital}</Text>
            <Text style={styles.location}>{request.location}</Text>
            <Text style={styles.units}>{request.units} units needed</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  greeting: {
    padding: 20,
    paddingTop: 24,
    backgroundColor: 'white',
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  greetingText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  greetingSubtext: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E53935',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  requestCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  noRequests: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  date: {
    color: '#666',
    fontSize: 12,
  },
  hospital: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  location: {
    color: '#666',
    marginBottom: 8,
  },
  units: {
    color: '#E53935',
    fontWeight: '500',
  },
}); 