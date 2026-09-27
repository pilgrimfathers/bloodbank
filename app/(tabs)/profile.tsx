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
import { LANGUAGES, useI18n } from '@/src/i18n';
import { palette, space } from '@/src/theme';
import DonationList from '@/src/components/DonationList';
import AlertsCard from '@/src/components/AlertsCard';
import DonorCard from '@/src/components/DonorCard';
import { LanguageOption } from '@/src/components/LanguageChooser';
import VisibilityPicker from '@/src/components/VisibilityPicker';
import Button from '@/src/components/ui/Button';
import { List, ListRow } from '@/src/components/ui/List';
import Pill from '@/src/components/ui/Pill';
import Screen from '@/src/components/ui/Screen';
import Section from '@/src/components/ui/Section';

const ROLE_LABELS = {
  donor: 'role.donor',
  volunteer: 'role.volunteer',
  admin: 'role.admin',
} as const;

export default function ProfileScreen() {
  const { profile } = useCurrentUser();
  const { t, districtName, language, setLanguage } = useI18n();
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
      t('profile.deleteConfirmTitle'),
      t('profile.deleteConfirmBody'),
      t('profile.deleteAccount'),
    );
    if (!ok) return;
    setDeleting(true);
    try {
      await callNotifyApi(ACCOUNT_DELETE_ENDPOINT, {});
      await auth.signOut().catch(() => {});
      showMessage(t('profile.deletedTitle'), t('profile.deletedBody'));
    } catch (error) {
      showMessage(t('profile.deleteFailed'), (error as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const handleLogout = async () => {
    const ok = await confirmAction(t('profile.logoutConfirmTitle'), t('profile.logoutConfirmBody'), t('profile.logout'));
    if (!ok) return;
    try {
      // Stop alerts to this phone before the session ends.
      if (auth.currentUser) await unregisterPushToken(auth.currentUser.uid);
      await auth.signOut();
      router.replace('/(auth)/login');
      // _layout.tsx will handle navigation due to auth state change
    } catch (error) {
      showMessage(t('profile.logoutFailed'), t('common.checkConnection'));
    }
  };

  if (!profile) {
    return (
      <Screen title={t('profile.title')}>
        <ActivityIndicator color={palette.blood} style={styles.loading} />
      </Screen>
    );
  }

  const role = profile.role ?? 'donor';
  const place = [profile.area, districtName(profile.district)].filter(Boolean).join(', ');

  return (
    <Screen
      title={profile.name}
      subtitle={profile.district ? t('common.inKerala', { district: districtName(profile.district) }) : t('profile.districtNotSet')}
      hero={
        <DonorCard
          bloodType={profile.bloodType}
          lastDonation={profile.lastDonation}
          donationCount={profile.donationCount ?? donations.length}
        />
      }
    >
      <View style={styles.actions}>
        <Button icon="water-plus" label={t('profile.iDonated')} onPress={() => router.push('/donation/new')} style={styles.flex} />
        <Button
          icon="pencil-outline"
          label={t('profile.editProfile')}
          variant="secondary"
          onPress={() => router.push('/profile/edit')}
          style={styles.flex}
        />
      </View>

      <AlertsCard />

      <Section title={t('profile.yourDetails')}>
        <View style={styles.pills}>
          <Pill label={t(ROLE_LABELS[role])} tone={role === 'donor' ? 'muted' : 'info'} />
          <Pill label={profile.verified ? t('profile.verified') : t('profile.notVerified')} tone={profile.verified ? 'kasavu' : 'muted'} />
        </View>
        <List>
          <ListRow icon="email-outline" title={profile.email || t('profile.noEmail')} subtitle={t('profile.email')} />
          <ListRow icon="phone-outline" title={profile.phoneNumber || t('common.noPhone')} subtitle={t('profile.phone')} />
          <ListRow
            icon="map-marker-outline"
            title={place || t('profile.addDistrict')}
            subtitle={t('profile.area')}
            onPress={place ? undefined : () => router.push('/profile/edit')}
          />
          {profile.address ? <ListRow icon="home-outline" title={profile.address} subtitle={t('profile.address')} /> : null}
          <ListRow
            icon={profile.isDonor ? 'hand-heart-outline' : 'pause-circle-outline'}
            title={profile.isDonor ? t('profile.available') : t('profile.notAvailable')}
            subtitle={t('profile.availableHint')}
          />
        </List>
      </Section>

      <Section title={t('profile.whoCanFind')}>
        <VisibilityPicker profile={profile} />
      </Section>

      <Section title={t('language.setting')}>
        <View style={styles.languages} accessibilityRole="radiogroup">
          {LANGUAGES.map(option => (
            <LanguageOption
              key={option.value}
              label={option.label}
              selected={(language ?? 'en') === option.value}
              onPress={() => setLanguage(option.value)}
            />
          ))}
        </View>
      </Section>

      <Section title={t('profile.history', { count: donations.length })}>
        <DonationList donations={donations} />
      </Section>

      <Button
        icon="compass-outline"
        label={t('profile.takeTour')}
        variant="quiet"
        color={palette.inkMuted}
        onPress={() => router.push('/tour')}
      />

      <Button
        icon="logout"
        label={t('profile.logout')}
        variant="quiet"
        color={palette.inkMuted}
        onPress={handleLogout}
      />

      <View style={styles.footer}>
        <Button
          icon="shield-account-outline"
          label={t('profile.privacyPolicy')}
          variant="quiet"
          color={palette.inkMuted}
          onPress={() => router.push('/privacy')}
        />
        <Button
          icon="delete-outline"
          label={t('profile.deleteAccount')}
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
  languages: {
    gap: space.md,
  },
  pills: {
    flexDirection: 'row',
    gap: space.sm,
    marginBottom: space.md,
  },
});
