import { View, Text, StyleSheet, ScrollView, Platform, RefreshControl, TouchableOpacity } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { collection, query, where, getDocs, orderBy, limit, getCountFromServer } from 'firebase/firestore';
import { router } from 'expo-router';
import { firestore } from '@/src/config/firebase';
import { useCurrentUser } from '@/src/context/UserContext';
import EligibilityBadge from '@/src/components/EligibilityBadge';
import { BloodRequest } from '@/src/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import QuoteCarousel from '@/src/components/QuoteCarousel';
import SkeletonLoader from '@/src/components/SkeletonLoader';

export default function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [recentRequests, setRecentRequests] = useState<BloodRequest[]>([]);
  const [stats, setStats] = useState({
    totalRequests: 0,
    urgentRequests: 0,
  });
  const { profile } = useCurrentUser();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
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
      
      const openQuery = query(
        collection(firestore, 'bloodRequests'),
        where('status', '==', 'open')
      );

      const [recentSnapshot, urgentSnapshot, openCount] = await Promise.all([
        getDocs(recentQuery),
        getCountFromServer(urgentQuery),
        getCountFromServer(openQuery),
      ]);

      const recentData = recentSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as BloodRequest[];
      
      setRecentRequests(recentData);
      setStats({
        totalRequests: openCount.data().count,
        urgentRequests: urgentSnapshot.data().count,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
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
      await fetchData();
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
          <Text style={styles.greetingText}>Hello, {profile?.name ?? ''}</Text>
          <MaterialCommunityIcons name="hand-wave" size={28} color="#DEB887" />
        </View>
        <Text style={styles.greetingSubtext}>Thank you for being a lifesaver!</Text>
      </View>

      <View style={styles.contentContainer}>
        {profile && !profile.district && (
          <TouchableOpacity style={styles.notice} onPress={() => router.push('/profile/edit')}>
            <MaterialCommunityIcons name="map-marker-alert" size={24} color="#ef6c00" />
            <Text style={styles.noticeText}>Add your district so volunteers can reach you for nearby requests. Tap to update.</Text>
          </TouchableOpacity>
        )}
        {profile && (
          <View style={styles.eligibility}>
            <EligibilityBadge lastDonation={profile.lastDonation} variant="card" />
          </View>
        )}
      </View>
      <QuoteCarousel />
      <View style={styles.contentContainer}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalRequests}</Text>
            <Text style={styles.statLabel}>Open Requests</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.urgentRequests}</Text>
            <Text style={styles.statLabel}>Urgent Needs</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profile?.donationCount ?? 0}</Text>
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
                <Text style={styles.location}>{[request.location, request.district].filter(Boolean).join(', ')}</Text>
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
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff3e0',
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
  },
  noticeText: {
    flex: 1,
    color: '#ef6c00',
  },
  eligibility: {
    paddingHorizontal: 16,
    paddingTop: 16,
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