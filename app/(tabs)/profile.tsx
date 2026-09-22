import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { auth } from '@/src/config/firebase';
import { Donation } from '@/shared/types';
import { useCurrentUser } from '@/src/context/UserContext';
import { getDonations } from '@/src/utils/data';
import { callNotifyApi, unregisterPushToken } from '@/src/utils/push';
import { ACCOUNT_DELETE_ENDPOINT } from '@/shared/privacy';
import { confirmAction, showMessage } from '@/src/utils/dialog';
import { palette, space } from '@/src/theme';
import DonationList from '@/src/components/DonationList';
import AlertsCard from '@/src/components/AlertsCard';
import DonorCard from '@/src/components/DonorCard';
import Button from '@/src/components/ui/Button';
import { List, ListRow } from '@/src/components/ui/List';
import Pill from '@/src/components/ui/Pill';
import Screen from '@/src/components/ui/Screen';
import Section from '@/src/components/ui/Section';

const ROLE_LABELS = {
  donor: 'Donor',
  volunteer: 'Volunteer',
  admin: 'Admin',
};

export default function ProfileScreen() {
  const { profile } = useCurrentUser();
  const [donations, setDonations] = useState<Donation[]>([]);

  useFocusEffect(useCallback(() => {
    if (!profile?.id) return;
    getDonations(profile.id)
      .then(setDonations)
      .catch(error => console.error('Error fetching donations:', error));
  }, [profile?.id, profile?.lastDonation?.getTime()]));

  const [deleting, setDeleting] = useState(false);

  // Google Play requires in-app account deletion. The server erases the profile,
  // donation history, requests and login in one go.
  const handleDeleteAccount = async () => {
    const ok = await confirmAction(
      'Delete your account?',
      'This permanently erases your profile, blood group, donation history and the requests you posted. It cannot be undone.',
      'Delete account',
    );
    if (!ok) return;
    setDeleting(true);
    try {
      await callNotifyApi(ACCOUNT_DELETE_ENDPOINT, {});
      await auth.signOut().catch(() => {});
      showMessage('Account deleted', 'Your account and data have been erased. Thank you for being a donor.');
    } catch (error) {
      showMessage('Could not delete account', (error as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const handleLogout = async () => {
    const ok = await confirmAction('Log out?', 'You will need your email and password to log back in.', 'Log out');
    if (!ok) return;
    try {
      // Stop alerts to this phone before the session ends.
      if (auth.currentUser) await unregisterPushToken(auth.currentUser.uid);
      await auth.signOut();
      router.replace('/(auth)/login');
      // _layout.tsx will handle navigation due to auth state change
    } catch (error) {
      showMessage('Could not log out', 'Check your connection and try again.');
    }
  };

  if (!profile) {
    return (
      <Screen title="Profile">
        <ActivityIndicator color={palette.blood} style={styles.loading} />
      </Screen>
    );
  }

  const role = profile.role ?? 'donor';
  const place = [profile.area, profile.district].filter(Boolean).join(', ');

  return (
    <Screen
      title={profile.name}
      subtitle={profile.district ? `${profile.district}, Kerala` : 'District not set'}
      hero={
        <DonorCard
          bloodType={profile.bloodType}
          lastDonation={profile.lastDonation}
          donationCount={profile.donationCount ?? donations.length}
        />
      }
    >
      <View style={styles.actions}>
        <Button icon="water-plus" label="I donated" onPress={() => router.push('/donation/new')} style={styles.flex} />
        <Button
          icon="pencil-outline"
          label="Edit profile"
          variant="secondary"
          onPress={() => router.push('/profile/edit')}
          style={styles.flex}
        />
      </View>

      <AlertsCard />

      <Section title="Your details">
        <View style={styles.pills}>
          <Pill label={ROLE_LABELS[role]} tone={role === 'donor' ? 'muted' : 'info'} />
          <Pill label={profile.verified ? 'Verified' : 'Not verified yet'} tone={profile.verified ? 'kasavu' : 'muted'} />
        </View>
        <List>
          <ListRow icon="email-outline" title={profile.email || 'No email'} subtitle="Email" />
          <ListRow icon="phone-outline" title={profile.phoneNumber || 'No phone number'} subtitle="Phone" />
          <ListRow
            icon="map-marker-outline"
            title={place || 'Add your district'}
            subtitle="Area"
            onPress={place ? undefined : () => router.push('/profile/edit')}
          />
          {profile.address ? <ListRow icon="home-outline" title={profile.address} subtitle="Address" /> : null}
          <ListRow
            icon={profile.isDonor ? 'hand-heart-outline' : 'pause-circle-outline'}
            title={profile.isDonor ? 'Available to donate' : 'Not available right now'}
            subtitle="Volunteers only call you when you are available"
          />
        </List>
      </Section>

      <Section title={`Donation history (${donations.length})`}>
        <DonationList donations={donations} />
      </Section>

      <Button
        icon="logout"
        label="Log out"
        variant="quiet"
        color={palette.inkMuted}
        onPress={handleLogout}
      />

      <View style={styles.footer}>
        <Button
          icon="shield-account-outline"
          label="Privacy policy"
          variant="quiet"
          color={palette.inkMuted}
          onPress={() => router.push('/privacy')}
        />
        <Button
          icon="delete-outline"
          label="Delete account"
          variant="quiet"
          color={palette.blood}
          loading={deleting}
          onPress={handleDeleteAccount}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: space.lg,
  },
  loading: {
    paddingVertical: space.xxl,
  },
  actions: {
    flexDirection: 'row',
    gap: space.md,
  },
  flex: {
    flex: 1,
  },
  pills: {
    flexDirection: 'row',
    gap: space.sm,
    marginBottom: space.md,
  },
});
