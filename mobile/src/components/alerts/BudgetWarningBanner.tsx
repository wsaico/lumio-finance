import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, ShieldAlert } from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';

export function BudgetWarningBanner({
  type,
  message,
  details,
}: {
  type: 'critical' | 'exceeded';
  message: string;
  details: string;
}) {
  const theme = useAppTheme();
  const isExceeded = type === 'exceeded';
  const bg = isExceeded ? '#E11D48' : '#F59E0B';

  return (
    <View style={[styles.wrap, { backgroundColor: bg }]}>
      <View style={styles.iconBox}>
        {isExceeded ? (
          <ShieldAlert size={18} color="#FFFFFF" strokeWidth={2.2} />
        ) : (
          <AlertTriangle size={18} color="#FFFFFF" strokeWidth={2.2} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={[styles.title, { fontFamily: theme.font('700'), fontSize: theme.sp(13) }]}
          numberOfLines={1}
        >
          {message}
        </Text>
        <Text
          style={[styles.details, { fontFamily: theme.font('500'), fontSize: theme.sp(11.5) }]}
          numberOfLines={2}
        >
          {details}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 13,
    borderRadius: 18,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
  },
  details: {
    color: 'rgba(255,255,255,0.9)',
    marginTop: 1,
  },
});
