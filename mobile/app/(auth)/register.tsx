import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MailCheck,
  RefreshCw,
  ShieldCheck,
  User,
} from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { supabase } from '@/lib/supabase';
import { apiPost } from '@/lib/api-client';
import { detectDeviceRegion } from '@/lib/regions';
import { showAppToast } from '@/stores/toast-store';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { PremiumCard } from '@/components/ui/PremiumCard';

const DEFAULT_OTP_LEN = Number(process.env.EXPO_PUBLIC_OTP_LENGTH) === 8 ? 8 : 6;

export default function RegisterScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [otpLength, setOtpLength] = useState<6 | 8>(DEFAULT_OTP_LEN);
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(DEFAULT_OTP_LEN).fill(''));
  const [pendingPayload, setPendingPayload] = useState<{
    fullName: string;
    email: string;
    password: string;
    countryCode: string;
    currency: string;
    timezone: string;
  } | null>(null);

  const otpRefs = useRef<Array<React.ComponentRef<typeof TextInput> | null>>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const sendOtpCode = async (
    payload: NonNullable<typeof pendingPayload>,
    isResend = false
  ) => {
    await apiPost(
      '/api/auth/register',
      { action: 'check', email: payload.email, isResend },
      true
    );

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: payload.email,
      options: {
        shouldCreateUser: true,
        data: {
          full_name: payload.fullName,
          country_code: payload.countryCode,
          currency: payload.currency,
          timezone: payload.timezone,
          pending_verification: true,
        },
      },
    });

    if (otpError) {
      throw new Error(
        otpError.message.includes('rate limit')
          ? 'Has solicitado demasiados códigos seguidos. Espera 1 minuto.'
          : otpError.message
      );
    }
  };

  const handleStartRegister = async () => {
    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    if (cleanName.length < 2) {
      showAppToast.warning({ title: 'Ingresa tu nombre completo' });
      return;
    }
    if (!cleanEmail.includes('@')) {
      showAppToast.warning({ title: 'Ingresa un correo electrónico válido' });
      return;
    }
    if (password.length < 6) {
      showAppToast.warning({ title: 'La contraseña debe tener mínimo 6 caracteres' });
      return;
    }

    setLoading(true);
    try {
      const region = detectDeviceRegion();
      const payload = {
        fullName: cleanName,
        email: cleanEmail,
        password,
        countryCode: region.code,
        currency: region.currencyCode,
        timezone: region.timezone,
      };
      await sendOtpCode(payload, false);
      setPendingPayload(payload);
      setOtpDigits(Array(otpLength).fill(''));
      setCooldown(60);
      setStep('otp');
      showAppToast.info({
        title: 'Código enviado a tu correo',
        description: `Revisa tu bandeja (${cleanEmail}) e ingresa el código de verificación.`,
      });
    } catch (err: any) {
      showAppToast.error({
        title: 'No se pudo enviar el código',
        description: err?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!pendingPayload || cooldown > 0 || resending) return;
    setResending(true);
    try {
      await sendOtpCode(pendingPayload, true);
      setOtpDigits(Array(otpLength).fill(''));
      setCooldown(60);
      otpRefs.current[0]?.focus();
      showAppToast.success({ title: 'Nuevo código enviado a tu correo' });
    } catch (err: any) {
      showAppToast.error({
        title: 'No se pudo reenviar',
        description: err?.message,
      });
    } finally {
      setResending(false);
    }
  };

  const handleVerifyOtp = async (overrideCode?: string) => {
    if (!pendingPayload || verifying) return;
    const code = (overrideCode ?? otpDigits.join('')).trim();
    if (code.length < 6) {
      showAppToast.warning({
        title: 'Código incompleto',
        description: `Ingresa los ${otpLength} dígitos enviados a tu correo.`,
      });
      return;
    }

    setVerifying(true);
    try {
      let verified = false;
      let lastError: any = null;
      for (const otpType of ['email', 'signup', 'magiclink'] as const) {
        const { data, error } = await supabase.auth.verifyOtp({
          email: pendingPayload.email,
          token: code,
          type: otpType,
        });
        if (!error && data?.session) {
          verified = true;
          break;
        }
        lastError = error;
      }

      if (!verified) {
        throw new Error(
          lastError?.message?.includes('expired') || lastError?.message?.includes('invalid')
            ? 'El código ingresado es incorrecto o ha expirado.'
            : lastError?.message || 'Código inválido.'
        );
      }

      // Finalize registration on backend (creates profile + triggers WELCOME_TRIAL email!)
      await apiPost('/api/auth/register', {
        action: 'complete',
        fullName: pendingPayload.fullName,
        password: pendingPayload.password,
        countryCode: pendingPayload.countryCode,
        currency: pendingPayload.currency,
        timezone: pendingPayload.timezone,
      });

      await supabase.auth.signInWithPassword({
        email: pendingPayload.email,
        password: pendingPayload.password,
      });

      showAppToast.success({
        title: 'Cuenta verificada con éxito',
        description: 'Bienvenido a Lumio Finance. Tus 15 días de prueba están activos.',
      });
    } catch (err: any) {
      showAppToast.error({
        title: 'No se pudo verificar el código',
        description: err?.message,
      });
    } finally {
      setVerifying(false);
    }
  };

  const onDigitChange = (index: number, raw: string) => {
    const cleaned = raw.replace(/\D/g, '');
    if (!cleaned) {
      const next = [...otpDigits];
      next[index] = '';
      setOtpDigits(next);
      return;
    }
    if (cleaned.length > 1) {
      const targetLen: 6 | 8 = cleaned.length >= 8 ? 8 : cleaned.length === 6 ? 6 : otpLength;
      if (targetLen !== otpLength) setOtpLength(targetLen);
      const next = Array(targetLen).fill('');
      cleaned
        .slice(0, targetLen)
        .split('')
        .forEach((ch, idx) => {
          next[idx] = ch;
        });
      setOtpDigits(next);
      if (next.every(Boolean)) handleVerifyOtp(next.join(''));
      return;
    }
    const next = [...otpDigits];
    next[index] = cleaned;
    setOtpDigits(next);
    if (index < otpLength - 1) {
      otpRefs.current[index + 1]?.focus();
    } else if (next.every(Boolean)) {
      handleVerifyOtp(next.join(''));
    }
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.bg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            onPress={() => (step === 'otp' ? setStep('form') : router.back())}
            style={[styles.backBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <ArrowLeft size={19} color={theme.text} />
          </Pressable>

          {step === 'form' ? (
            <>
              <View style={{ gap: 5 }}>
                <Text style={{ color: theme.coral, fontFamily: theme.font('800'), fontSize: theme.sp(12), letterSpacing: 1 }}>
                  15 DÍAS PREMIUM INCLUIDOS
                </Text>
                <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(27) }}>
                  Crear cuenta
                </Text>
                <Text style={{ color: theme.textSecondary, fontFamily: theme.font('400'), fontSize: theme.sp(13.5) }}>
                  Verificaremos tu correo con un código de 6 dígitos conectado al sistema principal de Lumio.
                </Text>
              </View>

              <PremiumCard padding={20} style={{ gap: 14 }}>
                <View style={{ gap: 6 }}>
                  <Text style={{ color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }}>
                    Nombre completo
                  </Text>
                  <View style={[styles.inputBox, { backgroundColor: theme.muted, borderColor: theme.border }]}>
                    <User size={17} color={theme.textMuted} />
                    <TextInput
                      value={fullName}
                      onChangeText={setFullName}
                      placeholder="Tu nombre"
                      placeholderTextColor={theme.textMuted}
                      style={[styles.input, { color: theme.text, fontFamily: theme.font('600'), fontSize: theme.sp(14) }]}
                    />
                  </View>
                </View>

                <View style={{ gap: 6 }}>
                  <Text style={{ color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }}>
                    Correo electrónico
                  </Text>
                  <View style={[styles.inputBox, { backgroundColor: theme.muted, borderColor: theme.border }]}>
                    <Mail size={17} color={theme.textMuted} />
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="nombre@correo.com"
                      placeholderTextColor={theme.textMuted}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      style={[styles.input, { color: theme.text, fontFamily: theme.font('600'), fontSize: theme.sp(14) }]}
                    />
                  </View>
                </View>

                <View style={{ gap: 6 }}>
                  <Text style={{ color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }}>
                    Contraseña (mín. 6 caracteres)
                  </Text>
                  <View style={[styles.inputBox, { backgroundColor: theme.muted, borderColor: theme.border }]}>
                    <Lock size={17} color={theme.textMuted} />
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      placeholder="••••••••"
                      placeholderTextColor={theme.textMuted}
                      secureTextEntry={!showPass}
                      style={[styles.input, { color: theme.text, fontFamily: theme.font('600'), fontSize: theme.sp(14) }]}
                    />
                    <Pressable onPress={() => setShowPass((v) => !v)} hitSlop={8}>
                      {showPass ? (
                        <EyeOff size={17} color={theme.textMuted} />
                      ) : (
                        <Eye size={17} color={theme.textMuted} />
                      )}
                    </Pressable>
                  </View>
                </View>

                <PremiumButton
                  title="Enviar código de verificación"
                  onPress={handleStartRegister}
                  loading={loading}
                  icon={<ArrowRight size={17} color="#FFFFFF" />}
                  size="lg"
                  style={{ marginTop: 4 }}
                />
              </PremiumCard>

              <View style={styles.bottomRow}>
                <Text style={{ color: theme.textSecondary, fontFamily: theme.font('500'), fontSize: theme.sp(13) }}>
                  ¿Ya tienes una cuenta?
                </Text>
                <Pressable onPress={() => router.replace('/(auth)/login')}>
                  <Text style={{ color: theme.brand, fontFamily: theme.font('800'), fontSize: theme.sp(13.5) }}>
                    Inicia sesión
                  </Text>
                </Pressable>
              </View>
            </>
          ) : (
            <PremiumCard padding={22} style={{ gap: 18 }}>
              <View style={{ alignItems: 'center', gap: 10 }}>
                <View style={[styles.otpIcon, { backgroundColor: theme.brandSoft }]}>
                  <MailCheck size={30} color={theme.brand} />
                </View>
                <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(21) }}>
                  Verifica tu correo
                </Text>
                <Text
                  style={{
                    color: theme.textSecondary,
                    fontFamily: theme.font('400'),
                    fontSize: theme.sp(13),
                    textAlign: 'center',
                  }}
                >
                  Ingresa el código de {otpLength} dígitos enviado a {pendingPayload?.email}
                </Text>
              </View>

              <View style={styles.otpRow}>
                {otpDigits.map((digit, idx) => (
                  <TextInput
                    key={idx}
                    ref={(el) => {
                      otpRefs.current[idx] = el;
                    }}
                    value={digit}
                    onChangeText={(t) => onDigitChange(idx, t)}
                    onKeyPress={({ nativeEvent }) => {
                      if (nativeEvent.key === 'Backspace' && !digit && idx > 0) {
                        otpRefs.current[idx - 1]?.focus();
                      }
                    }}
                    keyboardType="number-pad"
                    maxLength={otpLength}
                    style={[
                      styles.otpCell,
                      {
                        backgroundColor: theme.muted,
                        borderColor: digit ? theme.brand : theme.border,
                        color: theme.text,
                        fontFamily: theme.font('800'),
                      },
                    ]}
                  />
                ))}
              </View>

              <PremiumButton
                title="Verificar y crear cuenta"
                variant="coral"
                onPress={() => handleVerifyOtp()}
                loading={verifying}
                icon={<ShieldCheck size={18} color="#FFFFFF" />}
                size="lg"
              />

              <Pressable
                disabled={cooldown > 0 || resending}
                onPress={handleResend}
                style={styles.resendBtn}
              >
                <RefreshCw size={14} color={cooldown > 0 ? theme.textMuted : theme.brand} />
                <Text
                  style={{
                    color: cooldown > 0 ? theme.textMuted : theme.brand,
                    fontFamily: theme.font('700'),
                    fontSize: theme.sp(12.5),
                  }}
                >
                  {cooldown > 0 ? `Reenviar en ${cooldown}s` : 'Reenviar código'}
                </Text>
              </Pressable>
            </PremiumCard>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: 20, gap: 20, justifyContent: 'center' },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
  },
  input: { flex: 1, height: '100%' },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  otpIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  otpCell: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    textAlign: 'center',
    fontSize: 20,
    fontVariant: ['tabular-nums'],
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
});
