import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator';
import { useAuthStore } from './src/store/authStore';
import { registerPushToken } from './src/lib/notifications';

function AppContent() {
  const { profile } = useAuthStore();

  // Single registration point — fires once when user is authenticated
  useEffect(() => {
    if (profile?.id) {
      registerPushToken(profile.id);
    }
  }, [profile?.id]);

  return <AppNavigator />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppContent />
    </GestureHandlerRootView>
  );
}
