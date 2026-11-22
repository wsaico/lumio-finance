import React, { useEffect, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as LocalAuthentication from 'expo-local-authentication';
import {
  Camera,
  Eye,
  EyeOff,
  Fingerprint,
  Home,
  KeyRound,
  LogOut,
  PiggyBank,
  Repeat,
  Sparkles,
  Tags,
  UserCheck,
  Vibrate,
  Wallet,
} from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { PremiumBottomSheet } from '@/components/ui/PremiumBottomSheet';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { ConfirmAlertModal } from '@/components/alerts/ConfirmAlertModal';
import { getStoredPinCode, setStoredPinCode } from '@/components/security/PinLockOverlay';
import { SettingsGroup, SettingsRow, SettingsSwitch } from './SettingsShared';
import { useUser } from '@/hooks/useUser';
import { useSettingsStore } from '@/stores/settings-store';
import { apiDelete, apiPatch, apiPost, apiUploadFormData } from '@/lib/api-client';
import { invalidateFinancialGraph } from '@/lib/query-keys';
import { supabase } from '@/lib/supabase';
import { alphaHex } from '@/lib/color-math';
import { triggerHaptic } from '@/lib/haptics';
import { showAppToast } from '@/stores/toast-store';

export function GeneralSection() {
  const theme = useAppTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile, mutateProfile } = useUser();
  const store = useSettingsStore();

  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [biometricsSupported, setBiometricsSupported] = useState(false);

  const [homeModalOpen, setHomeModalOpen] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setBiometricsSupported(false);
      return;
    }
    void (async () => {
      try {
        const hasHw = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setBiometricsSupported(hasHw && enrolled);
      } catch {
        setBiometricsSupported(false);
      }
    })();
  }, []);

  const handleAvatarUpload = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showAppToast.warning({ title: 'Permiso requerido para elegir foto' });
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.75,
      });
      if (res.canceled || !res.assets[0]) return;
      const asset = res.assets[0];
      setUploadingAvatar(true);

      const formData = new FormData();
      if (Platform.OS === 'web' && asset.file) {
        formData.append('file', asset.file);
      } else {
        const ext = (asset.uri.split('.').pop() || 'jpg').toLowerCase();
        formData.append('file', {
          uri: asset.uri,
          name: `avatar-${Date.now()}.${ext}`,
          type: asset.mimeType || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        } as any);
      }

      await apiUploadFormData('/api/user/avatar', formData);
      mutateProfile();
      showAppToast.success({ title: 'Foto de perfil actualizada' });
    } catch (err: any) {
      showAppToast.error({ title: 'No se pudo subir la foto', description: err?.message });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    setSavingName(true);
    try {
      await apiPatch('/api/user/preferences', { full_name: nameInput.trim() });
      mutateProfile();
      setNameModalOpen(false);
      showAppToast.success({ title: 'Nombre actualizado' });
    } catch (err: any) {
      showAppToast.error({ title: 'Error al guardar nombre', description: err?.message });
    } finally {
      setSavingName(false);
    }
  };

  const handleSavePin = async () => {
    const clean = pinInput.replace(/\D/g, '').slice(0, 4);
    if (clean.length !== 4) {
      showAppToast.warning({ title: 'El PIN debe tener exactamente 4 dígitos' });
      return;
    }
    await setStoredPinCode(clean);
    store.setPinLockEnabled(true);
    setPinModalOpen(false);
    showAppToast.success({ title: 'PIN de 4 dígitos activado' });
  };

  const handleToggleDemo = async () => {
    setDemoLoading(true);
    try {
      if (profile?.demo_mode_active) {
        await apiDelete('/api/demo');
        showAppToast.success({ title: 'Modo demostración desactivado', description: 'Tus registros reales permanecen intactos.' });
      } else {
        await apiPost('/api/demo', {});
        showAppToast.success({ title: 'Datos de demostración cargados' });
      }
      invalidateFinancialGraph(queryClient);
      mutateProfile();
    } catch (err: any) {
      showAppToast.error({ title: 'Error en modo demo', description: err?.message });
    } finally {
      setDemoLoading(false);
    }
  };

  const handleLogout = async () => {
    await setStoredPinCode('');
    store.setPinLockEnabled(false);
    await supabase.auth.signOut();
    queryClient.clear();
    router.replace('/welcome' as any);
  };

  return (
    <View style={{ gap: 18 }}>
      {/* Profile Card */}
      <PremiumCard padding={16} style={styles.profileCard}>
        <Pressable onPress={handleAvatarUpload} style={styles.avatarWrap}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: theme.brandSoft }]}>
              <Text style={{ color: theme.brand, fontFamily: theme.font('800'), fontSize: 22 }}>
                {(profile?.full_name || 'L').slice(0, 1).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={[styles.camBadge, { backgroundColor: theme.coral }]}>
            <Camera size={12} color="#FFFFFF" />
          </View>
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(16) }}>
            {profile?.full_name || 'Usuario Lumio'}
          </Text>
          <Text style={{ color: theme.textMuted, fontFamily: theme.font('500'), fontSize: theme.sp(12) }}>
            {profile?.email || ''}
          </Text>
          <Text style={{ color: theme.brand, fontFamily: theme.font('700'), fontSize: 11, marginTop: 3 }}>
            {uploadingAvatar ? 'Subiendo foto...' : 'Toca el avatar para cambiar foto'}
          </Text>
        </View>

        <Pressable
          onPress={() => {
            setNameInput(profile?.full_name || '');
            setNameModalOpen(true);
          }}
          style={[styles.editNameBtn, { backgroundColor: theme.muted }]}
        >
          <UserCheck size={16} color={theme.brand} />
        </Pressable>
      </PremiumCard>

      <SettingsGroup title="Seguridad y experiencia">
        <SettingsRow
          Icon={Vibrate}
          title="Respuesta háptica"
          description="Vibración sutil al pulsar botones y teclado"
          right={
            <SettingsSwitch
              value={store.hapticsEnabled}
              onValueChange={(v) => {
                store.setHapticsEnabled(v);
                if (v) setTimeout(() => triggerHaptic('medium'), 40);
              }}
            />
          }
        />
        <SettingsRow
          Icon={store.isBalanceVisible ? Eye : EyeOff}
          title="Mostrar saldos y montos"
          description="Alterna visibilidad inmediata en tarjetas y listas"
          right={
            <SettingsSwitch
              value={store.isBalanceVisible}
              onValueChange={store.setIsBalanceVisible}
            />
          }
        />
        <SettingsRow
          Icon={EyeOff}
          title="Iniciar con saldos ocultos"
          description="Modo discreto cada vez que abres la app"
          right={
            <SettingsSwitch
              value={store.startHiddenBalances}
              onValueChange={store.setStartHiddenBalances}
            />
          }
        />
        <SettingsRow
          Icon={KeyRound}
          title="Bloqueo con PIN (4 dígitos)"
          description={store.pinLockEnabled ? 'Activo en este dispositivo' : 'Protege tu app al abrir'}
          onPress={async () => {
            const current = await getStoredPinCode();
            setPinInput(current);
            setPinModalOpen(true);
          }}
          right={
            <SettingsSwitch
              value={store.pinLockEnabled}
              onValueChange={async (v) => {
                if (v) {
                  const current = await getStoredPinCode();
                  setPinInput(current);
                  setPinModalOpen(true);
                } else {
                  store.setPinLockEnabled(false);
                }
              }}
            />
          }
        />
        {biometricsSupported && store.pinLockEnabled && (
          <SettingsRow
            Icon={Fingerprint}
            title="Desbloqueo biométrico"
            description="Face ID o huella dactilar"
            right={
              <SettingsSwitch
                value={store.biometricsEnabled}
                onValueChange={store.setBiometricsEnabled}
              />
            }
          />
        )}
        <SettingsRow
          Icon={Home}
          title="Editar página de inicio"
          description="Elige los widgets visibles en tu Dashboard"
          onPress={() => setHomeModalOpen(true)}
        />
        <SettingsRow
          Icon={Sparkles}
          title={profile?.demo_mode_active ? 'Desactivar modo demostración' : 'Cargar datos de demostración'}
          description={
            profile?.demo_mode_active
              ? 'Limpia los ejemplos y conserva tus datos reales'
              : 'Explora toda la app con ejemplos reversibles'
          }
          onPress={handleToggleDemo}
          right={
            <Text style={{ color: theme.brand, fontFamily: theme.font('800'), fontSize: 12 }}>
              {demoLoading ? '...' : profile?.demo_mode_active ? 'Limpiar' : 'Cargar'}
            </Text>
          }
          isLast
        />
      </SettingsGroup>

      {/* Quick Tiles */}
      <View style={styles.tileGrid}>
        {[
          { label: 'Categorías', href: '/settings/categories', Icon: Tags },
          { label: 'Cuentas', href: '/(tabs)/accounts', Icon: Wallet },
          { label: 'Metas', href: '/savings-goals', Icon: PiggyBank },
          { label: 'Suscripciones', href: '/subscriptions', Icon: Repeat },
        ].map((t) => {
          const Icon = t.Icon;
          return (
            <Pressable
              key={t.href}
              onPress={() => router.push(t.href as any)}
              style={[styles.tile, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <View style={[styles.tileIcon, { backgroundColor: theme.brandSoft, borderRadius: theme.iconRadius }]}>
                <Icon size={18} color={theme.brand} />
              </View>
              <Text style={{ color: theme.text, fontFamily: theme.font('700'), fontSize: theme.sp(12) }}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <SettingsGroup>
        <SettingsRow
          Icon={LogOut}
          title="Cerrar sesión"
          description="Cierra tu sesión segura en este dispositivo"
          variant="danger"
          onPress={() => setLogoutConfirm(true)}
          isLast
        />
      </SettingsGroup>

      {/* Edit Name Modal */}
      <PremiumBottomSheet
        open={nameModalOpen}
        onClose={() => setNameModalOpen(false)}
        title="Editar nombre"
        footer={
          <PremiumButton
            title="Guardar nombre"
            variant="coral"
            loading={savingName}
            onPress={handleSaveName}
          />
        }
      >
        <TextInput
          value={nameInput}
          onChangeText={setNameInput}
          placeholder="Tu nombre completo"
          placeholderTextColor={theme.textMuted}
          style={[styles.input, { backgroundColor: theme.muted, borderColor: theme.border, color: theme.text, fontFamily: theme.font('600') }]}
        />
      </PremiumBottomSheet>

      {/* PIN Modal */}
      <PremiumBottomSheet
        open={pinModalOpen}
        onClose={() => setPinModalOpen(false)}
        title="Configurar PIN de 4 dígitos"
        subtitle="Se solicitará al abrir o reanudar la aplicación"
        footer={
          <PremiumButton title="Activar PIN" variant="coral" onPress={handleSavePin} />
        }
      >
        <TextInput
          value={pinInput}
          onChangeText={(t) => setPinInput(t.replace(/\D/g, '').slice(0, 4))}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={4}
          placeholder="••••"
          placeholderTextColor={theme.textMuted}
          style={[styles.pinInput, { backgroundColor: theme.muted, borderColor: theme.border, color: theme.text, fontFamily: theme.font('800') }]}
        />
      </PremiumBottomSheet>

      {/* Home Widgets Sheet */}
      <PremiumBottomSheet
        open={homeModalOpen}
        onClose={() => setHomeModalOpen(false)}
        title="Widgets del Dashboard"
        subtitle="Personaliza qué módulos ves primero al iniciar"
      >
        <View style={{ gap: 4, paddingBottom: 12 }}>
          <SettingsRow
            Icon={Sparkles}
            title="Indicadores clave (KPIs)"
            right={
              <SettingsSwitch
                value={store.homeWidgets.kpis}
                onValueChange={(v) => store.setHomeWidgets({ kpis: v })}
              />
            }
          />
          <SettingsRow
            Icon={Home}
            title="Gráficos y tendencia"
            right={
              <SettingsSwitch
                value={store.homeWidgets.charts}
                onValueChange={(v) => store.setHomeWidgets({ charts: v })}
              />
            }
          />
          <SettingsRow
            Icon={PiggyBank}
            title="Presupuestos destacados"
            right={
              <SettingsSwitch
                value={store.homeWidgets.budgets}
                onValueChange={(v) => store.setHomeWidgets({ budgets: v })}
              />
            }
          />
          <SettingsRow
            Icon={Wallet}
            title="Movimientos recientes"
            right={
              <SettingsSwitch
                value={store.homeWidgets.recentTx}
                onValueChange={(v) => store.setHomeWidgets({ recentTx: v })}
              />
            }
            isLast
          />
        </View>
      </PremiumBottomSheet>

      <ConfirmAlertModal
        open={logoutConfirm}
        onOpenChange={setLogoutConfirm}
        variant="danger"
        title="Cerrar sesión"
        description="¿Deseas salir de tu cuenta en este dispositivo?"
        confirmLabel="Cerrar sesión"
        onConfirm={handleLogout}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarFallback: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  camBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  editNameBtn: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: {
    width: '48.6%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tileIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  input: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  pinInput: { borderWidth: 1, borderRadius: 18, paddingVertical: 14, fontSize: 28, textAlign: 'center', letterSpacing: 14 },
});
