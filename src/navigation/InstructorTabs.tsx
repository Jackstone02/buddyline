import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize } from '../constants/theme';
import { InstructorTabParamList } from '../types';

import InstructorDashboardScreen from '../screens/instructor/InstructorDashboardScreen';
import AvailabilityScreen from '../screens/instructor/AvailabilityScreen';
import FindScreen from '../screens/shared/FindScreen';
import MessagesListScreen from '../screens/shared/MessagesListScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator<InstructorTabParamList>();

export default function InstructorTabs() {
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
        },
        tabBarLabelStyle: { fontSize: FontSize.xs, fontWeight: '600' },
        tabBarIcon: ({ color, size, focused }) => {
          const icons: Record<string, [string, string]> = {
            Dashboard: ['grid',         'grid-outline'],
            Find:      ['search',       'search-outline'],
            Schedule:  ['calendar',     'calendar-outline'],
            Messages:  ['chatbubbles',  'chatbubbles-outline'],
            Profile:   ['person-circle','person-circle-outline'],
          };
          const [on, off] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
          return <Ionicons name={(focused ? on : off) as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={InstructorDashboardScreen} options={{ title: 'Dashboard' }} />
      <Tab.Screen
        name="Find"
        component={FindScreen}
        initialParams={{ defaultMode: 'buddy', showToggle: true }}
        options={{ title: 'Find' }}
      />
      <Tab.Screen name="Schedule" component={AvailabilityScreen} options={{ title: 'Schedule' }} />
      <Tab.Screen name="Messages" component={MessagesListScreen} options={{ title: 'Messages' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}
