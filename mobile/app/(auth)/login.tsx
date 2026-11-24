import React, { useRef, useState } from 'react';
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
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { safeGoBack } from '@/lib/navigation';
import { showAppToast } from '@/stores/toast-store';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { GoogleLogoIcon } from '@/components/ui/GoogleLogoIcon';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView> | null>(null);
  const passwordRef = useRef<React.ComponentRef<typeof TextInput> | null>(null);

  const handleLogin = async () => {
    if (!isSupabaseConfigured) {
      showAppToast.error({
        title: 'Configuración de servidor incompleta',
        description:
          'Configura EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY en las variables de entorno de Expo.',
      });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      showAppToast.warning({ title: 'Ingresa un correo válido' });
      return;
    }
    if (password.length < 6) {
      showAppToast.warning({ title: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (error) {
        let friendly = error.message;
        if (
          error.message.includes('Invalid login credentials') ||
          error.message.includes('invalid_grant')
        ) {
          friendly = 'Correo o contraseña incorrectos.';
        } else if (error.message.includes('Email not confirmed')) {
          friendly = 'Confirma tu correo electrónico antes de iniciar sesión.';
        }
        showAppToast.error({ title: 'Error de acceso', description: friendly });
        return;
      }
      showAppToast.success({ title: 'Sesión iniciada' });
    } catch (err: any) {
      showAppToast.error({
        title: 'No se pudo iniciar sesión',
        description: err?.message || 'Verifica tu conexión e intenta otra vez.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleOAuth = async () => {
    if (!isSupabaseConfigured) {
      showAppToast.error({
        title: 'Configuración de servidor incompleta',
        description:
          'Configura EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY en las variables de entorno de Expo.',
      });
      return;
    }

    setGoogleLoading(true);
    try {
      const redirectTo = Linking.createURL('auth/callback');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: Platform.OS !== 'web',
        },
      });
      if (error) throw error;
      if (Platform.OS !== 'web' && data?.url) {
        const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (res.type === 'success' && res.url) {
          const parsed = Linking.parse(res.url);
          const code = parsed.queryParams?.code;
          if (typeof code === 'string') {
            await supabase.auth.exchangeCodeForSession(code);
          } else if (res.url.includes('#')) {
            const hashParams = new URLSearchParams(res.url.split('#')[1] || '');
            const access_token = hashParams.get('access_token');
            const refresh_token = hashParams.get('refresh_token');
            if (access_token && refresh_token) {
              await supabase.auth.setSession({ access_token, refresh_token });
            }
          }
        }
      }
    } catch (err: any) {
      showAppToast.error({
        title: 'No se pudo iniciar con Google',
        description: err?.message,
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.bg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'web' ? undefined : 'padding'}
        style={styles.flex}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            onPress={() => safeGoBack(router, '/(auth)/welcome')}
            style={[styles.backBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <ArrowLeft size={19} color={theme.text} />
          </Pressable>

          <View style={styles.titleBlock}>
            <Text style={{ color: theme.brand, fontFamily: theme.font('800'), fontSize: theme.sp(12), letterSpacing: 1 }}>
              BIENVENIDO DE VUELTA
            </Text>
            <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(28) }}>
              Iniciar sesión
            </Text>
          </View>

          <PremiumCard padding={20} style={{ gap: 15 }}>
            <PremiumButton
              title={googleLoading ? 'Conectando con Google...' : 'Continuar con Google'}
              variant="outline"
              loading={googleLoading}
              icon={<GoogleLogoIcon size={18} />}
              onPress={handleGoogleOAuth}
            />

            <View style={styles.dividerRow}>
              <View style={[styles.line, { backgroundColor: theme.border }]} />
              <Text style={{ color: theme.textMuted, fontFamily: theme.font('700'), fontSize: 10.5 }}>
                O CON TU CORREO
              </Text>
              <View style={[styles.line, { backgroundColor: theme.border }]} />
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
                  autoComplete="email"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 140)}
                  style={[styles.input, { color: theme.text, fontFamily: theme.font('600'), fontSize: theme.sp(14) }]}
                />
              </View>
            </View>

            <View style={{ gap: 6 }}>
              <View style={styles.passLabelRow}>
                <Text style={{ color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }}>
                  Contraseña
                </Text>
                <Pressable onPress={() => router.push('/(auth)/forgot-password')}>
                  <Text style={{ color: theme.brand, fontFamily: theme.font('700'), fontSize: theme.sp(12) }}>
                    ¿Olvidaste tu clave?
                  </Text>
                </Pressable>
              </View>
              <View style={[styles.inputBox, { backgroundColor: theme.muted, borderColor: theme.border }]}>
                <Lock size={17} color={theme.textMuted} />
                <TextInput
                  ref={passwordRef}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={theme.textMuted}
                  secureTextEntry={!showPass}
                  autoComplete="password"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 140)}
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
              title="Entrar a Lumio"
              onPress={handleLogin}
              loading={loading}
              icon={<ArrowRight size={17} color="#FFFFFF" />}
              size="lg"
              style={{ marginTop: 4 }}
            />
          </PremiumCard>

          <View style={styles.bottomRow}>
            <Text style={{ color: theme.textSecondary, fontFamily: theme.font('500'), fontSize: theme.sp(13) }}>
              ¿Aún no tienes cuenta?
            </Text>
            <Pressable onPress={() => router.replace('/(auth)/register')}>
              <Text style={{ color: theme.brand, fontFamily: theme.font('800'), fontSize: theme.sp(13.5) }}>
                Regístrate gratis
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: 20, paddingBottom: 32, gap: 20, justifyContent: 'center' },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: { gap: 5 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  line: { flex: 1, height: 1 },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
  },
  input: { flex: 1, minWidth: 0, height: '100%' },
  passLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
});
