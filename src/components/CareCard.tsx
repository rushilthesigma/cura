import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radius, Spacing } from '../design/tokens';

interface CareCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
}

export function CareCard({ children, style, padding = Spacing.md }: CareCardProps) {
  return (
    <View style={[styles.card, { padding }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
