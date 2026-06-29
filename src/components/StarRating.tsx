import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  value: number;            // current rating (supports halves for display)
  onChange?: (v: number) => void;
  size?: number;
  editable?: boolean;       // when true, taps call onChange with 1–5
  color?: string;
}

/** Reusable 5-star widget — read-only display (with half stars) or tappable input. */
export default function StarRating({ value, onChange, size = 20, editable = false, color = '#F59E0B' }: Props) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => {
        const name = value >= i ? 'star' : value >= i - 0.5 ? 'star-half' : 'star-outline';
        const icon = <Ionicons name={name as any} size={size} color={color} />;
        return editable ? (
          <TouchableOpacity key={i} onPress={() => onChange?.(i)} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }} activeOpacity={0.7}>
            {icon}
          </TouchableOpacity>
        ) : (
          <View key={i}>{icon}</View>
        );
      })}
    </View>
  );
}
