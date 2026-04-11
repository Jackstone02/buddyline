import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Show notifications while app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function getDeviceId(): string {
  if (Constants.installationId) return Constants.installationId;
  if ((Constants as any).deviceId) return (Constants as any).deviceId;
  // Stable fallback using device model — never use Date.now() (changes every call)
  return `${Platform.OS}-${Device.modelName ?? Device.osName ?? 'unknown'}`;
}

export async function registerPushToken(userId: string): Promise<void> {
  try {
    if (Platform.OS === 'web') return;
    if (!Device.isDevice) return;

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    // Set up Android channel before getting token
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Buddyline',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1CA7A6',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
    }

    // Resolve projectId — works in Expo Go + standalone builds
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.manifest2?.extra?.eas?.projectId ??
      (Constants.manifest as any)?.extra?.eas?.projectId ??
      process.env.EXPO_PUBLIC_EAS_PROJECT_ID;

    if (!projectId) {
      console.warn('[Push Token] No projectId found');
      return;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;
    if (!token) return;

    const deviceId = getDeviceId();

    console.log('[Push Token] Saving token for device:', deviceId);

    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        {
          user_id: userId,
          token,
          device_id: deviceId,
          platform: Platform.OS as 'ios' | 'android' | 'web',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,device_id' }
      );

    if (error) {
      console.error('[Push Token] Error saving:', JSON.stringify(error));
    } else {
      console.log('[Push Token] ✅ Saved successfully:', token.slice(0, 30) + '...');
    }
  } catch (error) {
    console.error('[Push Token] Registration failed:', error);
  }
}
