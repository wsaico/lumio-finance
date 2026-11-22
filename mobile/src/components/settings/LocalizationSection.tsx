import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeftRight, Check, Clock, DollarSign, Globe, Hash } from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { PremiumBottomSheet } from '@/components/ui/PremiumBottomSheet';
import { SettingsGroup, SettingsRow } from './SettingsShared';
import { useSettingsStore } from '@/stores/settings-store';
import { useUser } from '@/hooks/useUser';
import { apiPatch } from '@/lib/api-client';
import { COMMON_TIMEZONES, REGIONS, getRegionByCountry } from '@/lib/regions';
import { CURRENCIES, NUMBER_FORMATS } from '@/lib/currencies';
import { alphaHex } from '@/lib/color-math';
import { showAppToast } from '@/stores/toast-store';

export function LocalizationSection() {
  const theme = useAppTheme();
  const router = useRouter();
  const { mutateProfile } = useUser();
  const store = useSettingsStore();

  const [picker, setPicker] = useState<'COUNTRY' | 'CURRENCY' | 'TIMEZONE' | null>(null);
  const currentRegion = getRegionByCountry(store.countryCode);

  const syncPrefs = async (payload: Record<string, string>) => {
    try {
      await apiPatch('/api/user/preferences', payload);
      mutateProfile();
      showAppToast.success({ title: 'Preferencia regional sincronizada' });
    } catch (err: any) {
      showAppToast.error({ title: 'No se pudo sincronizar', description: err?.message });
    }
  };

  return (
    <View style={{ gap: 18 }}>
      <SettingsGroup title="Región y moneda principal">
        <SettingsRow
          Icon={Globe}
          title="País o región"
          description={`${currentRegion.name} (${currentRegion.code})`}
          onPress={() => setPicker('COUNTRY')}
        />
        <SettingsRow
          Icon={DollarSign}
          title="Moneda principal"
          description={`Todos los resúmenes consolidan a ${store.currencyCode}`}
          onPress={() => setPicker('CURRENCY')}
          right={
            <View style={[styles.badge, { backgroundColor: theme.brandSoft }]}>
              <Text style={{ color: theme.brand, fontFamily: theme.font('800'), fontSize: 12 }}>
                {store.currencyCode}
              </Text>
            </View>
          }
        />
        <SettingsRow
          Icon={Clock}
          title="Zona horaria"
          description={store.timezone}
          onPress={() => setPicker('TIMEZONE')}
        />
        <SettingsRow
          Icon={Hash}
          title="Formato numérico"
          description={store.numberFormat}
          onPress={() =>
            store.setNumberFormat(
              store.numberFormat === '1,234.56' ? '1.234,56' : '1,234.56'
            )
          }
          right={
            <View style={[styles.badge, { backgroundColor: theme.muted }]}>
              <Text style={{ color: theme.text, fontFamily: theme.font('700'), fontSize: 12 }}>
                {store.numberFormat}
              </Text>
            </View>
          }
          isLast
        />
      </SettingsGroup>

      <SettingsGroup title="Tasas de cambio">
        <SettingsRow
          Icon={ArrowLeftRight}
          title="Conversor y tipos de cambio"
          description="Consulta tasas en vivo y personaliza conversiones"
          onPress={() => router.push('/exchange-rates' as any)}
          isLast
        />
      </SettingsGroup>

      <PremiumBottomSheet
        open={Boolean(picker)}
        onClose={() => setPicker(null)}
        title={
          picker === 'COUNTRY'
            ? 'Seleccionar país'
            : picker === 'CURRENCY'
              ? 'Seleccionar moneda base'
              : 'Seleccionar zona horaria'
        }
      >
        <View style={{ gap: 8, paddingBottom: 14 }}>
          {picker === 'COUNTRY' &&
            REGIONS.map((r) => {
              const active = store.countryCode === r.code;
              return (
                <Pressable
                  key={r.code}
                  onPress={async () => {
                    store.setCountryCode(r.code);
                    store.setCurrencyCode(r.currencyCode);
                    store.setTimezone(r.timezone);
                    store.setNumberFormat(r.numberFormat);
                    setPicker(null);
                    await syncPrefs({
                      country_code: r.code,
                      base_currency: r.currencyCode,
                      timezone: r.timezone,
                    });
                  }}
                  style={[
                    styles.pickRow,
                    { backgroundColor: active ? alphaHex(theme.brand, 0.12) : theme.muted, borderColor: active ? theme.brand : theme.border },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontFamily: theme.font('700'), fontSize: 14 }}>
                      {r.name}
                    </Text>
                    <Text style={{ color: theme.textMuted, fontSize: 11.5 }}>
                      {r.currencyCode} · {r.timezone}
                    </Text>
                  </View>
                  {active ? <Check size={16} color={theme.brand} /> : null}
                </Pressable>
              );
            })}

          {picker === 'CURRENCY' &&
            CURRENCIES.map((c) => {
              const active = store.currencyCode === c.code;
              return (
                <Pressable
                  key={c.code}
                  onPress={async () => {
                    store.setCurrencyCode(c.code);
                    setPicker(null);
                    await syncPrefs({ base_currency: c.code });
                  }}
                  style={[
                    styles.pickRow,
                    { backgroundColor: active ? alphaHex(theme.brand, 0.12) : theme.muted, borderColor: active ? theme.brand : theme.border },
                  ]}
                >
                  <Text style={{ color: theme.brand, fontFamily: theme.font('800'), fontSize: 15, width: 48 }}>
                    {c.code}
                  </Text>
                  <Text style={{ flex: 1, color: theme.text, fontFamily: theme.font('600'), fontSize: 13.5 }}>
                    {c.name} ({c.symbol})
                  </Text>
                  {active ? <Check size={16} color={theme.brand} /> : null}
                </Pressable>
              );
            })}

          {picker === 'TIMEZONE' &&
            COMMON_TIMEZONES.map((tz) => {
              const active = store.timezone === tz.value;
              return (
                <Pressable
                  key={tz.value}
                  onPress={async () => {
                    store.setTimezone(tz.value);
                    setPicker(null);
                    await syncPrefs({ timezone: tz.value });
                  }}
                  style={[
                    styles.pickRow,
                    { backgroundColor: active ? alphaHex(theme.brand, 0.12) : theme.muted, borderColor: active ? theme.brand : theme.border },
                  ]}
                >
                  <Text style={{ flex: 1, color: theme.text, fontFamily: theme.font('600'), fontSize: 13.5 }}>
                    {tz.label}
                  </Text>
                  {active ? <Check size={16} color={theme.brand} /> : null}
                </Pressable>
              );
            })}
        </View>
      </PremiumBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  pickRow: { flexDirection: 'row', alignItems: 'center', padding: 13, borderRadius: 15, borderWidth: 1 },
});
