// Contract between the apps and the notification API (web/src/app/api/notify).
// All endpoints take JSON and need "Authorization: Bearer <Firebase ID token>".

export const PRODUCTION_API_URL = 'https://bloodbank-kerala.vercel.app';

export const NOTIFY_ENDPOINTS = {
  // Requester (or a volunteer) after posting a request: alerts admins once.
  requestCreated: '/api/notify/request-created',
  // Admin only: alerts donors with the request's blood type.
  requestDonors: '/api/notify/request-donors',
  // Admin only: free-form message to all users, optionally filtered.
  broadcast: '/api/notify/broadcast',
} as const;

export type RequestCreatedBody = { requestId: string };

export type RequestDonorsBody = {
  requestId: string;
  // By default only donors past their cool-off are alerted.
  includeCoolingOff?: boolean;
  // By default donors across Kerala are alerted.
  districtOnly?: boolean;
  // Required to alert donors again for the same request.
  force?: boolean;
};

export type BroadcastBody = {
  title: string;
  body: string;
  bloodType?: string;
  district?: string;
};

export type NotifyResult = {
  // Number of devices the message was handed to.
  sent: number;
  // Number of people those devices belong to.
  recipients: number;
  // Set when nothing was sent on purpose, e.g. already notified.
  skipped?: 'already-notified' | 'no-recipients';
};

// Payload attached to every push, used to route taps in the app.
export type NotificationData =
  | { type: 'request'; requestId: string }
  | { type: 'broadcast' };

export const ANDROID_CHANNEL_ID = 'requests';
