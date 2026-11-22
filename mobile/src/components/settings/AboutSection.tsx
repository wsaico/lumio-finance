import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CheckCircle2, Crown, Mail, Server, ShieldCheck } from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { SettingsGroup, SettingsRow } from './SettingsShared';
import { useSystemBranding } from '@/hooks/useSystemBranding';
import { useSubscription } from '@/hooks/useSubscription';
import { API_BASE_URL } from '@/lib/api-client';
import { alphaHex } from '@/lib/color-math';

export function AboutSection() {
  const theme = useAppTheme();
  const router = useRouter();
  const branding = useSystemBranding();
  const { isPremium, isTrial, trialDaysRemaining, entitlements } = useSubscription();

  return (
    <View style={{ gap: 18 }}>
      <PremiumCard variant="hero-violet" padding={20} style={{ gap: 8 }}>
        <Text style={{ color: '#FFB085', fontFamily: theme.font('800'), fontSize: 12, letterSpacing: 1 }}>
          2027 MOBILE EDITION
        </Text>
        <Text style={{ color: '#FFFFFF', fontFamily: theme.font('800'), fontSize: theme.sp(22) }}>
          {branding.appName}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontFamily: theme.font('500'), fontSize: theme.sp(13) }}>
          {branding.tagline} · Versión 2.0.0
        </Text>
      </PremiumCard>

      <SettingsGroup title="Estado del sistema unificado">
        <SettingsRow
          Icon={Server}
          title="Servidor principal sincronizado"
          description={API_BASE_URL}
          right={
            <View style={[styles.statusPill, { backgroundColor: alphaHex(theme.income, 0.14) }]}>
              <CheckCircle2 size={12} color={theme.income} />
              <Text style={{ color: theme.income, fontFamily: theme.font('800'), fontSize: 11 }}>
                Conectado
              </Text>
            </View>
          }
        />
        <SettingsRow
          Icon={Mail}
          title="Correos y verificación OTP"
          description="Autenticación de 6 dígitos, bienvenida y comprobantes conectados a tu infraestructura principal."
        />
        <SettingsRow
          Icon={ShieldCheck}
          title="Base de datos en tiempo real"
          description="Supabase Cloud con políticas RLS y alertas instantáneas entre web y móvil."
          isLast
        />
      </SettingsGroup>

      <SettingsGroup title="Suscripción">
        <SettingsRow
          Icon={Crown}
          title={
            isTrial
              ? `Prueba gratuita (${trialDaysRemaining} días)`
              : isPremium
                ? entitlements?.planName || 'Plan Premium'
                : 'Plan Básico gratuito'
          }
          description="Gestiona tu membresía, pagos Yape/Plin/Tarjeta y facturas"
          onPress={() => router.push('/billing' as any)}
          isLast
        />
      </SettingsGroup>
    </View>
  );
}

const styles = StyleSheet.create({
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
});
