import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform, View } from 'react-native';
import PageContainer from '../components/PageContainer';

export default function TabsLayout() {
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
        position: 'absolute',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'visible',
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
        tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" size={28} color={color} />
        ),
        }}
    />
    <Tabs.Screen
        name="search"
        options={{
        title: 'Search',
        tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="magnify" size={28} color={color} />
        ),
        }}
    />
    <Tabs.Screen
        name="add"
        options={{
        title: '',
        tabBarIcon: ({ color, size }) => (
            <View style={{
            width: 60,
            height: 60,
            backgroundColor: '#E53935',
            borderRadius: 30,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 20,
            }}>
            <MaterialCommunityIcons name="plus" size={30} color="#fff" />
            </View>
        ),
        }}
    />
    <Tabs.Screen
        name="requests"
        options={{
        title: '',
        tabBarIcon: ({ color, size }) => (
            <View style={{
            width: Platform.OS === 'web' ? 100 : 80,
            height: 80,
            backgroundColor: '#E53935',
            borderRadius: 30,
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10,
            marginBottom: Platform.OS === 'web' ? 20 : 0,
            }}>
            <MaterialCommunityIcons name="water" size={30} color="#fff" />
            </View>
        ),
        }}
    />
    <Tabs.Screen
        name="messages"
        options={{
        title: 'Messages',
        tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="message" size={28} color={color} />
        ),
        }}
    />
    <Tabs.Screen
        name="profile"
        options={{
        title: 'Profile',
        tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" size={28} color={color} />
        ),
        }}
    />
    </Tabs>
  );
} 