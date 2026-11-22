import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, CheckCircle2, Clock, Percent } from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { PremiumBottomSheet } from '@/components/ui/PremiumBottomSheet';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { useFormat } from '@/hooks/useFormat';
import { alphaHex } from '@/lib/color-math';
import type { AccountPayable, AccountReceivable } from '@/types/loans';

export function LoanDetailModal({
  open,
  onOpenChange,
  loan,
  mode,
  onRegisterPayment,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loan: (AccountReceivable | AccountPayable) | null;
  mode: 'RECEIVABLE' | 'PAYABLE';
  onRegisterPayment: () => void;
}) {
  const theme = useAppTheme();
  const { formatMaskedMoney } = useFormat();

  if (!loan) return null;

  const original = Number(loan.originalAmount) || 0;
  const outstanding = Number(loan.outstandingBalance) || 0;
  const paid = Math.max(0, original - outstanding);
  const pct = original > 0 ? Math.min(100, Math.round((paid / original) * 100)) : 0;
  const isSettled = loan.status === 'COLLECTED' || loan.status === 'PAID' || outstanding <= 0;

  return (
    <PremiumBottomSheet
      open={open}
      onClose={() => onOpenChange(false)}
      title={loan.contactName}
      subtitle={mode === 'RECEIVABLE' ? 'Detalle de préstamo otorgado' : 'Detalle de deuda por pagar'}
      footer={
        isSettled ? (
          <PremiumButton title="Cerrar" onPress={() => onOpenChange(false)} />
        ) : (
          <View style={styles.footer}>
            <PremiumButton title="Cerrar" variant="outline" onPress={() => onOpenChange(false)} style={{ flex: 1 }} />
            <PremiumButton
              title={mode === 'RECEIVABLE' ? 'Registrar cobro' : 'Registrar pago'}
              variant="coral"
              onPress={() => {
                onOpenChange(false);
                onRegisterPayment();
              }}
              style={{ flex: 1.5 }}
            />
          </View>
        )
      }
    >
      <View style={styles.body}>
        <View style={[styles.summaryCard, { backgroundColor: theme.muted, borderColor: theme.border }]}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={{ color: theme.textMuted, fontFamily: theme.font('600'), fontSize: theme.sp(11.5) }}>
                Saldo pendiente
              </Text>
              <Text
                style={{
                  color: mode === 'RECEIVABLE' ? theme.income : theme.coral,
                  fontFamily: theme.font('800'),
                  fontSize: theme.sp(22),
                  fontVariant: ['tabular-nums'],
                }}
              >
                {formatMaskedMoney(outstanding, loan.currencyCode)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: theme.textMuted, fontFamily: theme.font('600'), fontSize: theme.sp(11.5) }}>
                Monto original
              </Text>
              <Text style={{ color: theme.text, fontFamily: theme.font('700'), fontSize: theme.sp(15), fontVariant: ['tabular-nums'] }}>
                {formatMaskedMoney(original, loan.currencyCode)}
              </Text>
            </View>
          </View>

          <View style={[styles.track, { backgroundColor: theme.card }]}>
            <View
              style={{
                width: `${pct}%`,
                height: '100%',
                backgroundColor: mode === 'RECEIVABLE' ? theme.income : theme.brand,
                borderRadius: 999,
              }}
            />
          </View>

          <View style={styles.metaGrid}>
            {loan.dueDate ? (
              <View style={styles.metaChip}>
                <Calendar size={13} color={theme.textMuted} />
                <Text style={{ color: theme.textSecondary, fontFamily: theme.font('600'), fontSize: theme.sp(12) }}>
                  Vence: {format(new Date(loan.dueDate), 'd MMM yyyy', { locale: es })}
                </Text>
              </View>
            ) : null}
            {Number(loan.interestRate || 0) > 0 ? (
              <View style={styles.metaChip}>
                <Percent size={13} color={theme.textMuted} />
                <Text style={{ color: theme.textSecondary, fontFamily: theme.font('600'), fontSize: theme.sp(12) }}>
                  Interés: {loan.interestRate}% ({loan.interestType === 'COMPOUND' ? 'Compuesto' : 'Simple'})
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {loan.notes ? (
          <View style={[styles.notesBox, { backgroundColor: theme.muted }]}>
            <Text style={{ color: theme.textSecondary, fontFamily: theme.font('500'), fontSize: theme.sp(12.5) }}>
              {loan.notes}
            </Text>
          </View>
        ) : null}

        <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(14) }}>
          Historial de amortizaciones ({loan.payments?.length || 0})
        </Text>

        {!loan.payments || loan.payments.length === 0 ? (
          <View style={[styles.emptyHist, { backgroundColor: theme.muted }]}>
            <Clock size={18} color={theme.textMuted} />
            <Text style={{ color: theme.textMuted, fontFamily: theme.font('500'), fontSize: theme.sp(12.5) }}>
              Aún no se registran abonos parciales ni totales.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {loan.payments.map((p) => (
              <View
                key={p.id}
                style={[styles.payRow, { backgroundColor: theme.muted, borderColor: theme.border }]}
              >
                <View style={[styles.payIcon, { backgroundColor: alphaHex(theme.income, 0.15) }]}>
                  <CheckCircle2 size={15} color={theme.income} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontFamily: theme.font('700'), fontSize: theme.sp(13) }}>
                    {p.notes || p.paymentMethod || 'Abono'}
                  </Text>
                  <Text style={{ color: theme.textMuted, fontFamily: theme.font('500'), fontSize: theme.sp(11) }}>
                    {format(new Date(p.paymentDate), "d 'de' MMM, yyyy", { locale: es })}
                  </Text>
                </View>
                <Text style={{ color: theme.income, fontFamily: theme.font('800'), fontSize: theme.sp(14), fontVariant: ['tabular-nums'] }}>
                  {formatMaskedMoney(p.amount, p.currencyCode)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </PremiumBottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 14, paddingBottom: 10 },
  footer: { flexDirection: 'row', gap: 10 },
  summaryCard: { borderRadius: 20, borderWidth: 1, padding: 15, gap: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  track: { height: 8, borderRadius: 999, overflow: 'hidden' },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  notesBox: { borderRadius: 14, padding: 12 },
  emptyHist: { borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 15, borderWidth: 1 },
  payIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
