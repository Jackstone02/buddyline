import React, { useEffect, useRef } from 'react';
import { Linking } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '../store/authStore';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

// Auth
import SplashScreen from '../screens/auth/SplashScreen';
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import SignInScreen from '../screens/auth/SignInScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import RoleSelectionScreen from '../screens/auth/RoleSelectionScreen';
import SocialOnboardingScreen from '../screens/auth/SocialOnboardingScreen';
import TermsOfServiceScreen from '../screens/auth/TermsOfServiceScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';

// Profile setup
import ProfileSetupScreen from '../screens/profile/ProfileSetupScreen';
import VerificationPendingScreen from '../screens/profile/VerificationPendingScreen';
import ProfileEditScreen from '../screens/profile/ProfileEditScreen';

// Shared
import SafetyScreen from '../screens/shared/SafetyScreen';
import MessagingScreen from '../screens/shared/MessagingScreen';
import ReportScreen from '../screens/shared/ReportScreen';
import SettingsScreen from '../screens/shared/SettingsScreen';

// Detail screens
import InstructorProfileScreen from '../screens/instructor/InstructorProfileScreen';
import BuddyProfileScreen from '../screens/buddy/BuddyProfileScreen';
import DiveRequestFormScreen from '../screens/buddy/DiveRequestFormScreen';
import DiveRequestDetailScreen from '../screens/buddy/DiveRequestDetailScreen';
import CreateSessionScreen from '../screens/buddy/CreateSessionScreen';
import SessionDetailScreen from '../screens/buddy/SessionDetailScreen';
import SessionsListScreen from '../screens/buddy/SessionsListScreen';

// Booking screens
import BookingFormScreen from '../screens/shared/BookingFormScreen';
import BookingConfirmationScreen from '../screens/shared/BookingConfirmationScreen';
import BookingDetailScreen from '../screens/shared/BookingDetailScreen';
import InstructorBookingDetailScreen from '../screens/instructor/InstructorBookingDetailScreen';

// Tab navigators
import BeginnerTabs from './BeginnerTabs';
import CertifiedTabs from './CertifiedTabs';
import InstructorTabs from './InstructorTabs';
import AdminTabs from './AdminTabs';

// Admin screens
import AdminUserDetailScreen from '../screens/admin/AdminUserDetailScreen';

// Role change
import RoleChangeScreen from '../screens/profile/RoleChangeScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

function parseResetUrl(url: string): { accessToken: string; refreshToken: string } | null {
  try {
    // Tokens can be in query params or hash fragment
    const queryStr = url.includes('?') ? url.split('?')[1] : '';
    const hashStr  = url.includes('#') ? url.split('#')[1] : '';
    const params   = new URLSearchParams(queryStr + '&' + hashStr);
    const accessToken  = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    if (accessToken && refreshToken) return { accessToken, refreshToken };
  } catch {}
  return null;
}

export default function AppNavigator() {
  const navRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  // Handle notification taps — navigate to the relevant screen
  useEffect(() => {
    const handleNotificationData = (data?: Record<string, any>) => {
      if (!data || !navRef.current) return;
      switch (data.type) {
        case 'message':
          navRef.current.navigate('Messaging', {
            otherUserId: data.otherUserId,
            otherUserName: data.otherUserName,
          });
          break;
        case 'dive_request':
          navRef.current.navigate('DiveRequestDetail', { requestId: data.requestId });
          break;
        case 'booking_customer':
          navRef.current.navigate('BookingDetail', { bookingId: data.bookingId });
          break;
        case 'booking_instructor':
          navRef.current.navigate('InstructorBookingDetail', { bookingId: data.bookingId });
          break;
      }
    };

    // App opened from a notification (cold/warm start)
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleNotificationData(response.notification.request.content.data);
    });

    // Notification tapped while app is open
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationData(response.notification.request.content.data);
    });

    return () => sub.remove();
  }, []);

  useEffect(() => {
    const handleUrl = (url: string) => {
      if (url.includes('reset-password')) {
        const tokens = parseResetUrl(url);
        if (tokens) navRef.current?.navigate('ResetPassword', tokens);
      }
    };

    // Cold start (app opened from deep link)
    Linking.getInitialURL().then((url) => { if (url) handleUrl(url); });

    // Warm start (app already open)
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  return (
    <NavigationContainer ref={navRef}>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{ headerShown: false }}
      >
        {/* Auth flow */}
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="SignIn" component={SignInScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
        <Stack.Screen name="SocialOnboarding" component={SocialOnboardingScreen} options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
        <Stack.Screen name="VerificationPending" component={VerificationPendingScreen} />

        {/* Terms of Service — shown once after profile setup */}
        <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} options={{ gestureEnabled: false, animation: 'fade' }} />

        {/* Safety disclaimer — mandatory */}
        <Stack.Screen name="Safety" component={SafetyScreen} options={{ gestureEnabled: false, animation: 'fade' }} />

        {/* Main tab stacks */}
        <Stack.Screen name="BeginnerTabs" component={BeginnerTabs} />
        <Stack.Screen name="CertifiedTabs" component={CertifiedTabs} />
        <Stack.Screen name="InstructorTabs" component={InstructorTabs} />
        <Stack.Screen name="AdminTabs" component={AdminTabs} />

        {/* Shared stack screens (pushed on top of tabs) */}
        <Stack.Screen name="Messaging" component={MessagingScreen} />
        <Stack.Screen name="InstructorProfile" component={InstructorProfileScreen} />
        <Stack.Screen name="BuddyProfile" component={BuddyProfileScreen} />
        <Stack.Screen name="Report" component={ReportScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
        <Stack.Screen name="RoleChange" component={RoleChangeScreen} />

        {/* Admin */}
        <Stack.Screen name="AdminUserDetail" component={AdminUserDetailScreen} />

        {/* Dive request flow */}
        <Stack.Screen name="DiveRequestForm" component={DiveRequestFormScreen} />
        <Stack.Screen name="DiveRequestDetail" component={DiveRequestDetailScreen} />

        {/* Dive session flow */}
        <Stack.Screen name="CreateSession" component={CreateSessionScreen} />
        <Stack.Screen name="SessionDetail" component={SessionDetailScreen} />
        <Stack.Screen name="SessionsList" component={SessionsListScreen} />

        {/* Booking flow */}
        <Stack.Screen name="BookingForm" component={BookingFormScreen} />
        <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} options={{ gestureEnabled: false }} />
        <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
        <Stack.Screen name="InstructorBookingDetail" component={InstructorBookingDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
