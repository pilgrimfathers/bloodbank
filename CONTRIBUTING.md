# Contributing to Blood Bank App

Thank you for your interest in contributing to Blood Bank App! This document provides guidelines and steps for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## How to Contribute

1. Fork the repository
2. Create a new branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Run tests: `npm test`
5. Commit your changes: `git commit -m 'Add some feature'`
6. Push to your fork: `git push origin feature/your-feature-name`
7. Create a Pull Request

## Development Setup

```bash
# Install dependencies
npm install

# Start development server
npx expo start
```

## Firestore Database Guidelines

### Database Setup
1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Copy the configuration from your Firebase project settings
3. Create a `.env` file in the root directory with your Firebase credentials
4. Enable Firestore Database in your Firebase project

### Database Modifications
When making changes to the database structure:
1. Document all schema changes in `/docs/database-schema.md`
2. Update security rules in [`firestore.rules`](./firestore.rules)
3. Provide migration scripts if changing existing collections
4. Test queries locally before submitting PR

### Security Considerations
- Never commit Firebase credentials
- Always use security rules to restrict data access
- Test rules using Firebase Emulator Suite
- Document any new indexes required for queries

### Local Development
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Start Firebase Emulator
firebase emulator:start
```

## Pull Request Guidelines

- Update documentation for any new features
- Maintain code style and formatting
- Write clear commit messages
- Include tests for new features

## Bug Reports

Please use the issue tracker and include:
- Clear description of the issue
- Steps to reproduce
- Expected behavior
- Screenshots if applicable
- Device/environment information

## Feature Requests

We welcome feature requests! Please include:
- Clear description of the feature
- Use cases
- Potential implementation approach

## Questions?

Feel free to open an issue for any questions about contributing.

Thank you for helping make Blood Bank App better! 🩸 