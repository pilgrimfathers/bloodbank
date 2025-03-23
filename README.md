# Blood Bank App 🩸

A cross-platform mobile application built with Expo and React Native that connects blood donors with those in need.

## Features

- 🔐 Secure authentication with Firebase
- 👤 User profiles for donors and requesters
- 🏥 Create and manage blood donation requests
- 🔍 Search and filter blood requests
- 📱 Cross-platform support (iOS, Android, Web)
- 📍 Location-based request tracking
- 📊 Real-time status updates

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
   - Update the Firebase config in `app/config/firebase.ts`

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
app/
├── (auth)/          # Authentication screens
│   ├── _layout.tsx  # Auth layout configuration
│   ├── login.tsx    # Login screen
│   └── register.tsx # Registration screen
├── (tabs)/          # Main app tabs
│   ├── _layout.tsx  # Tabs layout configuration
│   ├── home.tsx     # Home screen
│   ├── messages.tsx # Messages screen
│   ├── profile.tsx  # User profile
│   ├── requests.tsx # Blood requests
│   └── search.tsx   # Search functionality
├── request/         # Request-related screens
│   ├── [id].tsx    # Request details screen
│   └── new.tsx     # New request screen
├── components/      # Reusable components
│   ├── BackButton.tsx
│   ├── LoadingSpinner.tsx
│   ├── PageContainer.tsx
│   ├── QuoteCarousel.tsx
│   └── SkeletonLoader.tsx
├── config/          # App configuration
│   └── firebase.ts  # Firebase configuration
├── types/          # TypeScript definitions
│   └── index.ts    # Type definitions
├── _layout.tsx     # Root layout configuration
└── index.tsx       # Landing screen
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
