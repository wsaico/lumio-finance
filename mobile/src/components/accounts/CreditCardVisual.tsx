import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { ArrowRightLeft, CreditCard } from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useFormat } from '@/hooks/useFormat';
import { CircularProgressRing } from '@/components/ui/CircularProgressRing';

export function CreditCardVisual({
  account,
  onPress,
  onPayPress,
}: {
  account: any;
  onPress?: () => void;
  onPayPress?: () => void;
}) {
  const theme = useAppTheme();
  const { formatMaskedMoney } = useFormat();

  const limit = Math.max(0, Number(account.creditLimit || 0));
  const used = Math.abs(Number(account.usedBalance || 0));
  const available = Math.max(0, limit - used);
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  return (
    <Pressable onPress={onPress} style={styles.cardOuter}>
      <LinearGradient
        colors={[theme.brandLight, theme.brandDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Reference Image 5 Coral-Orange Curved Accent */}
        <View style={styles.svgOverlay} pointerEvents="none">
          <Svg width="100%" height="100%" viewBox="0 0 280 175" preserveAspectRatio="none">
            <Path
              d="M 190 0 C 165 65, 225 110, 175 175 L 280 175 L 280 0 Z"
              fill={theme.coral}
              opacity="0.92"
            />
          </Svg>
        </View>

        <View style={styles.topRow}>
          <View>
            <Text style={[styles.digits, { fontFamily: theme.font('800') }]}>
              •••• {account.lastFourDigits || '0000'}
            </Text>
            <Text style={[styles.name, { fontFamily: theme.font('600') }]} numberOfLines={1}>
              {account.name}
            </Text>
          </View>
          <CreditCard size={22} color="#FFFFFF" />
        </View>

        <View style={styles.midRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { fontFamily: theme.font('500') }]}>Disponible</Text>
            <Text style={[styles.balance, { fontFamily: theme.font('800') }]} numberOfLines={1} adjustsFontSizeToFit>
              {formatMaskedMoney(available, account.currencyCode)}
            </Text>
            <Text style={[styles.debtSub, { fontFamily: theme.font('600') }]}>
              Deuda: {formatMaskedMoney(used, account.currencyCode)}
            </Text>
          </View>
          <CircularProgressRing
            progress={pct}
            size={56}
            strokeWidth={6}
            color="#FFFFFF"
            trackColor="rgba(255,255,255,0.28)"
            label={`${pct}%`}
            labelColor="#FFFFFF"
          />
        </View>

        <View style={styles.bottomRow}>
          <Text style={[styles.meta, { fontFamily: theme.font('600') }]}>
            {account.closingDay ? `Cierre día ${account.closingDay}` : account.cardNetwork || 'Crédito'}
          </Text>
          {onPayPress ? (
            <Pressable onPress={onPayPress} style={styles.payBtn}>
              <ArrowRightLeft size={12} color="#FFFFFF" />
              <Text style={[styles.payText, { fontFamily: theme.font('800') }]}>Pagar</Text>
            </Pressable>
          ) : null}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardOuter: {
    width: 280,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#5B35D5',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 8,
  },
  card: {
    height: 174,
    padding: 16,
    justifyContent: 'space-between',
    position: 'relative',
  },
  svgOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  digits: {
    color: '#FFFFFF',
    fontSize: 13.5,
    letterSpacing: 1.5,
  },
  name: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    marginTop: 2,
    maxWidth: 180,
  },
  midRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  label: { color: 'rgba(255,255,255,0.78)', fontSize: 10.5 },
  balance: { color: '#FFFFFF', fontSize: 20, fontVariant: ['tabular-nums'] },
  debtSub: { color: 'rgba(255,255,255,0.88)', fontSize: 11, marginTop: 1 },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  meta: { color: 'rgba(255,255,255,0.85)', fontSize: 11 },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.38)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
  },
  payText: { color: '#FFFFFF', fontSize: 11 },
});
