import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

export const firebaseReady = Boolean(config.apiKey && config.projectId && config.appId);
export const app = firebaseReady ? (getApps().length ? getApps()[0] : initializeApp(config)) : null;
export const db = app
  ? (() => {
      try {
        return initializeFirestore(app, {
          ignoreUndefinedProperties: true,
          experimentalForceLongPolling: true
        });
      } catch {
        return getFirestore(app);
      }
    })()
  : null;
export const storage = app && config.storageBucket ? getStorage(app) : null;
export const auth = app ? getAuth(app) : null;

let authPromise: Promise<void> | null = null;

export function ensureFirebaseAuth() {
  if (!auth) return Promise.resolve();
  if (auth.currentUser) return Promise.resolve();
  if (!authPromise) {
    authPromise = signInAnonymously(auth)
      .then(() => undefined)
      .catch(error => {
        authPromise = null;
        throw error;
      });
  }
  return authPromise;
}
