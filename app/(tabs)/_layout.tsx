import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCurrentUser } from '../context/UserContext';
import { isVolunteer } from '../utils/data';

export default function TabsLayout() {
  const { profile } = useCurrentUser();

  return (
    <Tabs screenOptions={{
    headerShown: false,
    tabBarActiveTintColor: '#E53935',
    tabBarInactiveTintColor: '#666',
    tabBarStyle: {
        backgroundColor: '#fff',
        borderTopWidth: 0,
        elevation: 10,
        height: 80,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    tabBarLabelStyle: {
        fontSize: 12,
        marginTop: 10,
        marginBottom: 5,
    },
    }}>
    <Tabs.Screen
        name="home"
        options={{
        title: 'Home',
        tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="home" size={28} color={color} />
        ),
        }}
    />
    <Tabs.Screen
        name="requests"
        options={{
        title: 'Requests',
        tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="water" size={28} color={color} />
        ),
        }}
    />
    <Tabs.Screen
        name="manage"
        options={{
        title: 'Donors',
        // Hidden from the tab bar unless the user is a volunteer or admin.
        href: isVolunteer(profile) ? '/(tabs)/manage' : null,
        tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="account-group" size={28} color={color} />
        ),
        }}
    />
    <Tabs.Screen
        name="profile"
        options={{
        title: 'Profile',
        tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="account" size={28} color={color} />
        ),
        }}
    />
    </Tabs>
  );
}
