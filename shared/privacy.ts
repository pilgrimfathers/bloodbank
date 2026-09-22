// Single source for the privacy policy, shown in the app and at /privacy on
// the web (the URL given to Google Play). Update LAST_UPDATED on every change.

export const CONTACT_EMAIL = 'pilgrimfathers@gmail.com';
export const LAST_UPDATED = '22 September 2026';
export const WEB_BASE_URL = 'https://bloodbank-kerala.vercel.app';
export const PRIVACY_URL = `${WEB_BASE_URL}/privacy`;
export const DELETE_ACCOUNT_URL = `${WEB_BASE_URL}/delete-account`;

export type PolicySection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export const PRIVACY_POLICY: PolicySection[] = [
  {
    title: 'Who we are',
    paragraphs: [
      'Blood Bank Kerala is a volunteer-run service that connects blood donors with people who need blood across the 14 districts of Kerala. This policy explains what information the Blood Bank Kerala app and website collect, why, and what you can do about it.',
    ],
  },
  {
    title: 'Information we collect',
    bullets: [
      'Account details: your name and email address.',
      'Contact details: your phone number and, if you add it, your address.',
      'Location: the district and area or town you choose. We do not track your device location.',
      'Health information: your blood group, any medical conditions you choose to share, and your donation history (dates and hospitals).',
      'Blood requests you post: patient name, blood group, units needed, hospital, place and contact number.',
      'Device information: a notification token for your phone, so we can send you alerts.',
      'Donors without the app: volunteers may add a donor who agreed to be listed, with the same details as above.',
    ],
  },
  {
    title: 'How we use it',
    bullets: [
      'To show you when you can donate again, based on a six-month gap between donations.',
      'To let volunteers find and call suitable donors when someone needs blood.',
      'To send you notifications about blood requests that match your blood group, and a reminder when you can donate again.',
      'To keep a record of donations so the same donor is not asked too often.',
    ],
  },
  {
    title: 'Who can see your information',
    bullets: [
      'Volunteers and admins of Blood Bank Kerala can see donor details, including phone numbers, for the districts they manage. They use them only to arrange donations.',
      'Everyone who uses the app can see blood requests, including the contact number given in the request.',
      'Other donors cannot see your profile.',
      'We do not sell your information or use it for advertising.',
    ],
  },
  {
    title: 'Services we use',
    bullets: [
      'Google Firebase stores accounts and data, and delivers notifications on Android.',
      'Expo delivers push notifications to the app.',
      'Vercel hosts the website and the server that sends notifications.',
    ],
    paragraphs: ['These providers process data only to run the service for us.'],
  },
  {
    title: 'How long we keep it',
    paragraphs: [
      'We keep your information while your account is active. When you delete your account, your profile, donation history, blood requests and notification tokens are deleted permanently.',
    ],
  },
  {
    title: 'Your choices',
    bullets: [
      'Edit your details at any time from your profile.',
      'Turn off "Available to donate" to stop being contacted.',
      'Turn off notifications in your phone settings.',
      `Delete your account from Profile in the app, or at ${DELETE_ACCOUNT_URL}.`,
    ],
  },
  {
    title: 'Security',
    paragraphs: [
      'Data is sent over encrypted connections, and access is limited by role: donors see only their own details, and volunteers see only the districts they manage.',
    ],
  },
  {
    title: 'Contact',
    paragraphs: [`Questions or requests about your data: ${CONTACT_EMAIL}.`],
  },
];

// Deletes the signed-in user's account (web/src/app/api/account/delete).
export const ACCOUNT_DELETE_ENDPOINT = '/api/account/delete';
