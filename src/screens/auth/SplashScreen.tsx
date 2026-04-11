import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../../types';
import { Colors, FontSize } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

const SAFETY_KEY = '@buddyline:safetyAccepted';

export default function SplashScreen({ navigation }: Props) {
  const { setSession, setProfile, setLoading, setSafetyAccepted } = useAuthStore();

  useEffect(() => {
    const init = async () => {
      // Check safety acceptance from AsyncStorage
      const safetyVal = await AsyncStorage.getItem(SAFETY_KEY);
      const safetyOk = safetyVal === 'true';
      if (safetyOk) setSafetyAccepted(true);

      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (!profile) {
          navigation.replace('RoleSelection');
          setLoading(false);
          return;
        }

        setProfile(profile);

        // Incomplete onboarding — send back to finish it
        if (!profile.age_confirmed) {
          navigation.replace('SocialOnboarding');
          setLoading(false);
          return;
        }

        const role = profile.role;
        const verified = profile.verification_status === 'verified';

        if (role === 'beginner') {
          if (safetyOk) navigation.replace('BeginnerTabs');
          else navigation.replace('Safety', { nextRoute: 'BeginnerTabs' });
        } else if (role === 'certified') {
          if (!verified) {
            navigation.replace('VerificationPending');
          } else if (safetyOk) {
            navigation.replace('CertifiedTabs');
          } else {
            navigation.replace('Safety', { nextRoute: 'CertifiedTabs' });
          }
        } else if (role === 'instructor') {
          if (!verified) {
            navigation.replace('VerificationPending');
          } else if (safetyOk) {
            navigation.replace('InstructorTabs');
          } else {
            navigation.replace('Safety', { nextRoute: 'InstructorTabs' });
          }
        } else if (role === 'admin') {
          navigation.replace('AdminTabs');
        } else {
          // Role not set — resume onboarding
          navigation.replace('SocialOnboarding');
        }
      } else {
        navigation.replace('Welcome');
      }

      setLoading(false);
    };

    const timeout = setTimeout(init, 1800);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.ringOuter} />
      <View style={styles.ringMid} />
      <View style={styles.ringInner} />

      <View style={styles.logoWrap}>
        <Text style={styles.logoMain}>
          Buddy<Text style={styles.logoAccent}>line</Text>
        </Text>
      </View>

      <Text style={styles.tagline}>Never Dive Alone</Text>

      <View style={styles.wave} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primaryDeep,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ringOuter: {
    position: 'absolute',
    width: 440,
    height: 440,
    borderRadius: 220,
    borderWidth: 1,
    borderColor: '#FFFFFF20',
  },
  ringMid: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    borderWidth: 1,
    borderColor: '#FFFFFF35',
  },
  ringInner: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#FFFFFF55',
  },
  logoWrap: { alignItems: 'center' },
  logoMain: {
    fontSize: FontSize.xxxl + 6,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  logoAccent: {
    color: Colors.accent,
  },
  tagline: {
    fontSize: FontSize.sm,
    color: '#FFFFFFBB',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: 28,
  },
  wave: {
    position: 'absolute',
    bottom: -80,
    width: 600,
    height: 200,
    borderRadius: 300,
    backgroundColor: Colors.primaryDark + '60',
  },
});
