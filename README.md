# DentFlow Workspace v0.2

Cloud-ready MVP for DentFlow HQ.

## Features
- 3 simultaneous work chats: Valeriia / Behnia / İlayda
- Presence statuses
- Global search
- Patient chips with status flow
- Owner Panel for Valeriia
- CSV daily report
- JSON backup
- Emergency full-screen announcement
- Languages: RU / EN / TR / FA
- Themes: Paper / Forest / Ocean / Sakura / Night
- Firebase-ready with localStorage fallback

## Local test
```bash
npm install
npm run dev
```
Open http://localhost:3000

## Firebase environment variables for Vercel
Create these in Vercel → Project → Settings → Environment Variables:

NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

## Firebase collections used
- messages
- patients
- presence
- system/emergency

## Firestore temporary rules for first private test
Use only while testing with trusted users. Later replace with Auth rules.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```
