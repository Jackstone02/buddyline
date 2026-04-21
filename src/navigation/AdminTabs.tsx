import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize } from '../constants/theme';
import { AdminTabParamList } from '../types';

import AdminOverviewScreen from '../screens/admin/AdminOverviewScreen';
import AdminVerificationsScreen from '../screens/admin/AdminVerificationsScreen';
import AdminReportsScreen from '../screens/admin/AdminReportsScreen';

const Tab = createBottomTabNavigator<AdminTabParamList>();

export default function AdminTabs() {
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
            Overview:      ['grid',              'grid-outline'],
            Verifications: ['shield-checkmark',  'shield-checkmark-outline'],
            Reports:       ['flag',              'flag-outline'],
          };
          const [on, off] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
          return <Ionicons name={(focused ? on : off) as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Overview" component={AdminOverviewScreen} options={{ title: 'Overview' }} />
      <Tab.Screen name="Verifications" component={AdminVerificationsScreen} options={{ title: 'Verifications' }} />
      <Tab.Screen name="Reports" component={AdminReportsScreen} options={{ title: 'Reports' }} />
    </Tab.Navigator>
  );
}
