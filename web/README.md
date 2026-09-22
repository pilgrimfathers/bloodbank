# Blood Bank Kerala: web console and API

Next.js app for volunteers and admins, deployed on Vercel. It also hosts the API
that the mobile app calls (notifications, see issue #10).

- Uses the same Firebase project as the mobile app. Pages talk to Firestore with
  the client SDK, so `../firestore.rules` is the security boundary.
- `src/app/api/*` routes use `firebase-admin` and verify the caller's Firebase ID
  token (`Authorization: Bearer <token>`).
- Pure logic shared with the mobile app (districts, blood types, cool-off,
  formatting, types) lives in `../shared` and is imported as `@shared/*`.

## Develop

```bash
cp .env.example .env.local   # fill in values
npm install
npm run dev
```

Open http://localhost:3000 and log in with a volunteer or admin account.

## Deploy (Vercel)

- Root directory: `web`
- Keep "Include files outside the root directory in the build step" enabled
  (needed for `../shared`)
- Add every variable from `.env.example` in Project settings > Environment variables
