import admin from 'firebase-admin';
import { readFileSync } from 'node:fs';
import { env } from './env';

function initializeFirebase(): admin.firestore.Firestore {
  if (admin.apps.length === 0) {
    if (env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const serviceAccount = JSON.parse(readFileSync(env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8')) as admin.ServiceAccount;
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } else if (env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: env.FIREBASE_PROJECT_ID,
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
          privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        })
      });
    } else {
      throw new Error('Firebase credentials missing. Set FIREBASE_SERVICE_ACCOUNT_PATH or the FIREBASE_* variables.');
    }
  }
  return admin.firestore();
}

export const firestore = initializeFirebase();
export { admin };
