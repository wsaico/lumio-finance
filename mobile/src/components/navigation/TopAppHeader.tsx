import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bell, Eye, EyeOff, Settings } from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useUser } from '@/hooks/useUser';
import { useSettingsStore } from '@/stores/settings-store';
import { useNotifications } from '@/hooks/useNotifications';
import { triggerHaptic } from '@/lib/haptics';
import { safeGoBack } from '@/lib/navigation';

export function TopAppHeader({
  title,
  subtitle,
  showBack = false,
  onHero = false,
  rightSlot,
  hideDefaultActions = false,
}: {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onHero?: boolean;
  rightSlot?: React.ReactNode;
  hideDefaultActions?: boolean;
}) {
  const theme = useAppTheme();
  const router = useRouter();
  const { profile } = useUser();
  const isBalanceVisible = useSettingsStore((s) => s.isBalanceVisible);
  const setIsBalanceVisible = useSettingsStore((s) => s.setIsBalanceVisible);
  const { unreadCount } = useNotifications();

  const iconColor = onHero ? '#FFFFFF' : theme.text;
  const btnBg = onHero ? 'rgba(255,255,255,0.16)' : theme.muted;

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        {showBack ? (
          <Pressable
            onPress={() => {
              triggerHaptic('light');
              safeGoBack(router, '/(tabs)');
            }}
            style={[styles.iconBtn, { backgroundColor: btnBg }]}
            accessibilityLabel="Volver"
          >
            <ArrowLeft size={19} color={iconColor} />
          </Pressable>
        ) : (
          <Pressable
            onPress={() => router.push('/settings' as any)}
            style={styles.avatarWrap}
          >
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: onHero ? 'rgba(255,255,255,0.2)' : theme.brandSoft }]}>
                <Text style={{ color: onHero ? '#FFFFFF' : theme.brand, fontFamily: theme.font('800'), fontSize: 15 }}>
                  {(profile?.full_name || 'L').slice(0, 1).toUpperCase()}
                </Text>
              </View>
            )}
          </Pressable>
        )}

        <View style={{ flex: 1 }}>
          {title ? (
            <Text
              numberOfLines={1}
              style={{
                color: onHero ? '#FFFFFF' : theme.text,
                fontFamily: theme.font('800'),
                fontSize: theme.sp(18),
                letterSpacing: -0.3,
              }}
            >
              {title}
            </Text>
          ) : null}
          {subtitle ? (
            <Text
              numberOfLines={1}
              style={{
                color: onHero ? 'rgba(255,255,255,0.78)' : theme.textMuted,
                fontFamily: theme.font('500'),
                fontSize: theme.sp(11.5),
              }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.right}>
        {rightSlot}
        {!hideDefaultActions ? (
          <>
            <Pressable
              onPress={() => {
                triggerHaptic('light');
                setIsBalanceVisible(!isBalanceVisible);
              }}
              style={[styles.iconBtn, { backgroundColor: btnBg }]}
              accessibilityLabel="Alternar visibilidad de saldos"
            >
              {isBalanceVisible ? (
                <Eye size={18} color={iconColor} />
              ) : (
                <EyeOff size={18} color={iconColor} />
              )}
            </Pressable>

            <Pressable
              onPress={() => {
                triggerHaptic('light');
                router.push('/notifications' as any);
              }}
              style={[styles.iconBtn, { backgroundColor: btnBg }]}
              accessibilityLabel="Notificaciones"
            >
              <Bell size={18} color={iconColor} />
              {unreadCount > 0 ? (
                <View style={[styles.badge, { backgroundColor: theme.coral }]}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              ) : null}
            </Pressable>

            {!showBack ? (
              <Pressable
                onPress={() => {
                  triggerHaptic('light');
                  router.push('/settings' as any);
                }}
                style={[styles.iconBtn, { backgroundColor: btnBg }]}
                accessibilityLabel="Ajustes"
              >
                <Settings size={18} color={iconColor} />
              </Pressable>
            ) : null}
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 17,
    height: 17,
    borderRadius: 99,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
});
