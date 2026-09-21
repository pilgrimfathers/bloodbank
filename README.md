# Blood Bank App 🩸

A cross-platform app built with Expo and React Native that connects blood donors across Kerala with those in need, and lets volunteers manage the donor registry.

## Features

- 🔐 Secure authentication with Firebase
- 🗺️ Kerala-wide: donors and requests are tagged by district
- 🩸 Donation history with a 6-month cool-off (configurable via `COOLOFF_MONTHS` in `app/constants`)
- 🙋 Volunteer console: search donors by district, blood type (incl. compatible types) and eligibility; call/WhatsApp; log donations; verify/deactivate donors; add donors who don't use the app
- 🏥 Create and manage blood requests, find eligible donors for a request
- 📱 Cross-platform support (iOS, Android, Web)

## Roles

| Role | Can do |
|------|--------|
| `donor` | Default on sign-up. Edit own profile, log own donations, create requests |
| `volunteer` | Everything a donor can, plus manage donors in their `volunteerDistricts` (empty = all of Kerala) |
| `admin` | Everything, plus promote users to volunteer/admin and assign districts |

Roles are enforced in `firestore.rules`. To create the first admin, open your user document in the Firebase console (`users/<your uid>`) and set `role` to `admin`. After that, promote volunteers from the app (Donors tab → open user → Access).

## Data model

- `users/{id}`: profile, `district`, `role`, `lastDonation`, `donationCount`. Donors added by volunteers have `hasAccount: false`.
- `donations/{id}`: one record per donation (`donorId`, `date`, `hospital`, `requestId`, `recordedBy`). Logging or deleting a donation keeps `users.lastDonation` in sync.
- `bloodRequests/{id}`: requests, tagged with `district`.

After changing `firestore.rules` or `firestore.indexes.json`, deploy with `firebase deploy --only firestore` (project set in `.firebaserc`).

## Tech Stack

- [Expo](https://expo.dev) - React Native framework
- [Firebase](https://firebase.google.com) - Backend and Authentication
- [TypeScript](https://www.typescriptlang.org) - Type safety
- [Expo Router](https://docs.expo.dev/router/introduction) - File-based routing

## Getting Started

1. Install dependencies
   ```bash
   npm install
   ```

2. Configure Firebase
   - Create a Firebase project
   - Enable Authentication and Firestore
   - Register a Web app and put its config in `.env` as `EXPO_PUBLIC_FIREBASE_*`

3. Start the development server
   ```bash
   npx expo start
   ```

## Development Options

You can run the app in:
- [iOS Simulator](https://docs.expo.dev/workflow/ios-simulator)
- [Android Emulator](https://docs.expo.dev/workflow/android-studio-emulator)
- [Web Browser](https://docs.expo.dev/workflow/web)
- [Expo Go](https://expo.dev/client) on your physical device

## Project Structure

```
app/                # Screens only (expo-router treats every file here as a route)
├── (auth)/          # Login, register, privacy policy
├── (tabs)/          # Home, requests, donors (volunteers), profile
├── request/         # Request details, new request
├── donor/           # Donor details, add/edit donor (volunteers)
├── donation/        # Log a donation
├── profile/         # Edit own profile
└── _layout.tsx      # Root layout, auth-guarded stacks
src/
├── components/      # Shared UI
├── config/          # Firebase setup
├── constants/       # Districts, blood types, cool-off period
├── context/         # Current user provider
├── types/           # Type definitions
└── utils/           # Data access, eligibility, formatting
```

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.
