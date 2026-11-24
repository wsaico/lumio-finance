import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  Download,
  FileSpreadsheet,
  FileText,
  Layers,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/theme/ThemeProvider';
import { TopAppHeader } from '@/components/navigation/TopAppHeader';
import { CurvedHeroHeader } from '@/components/ui/CurvedHeroHeader';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { ShimmerSkeleton } from '@/components/ui/ShimmerSkeleton';
import { PremiumPreviewGate } from '@/components/ui/PremiumPreviewGate';
import { useSubscription } from '@/hooks/useSubscription';
import { useFormat } from '@/hooks/useFormat';
import { useManualRefresh } from '@/hooks/useManualRefresh';
import { apiGet } from '@/lib/api-client';
import { downloadAuthenticatedFile } from '@/lib/downloads';
import { alphaHex } from '@/lib/color-math';
import { showAppToast } from '@/stores/toast-store';

const PERIODS = [
  { id: 'this_month', label: 'Este mes' },
  { id: 'last_month', label: 'Mes pasado' },
  { id: 'last_3_months', label: '3 meses' },
  { id: 'this_year', label: 'Este año' },
  { id: 'all', label: 'Todo el historial' },
] as const;

export default function ReportsScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { formatMaskedMoney, baseCurrency, isBalanceVisible } = useFormat();
  const { canExportReports } = useSubscription();

  const [period, setPeriod] = useState<string>('this_month');
  const [downloadingFormat, setDownloadingFormat] = useState<'excel' | 'pdf' | 'csv' | null>(null);

  const previewQuery = useQuery<any>({
    queryKey: ['reports-preview', period, baseCurrency],
    queryFn: () =>
      apiGet(
        `/api/reports/export?format=preview&period=${encodeURIComponent(period)}&currency=${encodeURIComponent(baseCurrency)}`
      ),
  });

  const totals = previewQuery.data?.totals || {};
  const counts = previewQuery.data?.counts || {};
  const fileStamp = new Date().toISOString().slice(0, 10);

  const handleExport = async (fmt: 'excel' | 'pdf' | 'csv') => {
    if (!canExportReports) {
      showAppToast.premium({
        title: 'Exportación Premium',
        description: 'Activa Lumio Premium para descargar tus reportes en PDF, Excel y CSV.',
      });
      router.push('/billing' as any);
      return;
    }

    setDownloadingFormat(fmt);
    const ext = fmt === 'excel' ? 'xlsx' : fmt;
    const mimeMap = {
      excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      pdf: 'application/pdf',
      csv: 'text/csv',
    };
    const path = `/api/reports/export?format=${fmt}&period=${encodeURIComponent(period)}&currency=${encodeURIComponent(baseCurrency)}`;
    await downloadAuthenticatedFile(path, `Lumio-Reporte-${fileStamp}.${ext}`, mimeMap[fmt]);
    setDownloadingFormat(null);
  };

  const { refreshing: manualRefreshing, onRefresh: handleManualRefresh } = useManualRefresh(() =>
    previewQuery.refetch()
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={manualRefreshing}
            onRefresh={handleManualRefresh}
            tintColor={theme.brand}
          />
        }
      >
        <CurvedHeroHeader>
          <TopAppHeader
            title="Reportes Ejecutivos"
            subtitle={previewQuery.data?.periodLabel || 'Auditoría y exportación'}
            showBack
            onHero
          />
          <View style={styles.heroStats}>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontFamily: theme.font('600'), fontSize: theme.sp(12) }}>
              Patrimonio neto estimado ({baseCurrency})
            </Text>
            <AnimatedNumber
              value={Number(totals.netWorth || 0)}
              currencyCode={baseCurrency}
              hidden={!isBalanceVisible}
              style={{ color: '#FFFFFF', fontFamily: theme.font('800'), fontSize: theme.sp(29) }}
            />
          </View>
        </CurvedHeroHeader>

        <PremiumPreviewGate moduleName="Reportes y Exportación">
          <View style={styles.body}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {PERIODS.map((p) => {
                const active = period === p.id;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => setPeriod(p.id)}
                    style={[
                      styles.periodChip,
                      {
                        backgroundColor: active ? theme.brand : theme.card,
                        borderColor: active ? theme.brand : theme.border,
                      },
                    ]}
                  >
                    <Calendar size={12} color={active ? '#FFFFFF' : theme.textMuted} />
                    <Text style={{ color: active ? '#FFFFFF' : theme.text, fontFamily: theme.font('700'), fontSize: theme.sp(12) }}>
                      {p.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {previewQuery.isLoading ? (
              <ShimmerSkeleton height={150} borderRadius={22} />
            ) : (
              <PremiumCard padding={16} style={{ gap: 12 }}>
                <View style={styles.previewHead}>
                  <Layers size={15} color={theme.brand} />
                  <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(14) }}>
                    Vista previa del resumen
                  </Text>
                </View>

                <View style={styles.summaryGrid}>
                  <View style={[styles.sumCell, { backgroundColor: theme.muted }]}>
                    <Text style={styles.sumLbl}>Ingresos</Text>
                    <Text style={[styles.sumVal, { color: theme.income, fontFamily: theme.font('800') }]}>
                      {formatMaskedMoney(totals.income || 0)}
                    </Text>
                  </View>
                  <View style={[styles.sumCell, { backgroundColor: theme.muted }]}>
                    <Text style={styles.sumLbl}>Gastos</Text>
                    <Text style={[styles.sumVal, { color: theme.coral, fontFamily: theme.font('800') }]}>
                      {formatMaskedMoney(totals.expenses || 0)}
                    </Text>
                  </View>
                  <View style={[styles.sumCell, { backgroundColor: theme.muted }]}>
                    <Text style={styles.sumLbl}>Flujo neto</Text>
                    <Text style={[styles.sumVal, { color: theme.text, fontFamily: theme.font('800') }]}>
                      {formatMaskedMoney(totals.netCashflow || 0)}
                    </Text>
                  </View>
                  <View style={[styles.sumCell, { backgroundColor: theme.muted }]}>
                    <Text style={styles.sumLbl}>Movimientos</Text>
                    <Text style={[styles.sumVal, { color: theme.brand, fontFamily: theme.font('800') }]}>
                      {counts.transactions ?? 0} reg.
                    </Text>
                  </View>
                </View>
              </PremiumCard>
            )}

            <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(15) }}>
              Formatos de descarga
            </Text>

            {[
              {
                fmt: 'excel' as const,
                title: 'Libro Excel Ejecutivo (.xlsx)',
                desc: 'Múltiples hojas con movimientos, cuentas, presupuestos, metas y préstamos.',
                color: theme.income,
                Icon: FileSpreadsheet,
              },
              {
                fmt: 'pdf' as const,
                title: 'Reporte Financiero PDF (.pdf)',
                desc: 'Documento ejecutivo listo para imprimir o compartir.',
                color: theme.coral,
                Icon: FileText,
              },
              {
                fmt: 'csv' as const,
                title: 'Hoja de Movimientos CSV (.csv)',
                desc: 'Formato estándar UTF-8 compatible con Excel y Google Sheets.',
                color: theme.brand,
                Icon: Download,
              },
            ].map((item) => {
              const Icon = item.Icon;
              const busy = downloadingFormat === item.fmt;
              return (
                <Pressable
                  key={item.fmt}
                  disabled={Boolean(downloadingFormat)}
                  onPress={() => handleExport(item.fmt)}
                >
                  <PremiumCard padding={16} style={styles.exportCard}>
                    <View style={[styles.exportIcon, { backgroundColor: alphaHex(item.color, 0.14), borderRadius: theme.iconRadius }]}>
                      <Icon size={22} color={item.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(14.5) }}>
                        {item.title}
                      </Text>
                      <Text style={{ color: theme.textSecondary, fontFamily: theme.font('500'), fontSize: theme.sp(12), marginTop: 2 }}>
                        {item.desc}
                      </Text>
                    </View>
                    <View style={[styles.dlBtn, { backgroundColor: item.color }]}>
                      <Download size={16} color="#FFFFFF" />
                      <Text style={{ color: '#FFFFFF', fontFamily: theme.font('800'), fontSize: 11.5 }}>
                        {busy ? '...' : 'Bajar'}
                      </Text>
                    </View>
                  </PremiumCard>
                </Pressable>
              );
            })}
          </View>
        </PremiumPreviewGate>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { paddingBottom: 42 },
  heroStats: { marginTop: 14, gap: 4 },
  body: { padding: 16, gap: 14 },
  chipRow: { gap: 8 },
  periodChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  previewHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sumCell: { width: '48.4%', borderRadius: 15, padding: 12, gap: 3 },
  sumLbl: { color: '#64748B', fontSize: 11.5, fontWeight: '600' },
  sumVal: { fontSize: 15.5, fontVariant: ['tabular-nums'] },
  exportCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  exportIcon: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  dlBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 12 },
});
