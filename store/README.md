# Google Play listing: Blood Bank Kerala

Everything needed for the Play Console store listing. Copy the text blocks as they are.

- Images: [`screenshots/`](screenshots/)
- Edit the images in [`listing.html`](listing.html), then re-render with `node store/render.cjs` (needs `puppeteer-core` and Google Chrome).

---

## Main store listing

Play Console → **Grow users → Store presence → Main store listing**

### App name (max 30 characters)

```
Blood Bank Kerala
```

### Short description (max 80 characters)

```
Find blood donors across Kerala. Track your donations and when you can give again.
```

### Full description (max 4000 characters)

```
Blood Bank Kerala connects people who need blood with willing donors across all 14 districts of Kerala, from Thiruvananthapuram to Kasaragod. It is run by volunteers, and it is free.

FOR DONORS
• Register once with your blood group, district and phone number.
• See exactly when you can donate again. The ring around your blood group fills up over the 6 months after each donation, and the app reminds you on the day you are ready.
• Log your donations and keep your full donation history in one place.
• Get a notification when someone needs your blood group. Volunteers review every request first, so you only hear about real needs.
• Turn off "Available to donate" any time you need a break.

FOR PEOPLE WHO NEED BLOOD
• Post a request with the patient's blood group, units needed, hospital and district.
• Volunteers find donors who match and can donate today, and alert them.
• Donors can call or WhatsApp you in one tap.

FOR VOLUNTEERS
• Search donors by district, blood group and eligibility.
• See compatible blood groups for every request.
• Call or WhatsApp donors, log donations and track how many units each request still needs.
• Add donors who don't use a smartphone, verify new donors, and keep the list up to date.
• A web console for larger screens at bloodbank-kerala.vercel.app.

YOUR PRIVACY
• Only volunteers can see donor phone numbers, and only for the districts they manage.
• We never sell your data or show ads.
• Delete your account and all your data from your profile at any time.

Every drop counts. Register today and be the reason someone goes home.
```

### Graphics

| Asset | File | Size |
|---|---|---|
| App icon | `screenshots/icon-512.png` | 512 × 512 PNG |
| Feature graphic | `screenshots/feature-graphic-1024x500.jpg` | 1024 × 500 JPEG |
| Phone screenshots (upload in this order) | `screenshots/01-home.jpg` … `06-profile.jpg` | 1080 × 1920 JPEG |

Screenshot order and what each shows:

1. `01-home.jpg`: Know the day you can give again (home, cool-off ring)
2. `02-requests.jpg`: Every request, across all 14 districts
3. `03-request-detail.jpg`: Call the family in one tap
4. `04-volunteer-donors.jpg`: Volunteers find the right donor, fast
5. `05-notifications.jpg`: Alerted when your blood group is needed
6. `06-profile.jpg`: Every donation, remembered

Tablet screenshots are optional; skip them.

---

## Store settings

Play Console → **Grow users → Store presence → Store settings**

| Field | Value |
|---|---|
| App category | **Medical** |
| Tags | Blood donation, Health, Community |
| Email | `pilgrimfathers@gmail.com` |
| Website | `https://bloodbank-kerala.vercel.app` |
| Phone | Leave empty (optional) |

---

## App content (policy forms)

Play Console → **Policy and programs → App content**

| Section | Answer |
|---|---|
| Privacy policy | `https://bloodbank-kerala.vercel.app/privacy` |
| Ads | No, the app has no ads |
| App access | All or some functionality is restricted → add a test donor account (email + password) with instructions: "Log in with the details below. The Donors tab is for volunteers only." |
| Content rating | Fill the questionnaire: category **Reference, news, or educational**; no violence, sexual content, gambling or drugs; users can communicate (phone numbers are shared for donations) |
| Target audience | **18 and over** (blood donors must be adults) |
| News app | No |
| Health apps | Declare: the app helps coordinate blood donation; it does not diagnose or treat conditions |
| Government app | No |
| Financial features | None |
| Data deletion URL | `https://bloodbank-kerala.vercel.app/delete-account` |

### Data safety answers

**Does your app collect or share user data?** Yes, collects. Not shared with third parties.
**Is all data encrypted in transit?** Yes.
**Can users request deletion?** Yes (in the app under Profile, and at the deletion URL).

| Data type | Collected | Purpose | Optional? |
|---|---|---|---|
| Name | Yes | App functionality, Account management | Required |
| Email address | Yes | Account management | Required |
| Phone number | Yes | App functionality (volunteers call donors) | Required |
| Approximate location (district and town the user types) | Yes | App functionality | Required |
| Health info (blood group, medical conditions, donation history) | Yes | App functionality | Blood group required; medical conditions optional |
| Device or other IDs (notification token) | Yes | App functionality (notifications) | Optional (only if notifications are allowed) |

Not collected: precise location, contacts, photos, messages, financial info, web browsing, app activity for analytics.

---

## Release notes

For release `2.0.0`:

```
<en-US>
Blood Bank is now Blood Bank Kerala, covering all 14 districts.
• Fresh new design
• See when you can donate again: a 6-month cool-off, tracked for you
• Log your donations and see your history
• Alerts when someone needs your blood group
• Post blood requests; volunteers find matching donors
• Call or WhatsApp in one tap
• Edit your profile, or delete your account any time
</en-US>
```
