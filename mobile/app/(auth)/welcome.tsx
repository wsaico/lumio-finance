import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgGrad, Path, Rect, Stop } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, Sparkles } from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { triggerHaptic } from '@/lib/haptics';

const SLIDES = [
  {
    key: 'clarity',
    eyebrow: 'CONTROL TOTAL',
    title: 'Domina tu dinero en segundos',
    subtitle: 'Registra ingresos, gastos y transferencias con un flujo rápido y sin fricción.',
  },
  {
    key: 'budgets',
    eyebrow: 'PRESUPUESTOS Y METAS',
    title: 'Planifica y alcanza tus objetivos',
    subtitle: 'Controla tus límites mensuales, regla 50/30/20 y ahorro automático en un solo lugar.',
  },
  {
    key: 'insights',
    eyebrow: 'ANÁLISIS INTELIGENTE',
    title: 'Decisiones claras cada día',
    subtitle: 'Visualiza tu salud financiera, flujo neto, divisas y proyecciones al instante.',
  },
] as const;

function SlideArtwork({ index }: { index: number }) {
  if (index === 1) {
    return (
      <Svg width={270} height={200} viewBox="0 0 270 200">
        <Defs>
          <SvgGrad id="bg2" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.22" />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.07" />
          </SvgGrad>
        </Defs>
        <Circle cx="52" cy="48" r="36" fill="#FF7A33" opacity="0.24" />
        <Circle cx="222" cy="154" r="32" fill="#34D399" opacity="0.2" />
        <Rect x="26" y="24" width="218" height="148" rx="28" fill="url(#bg2)" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" />
        {/* Grouped budget bars */}
        <Rect x="56" y="102" width="14" height="44" rx="7" fill="#FF7A33" />
        <Rect x="74" y="72" width="14" height="74" rx="7" fill="#FFFFFF" opacity="0.9" />
        <Rect x="108" y="88" width="14" height="58" rx="7" fill="#FF7A33" />
        <Rect x="126" y="64" width="14" height="82" rx="7" fill="#FFFFFF" opacity="0.9" />
        <Rect x="160" y="96" width="14" height="50" rx="7" fill="#FF7A33" />
        <Rect x="178" y="56" width="14" height="90" rx="7" fill="#34D399" />
        <Rect x="198" y="38" width="30" height="10" rx="5" fill="#FF7A33" />
      </Svg>
    );
  }

  if (index === 2) {
    return (
      <Svg width={270} height={200} viewBox="0 0 270 200">
        <Defs>
          <SvgGrad id="bg3" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.22" />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.07" />
          </SvgGrad>
        </Defs>
        <Circle cx="212" cy="44" r="34" fill="#34D399" opacity="0.22" />
        <Rect x="26" y="24" width="218" height="148" rx="28" fill="url(#bg3)" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" />
        {/* Progress ring */}
        <Circle cx="94" cy="98" r="38" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="11" />
        <Path
          d="M 94 60 A 38 38 0 1 1 59 113"
          fill="none"
          stroke="#FF7A33"
          strokeWidth="11"
          strokeLinecap="round"
        />
        <Rect x="150" y="68" width="72" height="14" rx="7" fill="rgba(255,255,255,0.85)" />
        <Rect x="150" y="92" width="54" height="10" rx="5" fill="rgba(255,255,255,0.35)" />
        <Rect x="150" y="114" width="64" height="22" rx="11" fill="#34D399" />
      </Svg>
    );
  }

  return (
    <Svg width={270} height={200} viewBox="0 0 270 200">
      <Defs>
        <SvgGrad id="cardBg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.22" />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.08" />
        </SvgGrad>
        <SvgGrad id="waveLine" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0%" stopColor="#FF8F4D" />
          <Stop offset="100%" stopColor="#34D399" />
        </SvgGrad>
      </Defs>
      <Circle cx="215" cy="46" r="38" fill="#FF7A33" opacity="0.25" />
      <Circle cx="48" cy="156" r="32" fill="#FFFFFF" opacity="0.12" />
      <Rect x="24" y="24" width="222" height="148" rx="28" fill="url(#cardBg)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      <Path
        d="M 44 132 C 78 132, 92 90, 126 96 C 160 102, 174 54, 224 60"
        fill="none"
        stroke="url(#waveLine)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <Circle cx="224" cy="60" r="7" fill="#FFFFFF" stroke="#FF7A33" strokeWidth="3.5" />
      <Rect x="44" y="44" width="84" height="16" rx="8" fill="rgba(255,255,255,0.32)" />
      <Rect x="44" y="68" width="52" height="10" rx="5" fill="rgba(255,255,255,0.18)" />
      <Rect x="164" y="128" width="62" height="24" rx="12" fill="#FF7A33" />
    </Svg>
  );
}

