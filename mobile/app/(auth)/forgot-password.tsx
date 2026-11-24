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
import { ArrowLeft, CheckCircle2, Mail, Send } from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { supabase } from '@/lib/supabase';
import { API_BASE_URL } from '@/lib/api-client';
import { showAppToast } from '@/stores/toast-store';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { PremiumCard } from '@/components/ui/PremiumCard';

export default function ForgotPasswordScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView> | null>(null);

  const handleSend = async () => {
    const clean = email.trim().toLowerCase();
    if (!clean.includes('@')) {
      showAppToast.warning({ title: 'Ingresa un correo válido' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(clean, {
        redirectTo: `${API_BASE_URL}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      showAppToast.success({
        title: 'Correo enviado',
        description: 'Revisa tu bandeja para restablecer tu contraseña.',
      });
    } catch (err: any) {
      showAppToast.error({
        title: 'No se pudo enviar el enlace',
        description: err?.message,
      });
    } finally {
      setLoading(false);
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
        >
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <ArrowLeft size={19} color={theme.text} />
          </Pressable>

          <PremiumCard padding={22} style={{ gap: 16 }}>
            {sent ? (
              <View style={{ alignItems: 'center', gap: 12 }}>
                <View style={[styles.iconBadge, { backgroundColor: theme.incomeSoft }]}>
                  <CheckCircle2 size={30} color={theme.income} />
                </View>
                <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(20), textAlign: 'center' }}>
                  Enlace de recuperación enviado
                </Text>
                <Text style={{ color: theme.textSecondary, fontFamily: theme.font('400'), fontSize: theme.sp(13), textAlign: 'center' }}>
                  Revisa tu bandeja de entrada en {email.trim()} y sigue las instrucciones para actualizar tu contraseña.
                </Text>
                <PremiumButton
                  title="Volver a iniciar sesión"
                  onPress={() => router.replace('/(auth)/login')}
                  style={{ width: '100%' }}
                />
              </View>
            ) : (
              <>
                <View style={{ gap: 6 }}>
                  <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(22) }}>
                    Recuperar contraseña
                  </Text>
                  <Text style={{ color: theme.textSecondary, fontFamily: theme.font('400'), fontSize: theme.sp(13) }}>
                    Te enviaremos un enlace seguro a tu correo registrado.
                  </Text>
                </View>

                <View style={[styles.inputBox, { backgroundColor: theme.muted, borderColor: theme.border }]}>
                  <Mail size={17} color={theme.textMuted} />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="nombre@correo.com"
                    placeholderTextColor={theme.textMuted}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 140)}
                    style={[styles.input, { color: theme.text, fontFamily: theme.font('600'), fontSize: theme.sp(14) }]}
                  />
                </View>

                <PremiumButton
                  title="Enviar instrucciones"
                  onPress={handleSend}
                  loading={loading}
                  icon={<Send size={16} color="#FFFFFF" />}
                  size="lg"
                />
              </>
            )}
          </PremiumCard>
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
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 22,
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
});
