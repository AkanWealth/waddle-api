import * as admin from 'firebase-admin';
import { serviceAccount } from '../../serviceAccount';

export const firebaseAdminProvider = {
  provide: 'FIREBASE_ADMIN',
  useFactory: async () => {
    try {
      let defaultApp: admin.app.App;

      if (admin.apps.length === 0) {
        console.log('🔄 Initializing Firebase Admin with TS object...');

        defaultApp = admin.initializeApp({
          credential: admin.credential.cert(
            serviceAccount as admin.ServiceAccount,
          ),
        });
      } else {
        defaultApp = admin.app();
      }

      // ✅ Test connection
      await admin.auth().listUsers(1);
      console.log('✅ Firebase Admin connected successfully');

      return { defaultApp, messaging: admin.messaging() };
    } catch (error) {
      console.error('❌ Firebase Admin initialization error:', error);
      throw new Error('Firebase Admin connection failed');
    }
  },
};
