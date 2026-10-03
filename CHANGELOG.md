# Changelog

Notable changes to the Blood Bank Kerala app. Versions follow `version` in
`app.json`, which is also the OTA `runtimeVersion`: bump it whenever native code
changes, and ship that version as a new store build, not an `eas update`.

## 2.1.1 - 2026-10-03 (OTA)

### Added
- Forgot password: a link on the login screen emails a Firebase reset link.
  The same flow is on the website at `/forgot-password`.

## 2.1.0 - 2026-09-28

### Changed
- Donation dates are picked from a calendar instead of typed as DD-MM-YYYY:
  logging a donation, and the last donation date when registering or adding a
  donor. Future dates can't be picked, and the optional last donation date can
  be cleared.

### Native
- Adds `@react-native-community/datetimepicker`. Needs a new build (including
  the dev client); OTA updates can't reach 2.0.0 installs.