export default function WelcomeScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  const handleNext = () => {
    triggerHaptic('selection');
    if (isLast) {
      router.push('/(auth)/register');
    } else {
      setStep((s) => Math.min(SLIDES.length - 1, s + 1));
    }
  };

  return (
    <LinearGradient
      colors={theme.heroGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.flex}
    >
      <SafeAreaView style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar: Brand + Skip */}
          <View style={styles.topRow}>
            <View style={styles.brandBadge}>
              <Sparkles size={14} color="#FF7A33" />
              <Text style={[styles.brandText, { fontFamily: theme.font('800') }]}>
                LUMIO FINANCE
              </Text>
            </View>

            {!isLast && (
              <Pressable
                onPress={() => {
                  triggerHaptic('light');
                  router.push('/(auth)/login');
                }}
                style={styles.skipBtn}
              >
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontFamily: theme.font('700'), fontSize: 13 }}>
                  Saltar
                </Text>
              </Pressable>
            )}
          </View>

          {/* Center Artwork */}
          <View style={styles.artWrap}>
            <SlideArtwork index={step} />
          </View>

          {/* Slide Copy */}
          <View style={styles.copyWrap}>
            <Text style={[styles.eyebrow, { fontFamily: theme.font('800') }]}>
              {slide.eyebrow}
            </Text>
            <Text
              style={[
                styles.headline,
                { fontFamily: theme.font('800'), fontSize: theme.sp(30) },
              ]}
            >
              {slide.title}
            </Text>
            <Text
              style={[
                styles.subtitle,
                { fontFamily: theme.font('400'), fontSize: theme.sp(14.5) },
              ]}
            >
              {slide.subtitle}
            </Text>
          </View>

          {/* Interactive Pagination Dots */}
          <View style={styles.dotsRow}>
            {SLIDES.map((s, idx) => {
              const active = idx === step;
              return (
                <Pressable
                  key={s.key}
                  onPress={() => {
                    triggerHaptic('selection');
                    setStep(idx);
                  }}
                  style={[
                    styles.dot,
                    {
                      width: active ? 28 : 8,
                      backgroundColor: active ? '#FF7A33' : 'rgba(255,255,255,0.34)',
                    },
                  ]}
                />
              );
            })}
          </View>

          {/* Bottom Actions */}
          <View style={styles.actions}>
            <PremiumButton
              title={isLast ? 'Crear cuenta gratis' : 'Siguiente'}
              variant="coral"
              size="lg"
              icon={<ArrowRight size={18} color="#FFFFFF" />}
              onPress={handleNext}
            />

            <Pressable
              onPress={() => {
                triggerHaptic('light');
                router.push('/(auth)/login');
              }}
              style={({ pressed }) => [
                styles.secondaryBtn,
                { opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={[styles.secondaryText, { fontFamily: theme.font('700'), fontSize: theme.sp(14.5) }]}>
                Ya tengo una cuenta
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 28,
    justifyContent: 'space-between',
    gap: 18,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  brandText: { color: '#FFFFFF', fontSize: 12, letterSpacing: 1.2 },
  skipBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  artWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  copyWrap: {
    gap: 8,
  },
  eyebrow: {
    color: '#FFB085',
    fontSize: 11.5,
    letterSpacing: 1.3,
  },
  headline: {
    color: '#FFFFFF',
    lineHeight: 36,
    letterSpacing: -0.6,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.82)',
    lineHeight: 22,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 99,
  },
  actions: {
    gap: 11,
  },
  secondaryBtn: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  secondaryText: {
    color: '#FFFFFF',
  },
});
