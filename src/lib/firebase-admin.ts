import * as admin from 'firebase-admin';
import 'server-only';
import path from 'path';

// Singleton pattern for Firebase Admin
if (!admin.apps.length) {
  try {
    // Resolve path relative to project root
    const serviceAccountPath = path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './credentials/firebase.json');
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath),
      projectId: process.env.GCP_PROJECT_ID,
    });
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Firebase Admin initialization error', error);
  }
}

export const db = admin.firestore();
if (process.env.FIREBASE_DATABASE_ID) {
  db.settings({ databaseId: process.env.FIREBASE_DATABASE_ID });
}
export const auth = admin.auth();
