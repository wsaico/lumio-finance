import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Check, Globe, PieChart, Sparkles, Wallet } from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { REGIONS } from '@/lib/regions';
import { apiPatch } from '@/lib/api-client';
import { useSettingsStore } from '@/stores/settings-store';
import { useUser } from '@/hooks/useUser';
import { showAppToast } from '@/stores/toast-store';
import { PremiumButton } from '@/components/ui/PremiumButton';

const METHODS = [
  {
    id: '50_30_20',
    title: 'Regla 50 / 30 / 20',
    desc: 'Equilibra necesidades (50%), estilo de vida (30%) y ahorro (20%).',
    Icon: PieChart,
  },
  {
    id: 'ZBB',
    title: 'Presupuesto Base Cero (ZBB)',
    desc: 'Asigna cada moneda de tus ingresos a sobres mensuales con propósito.',
    Icon: Sparkles,
  },
  {
    id: 'TRADITIONAL',
    title: 'Control Clásico Flexible',
    desc: 'Registra cuentas, ingresos y gastos a tu ritmo sin reglas rígidas.',
    Icon: Wallet,
  },
] as const;

export function OnboardingWizardModal({ visible }: { visible: boolean }) {
  const theme = useAppTheme();
  const { mutateProfile } = useUser();
  const store = useSettingsStore();
  const [country, setCountry] = useState(store.countryCode || 'PE');
  const [method, setMethod] = useState<string>('50_30_20');
  const [saving, setSaving] = useState(false);

  const selectedRegion = REGIONS.find((r) => r.code === country) || REGIONS[0];

  const handleFinish = async () => {
    setSaving(true);
    try {
      await apiPatch('/api/user/preferences', {
        country_code: selectedRegion.code,
        base_currency: selectedRegion.currencyCode,
        timezone: selectedRegion.timezone,
        budgeting_method: method,
        onboarding_completed: true,
      });
      store.setCountryCode(selectedRegion.code);
      store.setCurrencyCode(selectedRegion.currencyCode);
      store.setTimezone(selectedRegion.timezone);
      store.setNumberFormat(selectedRegion.numberFormat);
      await mutateProfile();
      showAppToast.success({
        title: 'Perfil financiero configurado',
        description: `${selectedRegion.name} · ${selectedRegion.currencyCode}`,
      });
    } catch (err: any) {
      showAppToast.error({
        title: 'No se pudo guardar la configuración',
        description: err?.message,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.header}>
            <View style={[styles.badge, { backgroundColor: theme.brandSoft }]}>
              <Globe size={24} color={theme.brand} />
            </View>
            <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(20) }}>
              Personaliza tu Lumio
            </Text>
            <Text
              style={{
                color: theme.textSecondary,
                fontFamily: theme.font('400'),
                fontSize: theme.sp(13),
                textAlign: 'center',
              }}
            >
              Sincronizaremos tu moneda, zona horaria y método de presupuesto en web y móvil.
            </Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
            <View style={{ gap: 8 }}>
              <Text style={{ color: theme.textMuted, fontFamily: theme.font('800'), fontSize: theme.sp(11) }}>
                PAÍS Y MONEDA PRINCIPAL
              </Text>
              <View style={styles.regionGrid}>
                {REGIONS.slice(0, 9).map((r) => {
                  const active = r.code === country;
                  return (
                    <Pressable
                      key={r.code}
                      onPress={() => setCountry(r.code)}
                      style={[
                        styles.regionChip,
                        {
                          backgroundColor: active ? theme.brand : theme.muted,
                          borderColor: active ? theme.brand : theme.border,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: active ? '#FFFFFF' : theme.text,
                          fontFamily: theme.font('700'),
                          fontSize: theme.sp(12),
                        }}
                      >
                        {r.name} · {r.currencyCode}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <Text style={{ color: theme.textMuted, fontFamily: theme.font('800'), fontSize: theme.sp(11) }}>
                METODOLOGÍA FINANCIERA
              </Text>
              {METHODS.map((m) => {
                const active = method === m.id;
                const Icon = m.Icon;
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => setMethod(m.id)}
                    style={[
                      styles.methodCard,
                      {
                        backgroundColor: active ? theme.brandSoft : theme.muted,
                        borderColor: active ? theme.brand : theme.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.methodIcon,
                        { backgroundColor: active ? theme.brand : theme.card },
                      ]}
                    >
                      <Icon size={18} color={active ? '#FFFFFF' : theme.brand} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.text, fontFamily: theme.font('700'), fontSize: theme.sp(13.5) }}>
                        {m.title}
                      </Text>
                      <Text style={{ color: theme.textSecondary, fontFamily: theme.font('400'), fontSize: theme.sp(11.5) }}>
                        {m.desc}
                      </Text>
                    </View>
                    {active ? <Check size={18} color={theme.brand} strokeWidth={2.6} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <PremiumButton
            title="Comenzar ahora"
            onPress={handleFinish}
            loading={saving}
            size="lg"
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 12, 22, 0.72)',
    justifyContent: 'center',
    padding: 18,
  },
  card: {
    borderRadius: 30,
    borderWidth: 1,
    padding: 20,
    maxHeight: '88%',
    gap: 16,
  },
  header: {
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  regionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  regionChip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 99,
    borderWidth: 1,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  methodIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
