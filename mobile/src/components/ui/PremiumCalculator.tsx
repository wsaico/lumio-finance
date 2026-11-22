import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, Delete, Divide, Equal, Minus, Plus, X as Multiply } from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { safeEvaluateExpression } from '@/lib/format';
import { triggerHaptic } from '@/lib/haptics';

export function PremiumCalculator({
  initialValue = '0',
  currencySymbol = 'S/.',
  accentColor,
  onChange,
  onConfirm,
  onClose,
  hideConfirmButton = false,
}: {
  initialValue?: string;
  currencySymbol?: string;
  accentColor?: string;
  onChange?: (value: string) => void;
  onConfirm: (value: string) => void;
  onClose?: () => void;
  hideConfirmButton?: boolean;
}) {
  const theme = useAppTheme();
  const accent = accentColor || theme.brand;
  const [expr, setExpr] = useState(
    initialValue && initialValue !== '0' ? String(initialValue) : '0'
  );

  const hasOperator = /[+\-*/]/.test(expr.slice(1));
  const evaluated = safeEvaluateExpression(expr);

  const updateExpr = (updater: (prev: string) => string) => {
    setExpr((prev) => {
      const next = updater(prev);
      const evalNext = safeEvaluateExpression(next);
      onChange?.(evalNext === '0' ? '' : evalNext);
      return next;
    });
  };

  const append = (token: string) => {
    triggerHaptic('light');
    updateExpr((prev) => {
      const isOp = ['+', '-', '*', '/'].includes(token);
      if (prev === '0' && !isOp && token !== '.') {
        return token === '00' ? '0' : token;
      }
      if (isOp && ['+', '-', '*', '/'].includes(prev.slice(-1))) {
        return prev.slice(0, -1) + token;
      }
      if (token === '.') {
        const lastChunk = prev.split(/[+\-*/]/).pop() || '';
        if (lastChunk.includes('.')) return prev;
        return prev + '.';
      }
      return prev + token;
    });
  };

  const backspace = () => {
    triggerHaptic('light');
    updateExpr((prev) => (prev.length <= 1 ? '0' : prev.slice(0, -1)));
  };

  const clear = () => {
    triggerHaptic('medium');
    updateExpr(() => '0');
  };

  const handleConfirm = () => {
    triggerHaptic('success');
    const finalVal = safeEvaluateExpression(expr);
    onConfirm(finalVal);
    onClose?.();
  };

  const rows: { label: string | React.ReactNode; value: string; kind: 'num' | 'op' | 'action' }[][] = [
    [
      { label: '7', value: '7', kind: 'num' },
      { label: '8', value: '8', kind: 'num' },
      { label: '9', value: '9', kind: 'num' },
      { label: <Divide size={18} color={accent} />, value: '/', kind: 'op' },
    ],
    [
      { label: '4', value: '4', kind: 'num' },
      { label: '5', value: '5', kind: 'num' },
      { label: '6', value: '6', kind: 'num' },
      { label: <Multiply size={18} color={accent} />, value: '*', kind: 'op' },
    ],
    [
      { label: '1', value: '1', kind: 'num' },
      { label: '2', value: '2', kind: 'num' },
      { label: '3', value: '3', kind: 'num' },
      { label: <Minus size={18} color={accent} />, value: '-', kind: 'op' },
    ],
    [
      { label: '.', value: '.', kind: 'num' },
      { label: '0', value: '0', kind: 'num' },
      { label: <Delete size={18} color={theme.textSecondary} />, value: 'DEL', kind: 'action' },
      { label: <Plus size={18} color={accent} />, value: '+', kind: 'op' },
    ],
  ];

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.display,
          { backgroundColor: theme.muted, borderColor: theme.border },
        ]}
      >
        <View style={styles.displayTop}>
          <Text
            style={[
              styles.exprText,
              { color: theme.textMuted, fontFamily: theme.font('600'), fontSize: theme.sp(12.5) },
            ]}
            numberOfLines={1}
          >
            {hasOperator ? `${expr} =` : 'Importe'}
          </Text>
          <Pressable onPress={clear} hitSlop={8}>
            <Text style={{ color: theme.expense, fontFamily: theme.font('700'), fontSize: theme.sp(12) }}>
              Limpiar
            </Text>
          </Pressable>
        </View>
        <View style={styles.amountRow}>
          <Text
            style={[
              styles.currency,
              { color: theme.textMuted, fontFamily: theme.font('800'), fontSize: theme.sp(22) },
            ]}
          >
            {currencySymbol}
          </Text>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[
              styles.amount,
              { color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(38) },
            ]}
          >
            {hasOperator ? evaluated : expr}
          </Text>
        </View>
      </View>

      <View style={styles.grid}>
        {rows.map((row, rIdx) => (
          <View key={rIdx} style={styles.row}>
            {row.map((key) => (
              <Pressable
                key={key.value}
                onPress={() => {
                  if (key.value === 'DEL') backspace();
                  else append(key.value);
                }}
                onLongPress={key.value === 'DEL' ? clear : undefined}
                style={({ pressed }) => [
                  styles.key,
                  {
                    backgroundColor:
                      key.kind === 'op'
                        ? theme.brandSoft
                        : key.kind === 'action'
                          ? theme.muted
                          : theme.card,
                    borderColor: theme.border,
                    transform: [{ scale: pressed ? 0.94 : 1 }],
                  },
                ]}
              >
                {typeof key.label === 'string' ? (
                  <Text
                    style={[
                      styles.keyText,
                      { color: theme.text, fontFamily: theme.font('700'), fontSize: theme.sp(20) },
                    ]}
                  >
                    {key.label}
                  </Text>
                ) : (
                  key.label
                )}
              </Pressable>
            ))}
          </View>
        ))}
      </View>

      {(!hideConfirmButton || hasOperator) && (
        <View style={styles.bottomActions}>
          {hasOperator ? (
            <Pressable
              onPress={() => {
                triggerHaptic('selection');
                updateExpr(() => evaluated);
              }}
              style={[
                styles.equalBtn,
                { backgroundColor: theme.muted, borderColor: theme.border, flex: hideConfirmButton ? 1 : undefined },
              ]}
            >
              <Equal size={20} color={accent} />
            </Pressable>
          ) : null}
          {!hideConfirmButton ? (
            <Pressable
              onPress={handleConfirm}
              style={({ pressed }) => [
                styles.confirmBtn,
                { backgroundColor: accent, opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <Check size={20} color="#FFFFFF" strokeWidth={2.8} />
              <Text style={[styles.confirmText, { fontFamily: theme.font('800'), fontSize: theme.sp(15) }]}>
                Aplicar monto
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  display: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  displayTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exprText: {
    fontVariant: ['tabular-nums'],
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 2,
  },
  currency: {},
  amount: {
    fontVariant: ['tabular-nums'],
  },
  grid: {
    gap: 7,
  },
  row: {
    flexDirection: 'row',
    gap: 7,
  },
  key: {
    flex: 1,
    height: 46,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontVariant: ['tabular-nums'],
  },
  bottomActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  equalBtn: {
    width: 60,
    height: 52,
    borderRadius: 99,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtn: {
    flex: 1,
    height: 52,
    borderRadius: 99,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmText: {
    color: '#FFFFFF',
  },
});
