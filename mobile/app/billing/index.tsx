import React, { useState } from 'react';
import {
  Image,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Crown,
  Globe,
  QrCode,
  ShieldCheck,
  Smartphone,
  Upload,
  XCircle,
} from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { TopAppHeader } from '@/components/navigation/TopAppHeader';
import { CurvedHeroHeader } from '@/components/ui/CurvedHeroHeader';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { PremiumBottomSheet } from '@/components/ui/PremiumBottomSheet';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { ShimmerSkeleton } from '@/components/ui/ShimmerSkeleton';
import { useSubscription } from '@/hooks/useSubscription';
import { useSystemBranding } from '@/hooks/useSystemBranding';
import { DEFAULT_PLANS, type PlanDefinition } from '@/lib/entitlements';
import { apiGet, apiPost } from '@/lib/api-client';
import { alphaHex } from '@/lib/color-math';
import { triggerHaptic } from '@/lib/haptics';
import { showAppToast } from '@/stores/toast-store';

type PayMethod = 'YAPE' | 'PLIN' | 'CARD' | 'PAYPAL';

export default function BillingScreen() {
  const theme = useAppTheme();
  const queryClient = useQueryClient();
  const { entitlements, isTrial, isPremium, isFree, trialDaysRemaining } = useSubscription();
  const branding = useSystemBranding();

  const [currency, setCurrency] = useState<'PEN' | 'USD'>('PEN');
  const [selectedPlan, setSelectedPlan] = useState<PlanDefinition | null>(null);
  const [payMethod, setPayMethod] = useState<PayMethod>('YAPE');
  const [operationNumber, setOperationNumber] = useState('');
  const [proofDataUrl, setProofDataUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const subQuery = useQuery<any>({
    queryKey: ['billing-subscription-info'],
    queryFn: () => apiGet('/api/subscription'),
  });

  const ordersQuery = useQuery<any[]>({
    queryKey: ['payment-orders'],
    queryFn: async () => {
      const res = await apiGet('/api/payments/orders');
      return Array.isArray(res) ? res : [];
    },
  });

  const plans: PlanDefinition[] = (
    subQuery.data?.plans?.length
      ? subQuery.data.plans
      : branding.plans?.length
        ? branding.plans
        : DEFAULT_PLANS
  ).filter((p: PlanDefinition) => p.is_active !== false);

  const freePlan = plans.find((p) => p.code === 'FREE') || DEFAULT_PLANS[0];
  const premiumPlans = plans.filter((p) => p.code !== 'FREE');

  const payConfig = subQuery.data?.paymentConfig || branding.paymentConfig || {
    yape: { enabled: true, number: '', holder: 'Wilber Saico', qrUrl: '' },
    plin: { enabled: true, number: '', holder: 'Wilber Saico', qrUrl: '' },
    card: { enabled: true, provider: 'CULQI' },
    paypal: { enabled: true, paypalMe: '' },
  };

  const currSymbol = currency === 'USD' ? '$' : 'S/.';

  const pickProofImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.72,
    });
    if (!res.canceled && res.assets[0]?.base64) {
      setProofDataUrl(`data:image/jpeg;base64,${res.assets[0].base64}`);
      showAppToast.success({ title: 'Comprobante adjuntado' });
    }
  };

  const copyPhone = async (text: string) => {
    if (!text) return;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text).catch(() => {});
    }
    showAppToast.success({ title: `Número copiado: ${text}` });
  };

  const handleSubmitOrder = async () => {
    if (!selectedPlan) return;
    if (!operationNumber.trim()) {
      showAppToast.warning({ title: 'Ingresa tu número de operación o referencia' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiPost('/api/payments/orders', {
        planCode: selectedPlan.code,
        paymentMethod: payMethod,
        currencyCode: currency,
        operationNumber: operationNumber.trim(),
        proofUrl: proofDataUrl,
      });
      showAppToast.success({
        title: `Orden ${res?.order_code || ''} registrada`,
        description: 'Verificaremos tu pago y activaremos tu plan en breve.',
      });
      setSelectedPlan(null);
      setOperationNumber('');
      setProofDataUrl(null);
      queryClient.invalidateQueries({ queryKey: ['payment-orders'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    } catch (err: any) {
      showAppToast.error({
        title: 'No se pudo registrar el pago',
        description: err?.message || 'Intenta nuevamente',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const orders = ordersQuery.data || [];

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={ordersQuery.isFetching || subQuery.isFetching}
            onRefresh={() => {
              void ordersQuery.refetch();
              void subQuery.refetch();
            }}
            tintColor={theme.brand}
          />
        }
      >
        <CurvedHeroHeader>
          <TopAppHeader
            title="Planes y Suscripción"
            subtitle="Desbloquea Lumio al 100%"
            showBack
            onHero
          />

          <View style={styles.heroBanner}>
            <View style={styles.badgePill}>
              <Crown size={14} color="#FFB085" />
              <Text style={{ color: '#FFFFFF', fontFamily: theme.font('800'), fontSize: 11.5 }}>
                {isTrial
                  ? `Prueba gratuita · ${trialDaysRemaining} días restantes`
                  : isPremium
                    ? entitlements?.planName || 'Lumio Premium'
                    : 'Plan Básico · Gratis de por vida'}
              </Text>
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontFamily: theme.font('500'), fontSize: theme.sp(12.5) }}>
              {isFree
                ? 'Elige un plan cuando quieras activar cuentas ilimitadas, presupuestos, metas y reportes.'
                : 'Tu cuenta disfruta de sincronización completa en la web y app móvil.'}
            </Text>
          </View>
        </CurvedHeroHeader>

        <View style={styles.body}>
          <SegmentedControl
            value={currency}
            onChange={setCurrency}
            options={[
              { id: 'PEN', label: 'Soles (S/.)' },
              { id: 'USD', label: 'Dólares ($)' },
            ]}
          />

          <View style={{ gap: 12 }}>
            {premiumPlans.map((plan) => {
              const price = currency === 'USD' ? plan.price_usd : plan.price_pen;
              const isPopular = plan.code === 'PREMIUM_ANNUAL';
              const cycleLabel =
                plan.billing_cycle === 'MONTHLY'
                  ? '/ mes'
                  : plan.billing_cycle === 'SEMIANNUAL'
                    ? '/ 6 meses'
                    : plan.billing_cycle === 'ANNUAL'
                      ? '/ año'
                      : 'pago único';

              return (
                <PremiumCard
                  key={plan.code}
                  variant={isPopular ? 'hero-violet' : 'elevated'}
                  padding={18}
                  style={styles.planCard}
                >
                  <View style={styles.planTop}>
                    <View style={{ flex: 1 }}>
                      {plan.badge && (
                        <View
                          style={[
                            styles.planBadge,
                            {
                              backgroundColor: isPopular
                                ? theme.coral
                                : theme.brandSoft,
                            },
                          ]}
                        >
                          <Text
                            style={{
                              color: isPopular ? '#FFFFFF' : theme.brand,
                              fontFamily: theme.font('800'),
                              fontSize: 10,
                            }}
                          >
                            {plan.badge}
                          </Text>
                        </View>
                      )}
                      <Text
                        style={{
                          color: isPopular ? '#FFFFFF' : theme.text,
                          fontFamily: theme.font('800'),
                          fontSize: theme.sp(18),
                          marginTop: plan.badge ? 6 : 0,
                        }}
                      >
                        {plan.name}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text
                        style={{
                          color: isPopular ? '#FFFFFF' : theme.brand,
                          fontFamily: theme.font('800'),
                          fontSize: theme.sp(24),
                          fontVariant: ['tabular-nums'],
                        }}
                      >
                        {currSymbol} {price}
                      </Text>
                      <Text
                        style={{
                          color: isPopular ? 'rgba(255,255,255,0.78)' : theme.textMuted,
                          fontFamily: theme.font('600'),
                          fontSize: 11.5,
                        }}
                      >
                        {cycleLabel}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={{
                      color: isPopular ? 'rgba(255,255,255,0.85)' : theme.textSecondary,
                      fontFamily: theme.font('500'),
                      fontSize: theme.sp(12.5),
                    }}
                  >
                    {plan.description}
                  </Text>

                  <View style={{ gap: 6 }}>
                    {(plan.features || []).map((feat, idx) => (
                      <View key={idx} style={styles.featRow}>
                        <Check
                          size={14}
                          color={isPopular ? '#FFB085' : theme.income}
                          strokeWidth={2.6}
                        />
                        <Text
                          style={{
                            flex: 1,
                            color: isPopular ? '#FFFFFF' : theme.text,
                            fontFamily: theme.font('500'),
                            fontSize: theme.sp(12),
                          }}
                        >
                          {feat}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <PremiumButton
                    title={`Elegir plan ${plan.name}`}
                    variant={isPopular ? 'coral' : 'primary'}
                    onPress={() => {
                      triggerHaptic('medium');
                      setSelectedPlan(plan);
                    }}
                  />
                </PremiumCard>
              );
            })}
          </View>

          <PremiumCard padding={16} variant="muted" style={{ gap: 6 }}>
            <View style={styles.freeHead}>
              <ShieldCheck size={16} color={theme.income} />
              <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(14) }}>
                {freePlan.name} · Gratis de por vida
              </Text>
            </View>
            <Text style={{ color: theme.textSecondary, fontFamily: theme.font('500'), fontSize: theme.sp(12) }}>
              {(freePlan.features || []).join(' · ')}
            </Text>
          </PremiumCard>

          <PremiumCard padding={16} style={{ gap: 12 }}>
            <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(15) }}>
              Historial de órdenes ({orders.length})
            </Text>
            {ordersQuery.isLoading ? (
              <ShimmerSkeleton height={60} borderRadius={16} />
            ) : orders.length === 0 ? (
              <Text style={{ color: theme.textMuted, fontFamily: theme.font('500'), fontSize: theme.sp(12.5) }}>
                Aún no tienes órdenes de pago registradas.
              </Text>
            ) : (
              orders.map((ord) => {
                const statusColor =
                  ord.status === 'APPROVED'
                    ? theme.income
                    : ord.status === 'REJECTED'
                      ? theme.expense
                      : theme.warning;
                const StatusIcon =
                  ord.status === 'APPROVED'
                    ? CheckCircle2
                    : ord.status === 'REJECTED'
                      ? XCircle
                      : Clock;
                return (
                  <View
                    key={ord.id}
                    style={[styles.orderRow, { borderTopColor: theme.border }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.text, fontFamily: theme.font('700'), fontSize: theme.sp(13) }}>
                        {ord.order_code} · {ord.payment_method} · Op. {ord.operation_number}
                      </Text>
                      <Text style={{ color: theme.textMuted, fontFamily: theme.font('500'), fontSize: 11.5 }}>
                        {new Date(ord.created_at).toLocaleDateString('es-PE')} · {ord.currency_code} {Number(ord.amount).toFixed(2)}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: alphaHex(statusColor, 0.14) }]}>
                      <StatusIcon size={12} color={statusColor} />
                      <Text style={{ color: statusColor, fontFamily: theme.font('800'), fontSize: 11 }}>
                        {ord.status === 'APPROVED' ? 'Aprobado' : ord.status === 'REJECTED' ? 'Rechazado' : 'Pendiente'}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </PremiumCard>
        </View>
      </ScrollView>

      <PremiumBottomSheet
        open={Boolean(selectedPlan)}
        onClose={() => setSelectedPlan(null)}
        title={selectedPlan ? `Activar ${selectedPlan.name}` : 'Checkout'}
        subtitle={
          selectedPlan
            ? `Total: ${currSymbol} ${currency === 'USD' ? selectedPlan.price_usd : selectedPlan.price_pen}`
            : ''
        }
        footer={
          <View style={styles.sheetFoot}>
            <PremiumButton title="Cancelar" variant="outline" onPress={() => setSelectedPlan(null)} style={{ flex: 1 }} />
            <PremiumButton
              title="Confirmar pago"
              variant="coral"
              loading={submitting}
              onPress={handleSubmitOrder}
              style={{ flex: 1.5 }}
            />
          </View>
        }
      >
        <View style={styles.checkoutBody}>
          <View style={styles.methodGrid}>
            {[
              { id: 'YAPE' as const, label: 'Yape', Icon: Smartphone, enabled: payConfig.yape?.enabled },
              { id: 'PLIN' as const, label: 'Plin', Icon: QrCode, enabled: payConfig.plin?.enabled },
              { id: 'CARD' as const, label: 'Tarjeta', Icon: CreditCard, enabled: payConfig.card?.enabled },
              { id: 'PAYPAL' as const, label: 'PayPal', Icon: Globe, enabled: payConfig.paypal?.enabled },
            ]
              .filter((m) => m.enabled !== false)
              .map((m) => {
                const active = payMethod === m.id;
                const Icon = m.Icon;
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => setPayMethod(m.id)}
                    style={[
                      styles.methodCard,
                      {
                        backgroundColor: active ? theme.brandSoft : theme.muted,
                        borderColor: active ? theme.brand : theme.border,
                      },
                    ]}
                  >
                    <Icon size={17} color={active ? theme.brand : theme.textMuted} />
                    <Text style={{ color: active ? theme.brand : theme.text, fontFamily: theme.font('700'), fontSize: 12 }}>
                      {m.label}
                    </Text>
                  </Pressable>
                );
              })}
          </View>

          {(payMethod === 'YAPE' || payMethod === 'PLIN') && (
            <View style={[styles.payInfoBox, { backgroundColor: theme.muted, borderColor: theme.border }]}>
              {(() => {
                const info = payMethod === 'YAPE' ? payConfig.yape : payConfig.plin;
                return (
                  <>
                    {info?.qrUrl ? (
                      <Image source={{ uri: info.qrUrl }} style={styles.qrImg} resizeMode="contain" />
                    ) : null}
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: 14 }}>
                        Paga con {payMethod}
                      </Text>
                      <Text style={{ color: theme.textSecondary, fontFamily: theme.font('600'), fontSize: 12 }}>
                        Titular: {info?.holder || 'Wilber Saico'}
                      </Text>
                      {info?.number ? (
                        <Pressable
                          onPress={() => copyPhone(info.number)}
                          style={styles.copyPhoneRow}
                        >
                          <Text selectable style={{ color: theme.brand, fontFamily: theme.font('800'), fontSize: 15 }}>
                            {info.number}
                          </Text>
                          <Copy size={14} color={theme.brand} />
                        </Pressable>
                      ) : null}
                    </View>
                  </>
                );
              })()}
            </View>
          )}

          {payMethod === 'PAYPAL' && payConfig.paypal?.paypalMe ? (
            <Pressable
              onPress={() => Linking.openURL(payConfig.paypal.paypalMe)}
              style={[styles.payInfoBox, { backgroundColor: theme.brandSoft, borderColor: theme.brand }]}
            >
              <Globe size={18} color={theme.brand} />
              <Text style={{ color: theme.brand, fontFamily: theme.font('800'), fontSize: 13 }}>
                Abrir enlace oficial de PayPal
              </Text>
            </Pressable>
          ) : null}

          <View>
            <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: 12 }]}>
              Número de operación o referencia
            </Text>
            <TextInput
              value={operationNumber}
              onChangeText={setOperationNumber}
              placeholder="Ej. 09481234"
              placeholderTextColor={theme.textMuted}
              style={[styles.input, { backgroundColor: theme.muted, borderColor: theme.border, color: theme.text, fontFamily: theme.font('700') }]}
            />
          </View>

          <Pressable
            onPress={pickProofImage}
            style={[styles.proofBtn, { backgroundColor: theme.muted, borderColor: proofDataUrl ? theme.income : theme.border }]}
          >
            <Upload size={16} color={proofDataUrl ? theme.income : theme.brand} />
            <Text style={{ flex: 1, color: proofDataUrl ? theme.income : theme.textSecondary, fontFamily: theme.font('700'), fontSize: 12.5 }}>
              {proofDataUrl ? 'Captura de comprobante lista' : 'Adjuntar captura del pago (opcional)'}
            </Text>
            {proofDataUrl ? <CheckCircle2 size={16} color={theme.income} /> : null}
          </Pressable>
        </View>
      </PremiumBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { paddingBottom: 44 },
  heroBanner: { marginTop: 12, gap: 8 },
  badgePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  body: { padding: 16, gap: 16 },
  planCard: { gap: 12 },
  planTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  planBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  featRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  freeHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 10, borderTopWidth: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  sheetFoot: { flexDirection: 'row', gap: 10 },
  checkoutBody: { gap: 14, paddingBottom: 12 },
  methodGrid: { flexDirection: 'row', gap: 8 },
  methodCard: { flex: 1, paddingVertical: 11, borderRadius: 14, borderWidth: 1, alignItems: 'center', gap: 4 },
  payInfoBox: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderRadius: 16, borderWidth: 1 },
  qrImg: { width: 88, height: 88, borderRadius: 12, backgroundColor: '#FFFFFF' },
  copyPhoneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  label: { marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  proofBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed' },
});
