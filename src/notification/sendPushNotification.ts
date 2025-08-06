import { getMessaging } from 'firebase-admin/messaging';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
const googleApplicationCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;

initializeApp({
  credential: applicationDefault(),
  projectId: 'potion-for-creators',
});

export default async function sendPushNotification(
  fcmToken: string,
  title: string,
  body: string,
): Promise<{ success: boolean; message: string }> {
  if (!fcmToken) {
    throw new Error('FCM token is required.');
  }

  const message = {
    notification: {
      title,
      body,
    },
    token: fcmToken,
  };

  try {
    const response = await getMessaging().send(message);
    console.log(googleApplicationCredentials);
    console.log('Successfully sent message:', response);
    return { success: true, message: 'Successfully sent message' };
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}
