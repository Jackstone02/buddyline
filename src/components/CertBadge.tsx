import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSize, Radius } from '../constants/theme';
import { formatLabel } from '../utils/format';

interface Props {
  certType: string;
  isVerified: boolean;
}

export default function CertBadge({ certType, isVerified }: Props) {
  return (
    <View style={[styles.badge, isVerified && styles.badgeVerified]}>
      <Text style={[styles.text, isVerified && styles.textVerified]}>{formatLabel(certType)}</Text>
      {isVerified && <Text style={styles.check}>✓</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    marginRight: Spacing.sm,
  },
  badgeVerified: {
    backgroundColor: Colors.primary + '20',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  text: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecondary },
  textVerified: { color: Colors.primary },
  check: { fontSize: FontSize.xs, color: Colors.success, fontWeight: '800' },
});
