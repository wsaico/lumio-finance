import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Crown, Sparkles } from 'lucide-react-native';
import { useSubscription } from '@/hooks/useSubscription';
import { useAppTheme } from '@/theme/ThemeProvider';
import { PremiumButton } from './PremiumButton';
import { alphaHex } from '@/lib/color-math';

export function PremiumPreviewGate({
  moduleName,
  children,
}: {
  moduleName: string;
  children: React.ReactNode;
}) {
  const theme = useAppTheme();
  const router = useRouter();
  const { isFree } = useSubscription();

  return (
    <View style={{ flex: 1 }}>
      {isFree ? (
        <View
          style={[
            styles.banner,
            {
              backgroundColor: alphaHex(theme.coral, theme.isDark ? 0.16 : 0.1),
              borderColor: alphaHex(theme.coral, 0.35),
            },
          ]}
        >
          <View style={[styles.iconPill, { backgroundColor: theme.coral }]}>
            <Crown size={15} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.title,
                { color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(12.5) },
              ]}
            >
              Modo vista previa · {moduleName}
            </Text>
            <Text
              style={[
                styles.sub,
                { color: theme.textSecondary, fontFamily: theme.font('500'), fontSize: theme.sp(11) },
              ]}
            >
              Activa Lumio Premium para crear, editar y sincronizar cambios.
            </Text>
          </View>
          <PremiumButton
            title="Activar"
            variant="coral"
            size="sm"
            icon={<Sparkles size={13} color="#FFFFFF" />}
            onPress={() => router.push('/billing' as any)}
          />
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
  },
  iconPill: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    lineHeight: 16,
  },
  sub: {
    lineHeight: 14.5,
    marginTop: 1,
  },
});
