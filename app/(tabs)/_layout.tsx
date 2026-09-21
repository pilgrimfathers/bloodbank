import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCurrentUser } from '@/src/context/UserContext';
import { isVolunteer } from '@/src/utils/data';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabsLayout() {
  const { profile } = useCurrentUser();
  const insets = useSafeAreaInsets();

  return (
    <Tabs screenOptions={{
    headerShown: false,
    // Tab screens have no header, so keep their content below the status bar.
    sceneStyle: { paddingTop: insets.top, backgroundColor: '#fff' },
    tabBarActiveTintColor: '#E53935',
    tabBarInactiveTintColor: '#666',
    tabBarStyle: {
        backgroundColor: '#fff',
        borderTopWidth: 0,
        elevation: 10,
        // Grow with the home indicator / gesture bar instead of a fixed height.
        height: 64 + insets.bottom,
        paddingTop: 8,
        paddingBottom: insets.bottom + 6,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    tabBarLabelStyle: {
        fontSize: 12,
        marginTop: 2,
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
