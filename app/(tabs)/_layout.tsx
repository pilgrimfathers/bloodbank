import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCurrentUser } from '@/src/context/UserContext';
import { isVolunteer } from '@/src/utils/data';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, palette } from '@/src/theme';
import { useI18n } from '@/src/i18n';

export default function TabsLayout() {
  const { profile } = useCurrentUser();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();

  return (
    <Tabs screenOptions={{
    headerShown: false,
    sceneStyle: { backgroundColor: palette.paper },
    tabBarActiveTintColor: palette.blood,
    tabBarInactiveTintColor: palette.inkFaint,
    tabBarStyle: {
        backgroundColor: palette.surface,
        borderTopWidth: 0,
        elevation: 12,
        shadowColor: palette.ink,
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: -4 },
        // Grow with the home indicator / gesture bar instead of a fixed height.
        height: 64 + insets.bottom,
        paddingTop: 8,
        paddingBottom: insets.bottom + 6,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    tabBarLabelStyle: {
        fontSize: 12,
        fontFamily: fonts.medium,
        marginTop: 2,
    },
    }}>
    <Tabs.Screen
        name="home"
        options={{
        title: t('tabs.home'),
        tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="home" size={28} color={color} />
        ),
        }}
    />
    <Tabs.Screen
        name="requests"
        options={{
        title: t('tabs.requests'),
        tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="water" size={28} color={color} />
        ),
        }}
    />
    <Tabs.Screen
        name="manage"
        options={{
        title: t('tabs.donors'),
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
        title: t('tabs.profile'),
        tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="account" size={28} color={color} />
        ),
        }}
    />
    </Tabs>
  );
}
