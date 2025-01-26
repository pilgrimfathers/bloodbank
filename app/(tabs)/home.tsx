import { View, Text, StyleSheet, ScrollView, Platform, RefreshControl } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { firestore, auth } from '../config/firebase';
import { BloodRequest } from '../types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import QuoteCarousel from '../components/QuoteCarousel';
import SkeletonLoader from '../components/SkeletonLoader';

export default function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [recentRequests, setRecentRequests] = useState<BloodRequest[]>([]);
  const [stats, setStats] = useState({
    totalRequests: 0,
    urgentRequests: 0,
    myDonations: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
    fetchUserName();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const userId = auth.currentUser?.uid;
      
      // Query for all open requests, ordered by creation date
      const recentQuery = query(
        collection(firestore, 'bloodRequests'),
        where('status', '==', 'open'),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      
      // Query for urgent requests count
      const urgentQuery = query(
        collection(firestore, 'bloodRequests'),
        where('urgency', '==', 'high'),
        where('status', '==', 'open')
      );

      // Query for user's donations
      const donationsQuery = query(
        collection(firestore, 'bloodRequests'),
        where('donorId', '==', userId),
        where('status', '==', 'fulfilled')
      );
      
      const [recentSnapshot, urgentSnapshot, donationsSnapshot] = await Promise.all([
        getDocs(recentQuery),
        getDocs(urgentQuery),
        getDocs(donationsQuery)
      ]);

      const recentData = recentSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as BloodRequest[];
      
      setRecentRequests(recentData);
      setStats({
        totalRequests: recentData.length,
        urgentRequests: urgentSnapshot.size,
        myDonations: donationsSnapshot.size,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
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

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return '#c62828';
      case 'medium':
        return '#ef6c00';
      default:
        return '#2e7d32';
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchData(),
        fetchUserName()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  if (loading) {
    return <SkeletonLoader />;
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.greeting}>
        <View style={styles.greetingRow}>
          <Text style={styles.greetingText}>Hello, {userName}</Text>
          <MaterialCommunityIcons name="hand-wave" size={28} color="#DEB887" />
        </View>
        <Text style={styles.greetingSubtext}>Thank you for being a lifesaver!</Text>
      </View>

      <QuoteCarousel />
      <View style={styles.contentContainer}>
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
          <Text style={styles.sectionTitle}>Recent Blood Requests</Text>
          {recentRequests.length === 0 ? (
            <Text style={styles.noRequests}>No requests found</Text>
          ) : (
            recentRequests.map(request => (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <View style={styles.bloodTypeContainer}>
                    <Text style={styles.bloodType}>{request.bloodType}</Text>
                  </View>
                  <View style={[
                    styles.urgencyBadge,
                    { backgroundColor: getUrgencyColor(request.urgency) }
                  ]}>
                    <Text style={styles.urgencyText}>
                      {request.urgency.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.hospital}>{request.hospital}</Text>
                <Text style={styles.patientName}>Patient: {request.patientName}</Text>
                <Text style={styles.location}>{request.location}</Text>
                <View style={styles.requestFooter}>
                  <Text style={styles.units}>{request.units} units needed</Text>
                  <View style={styles.dateContainer}>
                    <Text style={styles.requesterName}>by {request.requesterName}</Text>
                    <Text style={styles.date}>{request.createdAt.toLocaleDateString()}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    marginTop: Platform.OS === 'ios' ? 60 : 0,
  },
  contentContainer: {
    paddingHorizontal: Platform.OS === 'web' ? '20%' : 0,
  },
  greeting: {
    paddingHorizontal: Platform.OS === 'web' ? '20%' : 24,
    paddingVertical: 24,
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
    marginBottom: 8,
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  units: {
    color: '#E53935',
    fontWeight: '500',
  },
  date: {
    color: '#666',
    fontSize: 12,
  },
  noRequests: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
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
}); 