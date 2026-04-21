import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize } from '../constants/theme';
import { BeginnerTabParamList } from '../types';

import FindScreen from '../screens/shared/FindScreen';
import MyBookingsScreen from '../screens/shared/MyBookingsScreen';
import MessagesListScreen from '../screens/shared/MessagesListScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator<BeginnerTabParamList>();

export default function BeginnerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          elevation: 0,
        },
        tabBarLabelStyle: { fontSize: FontSize.xs, fontWeight: '600' },
        tabBarIcon: ({ color, size, focused }) => {
          const icons: Record<string, [string, string]> = {
            Find:     ['search', 'search-outline'],
            Schedule: ['calendar', 'calendar-outline'],
            Messages: ['chatbubbles', 'chatbubbles-outline'],
            Profile:  ['person-circle', 'person-circle-outline'],
          };
          const [on, off] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
          return <Ionicons name={(focused ? on : off) as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Find"
        component={FindScreen}
        initialParams={{ defaultMode: 'instructor', showToggle: false }}
        options={{ title: 'Find' }}
      />
      <Tab.Screen name="Schedule" component={MyBookingsScreen} options={{ title: 'My Dives' }} />
      <Tab.Screen name="Messages" component={MessagesListScreen} options={{ title: 'Messages' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}
