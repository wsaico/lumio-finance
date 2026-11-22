import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Edit3,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react-native';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAppTheme } from '@/theme/ThemeProvider';
import { TopAppHeader } from '@/components/navigation/TopAppHeader';
import { CurvedHeroHeader } from '@/components/ui/CurvedHeroHeader';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { CircularProgressRing } from '@/components/ui/CircularProgressRing';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { ShimmerSkeleton } from '@/components/ui/ShimmerSkeleton';
import { ConfirmAlertModal } from '@/components/alerts/ConfirmAlertModal';
import { GoalFormModal } from '@/components/savings-goals/GoalFormModal';
import { ContributeModal } from '@/components/savings-goals/ContributeModal';
import { WithdrawModal } from '@/components/savings-goals/WithdrawModal';
import {
  useDeleteSavingsGoal,
  useGoalContributions,
  useSavingsGoal,
  useSyncSavingsGoal,
} from '@/hooks/useSavingsGoals';
import { useFormat } from '@/hooks/useFormat';
import { alphaHex } from '@/lib/color-math';

export default function SavingsGoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useAppTheme();
  const router = useRouter();
  const { formatMaskedMoney, isBalanceVisible } = useFormat();

  const goalQuery = useSavingsGoal(id || '');
  const contribQuery = useGoalContributions(id || '');
  const deleteGoal = useDeleteSavingsGoal();
  const syncGoal = useSyncSavingsGoal();

  const [editOpen, setEditOpen] = useState(false);
  const [contributeOpen, setContributeOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const goal = goalQuery.data;
  const contributions = contribQuery.data || [];

  const target = Number(goal?.target_amount) || 0;
  const current = Number(goal?.current_amount) || 0;
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={goalQuery.isLoading}
            onRefresh={() => {
              goalQuery.refetch();
              contribQuery.refetch();
            }}
            tintColor={theme.brand}
          />
        }
      >
        <CurvedHeroHeader>
          <TopAppHeader
            title={goal?.name || 'Detalle de meta'}
            subtitle="Seguimiento de aportes"
            showBack
            onHero
            rightSlot={
              goal ? (
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Pressable onPress={() => setEditOpen(true)} style={styles.heroIconBtn}>
                    <Edit3 size={16} color="#FFFFFF" />
                  </Pressable>
                  <Pressable onPress={() => setDeleteOpen(true)} style={styles.heroIconBtn}>
                    <Trash2 size={16} color="#FFFFFF" />
                  </Pressable>
                </View>
              ) : null
            }
          />

          {goal ? (
            <View style={styles.heroBody}>
              <CircularProgressRing
                progress={pct}
                size={92}
                strokeWidth={9}
                color={theme.coral}
                trackColor="rgba(255,255,255,0.2)"
                label={`${pct}%`}
                labelColor="#FFFFFF"
              />
              <View style={{ flex: 1 }}>
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontFamily: theme.font('600'), fontSize: theme.sp(12) }}>
                  Acumulado actual
                </Text>
                <AnimatedNumber
                  value={current}
                  currencyCode={goal.currency}
                  hidden={!isBalanceVisible}
                  style={{ color: '#FFFFFF', fontFamily: theme.font('800'), fontSize: theme.sp(26) }}
                />
                <Text style={{ color: 'rgba(255,255,255,0.82)', fontFamily: theme.font('600'), fontSize: theme.sp(12), fontVariant: ['tabular-nums'] }}>
                  Objetivo: {formatMaskedMoney(target, goal.currency)}
                </Text>
              </View>
            </View>
          ) : (
            <ShimmerSkeleton height={90} borderRadius={20} style={{ marginTop: 12 }} />
          )}
        </CurvedHeroHeader>

        {goal && (
          <View style={styles.body}>
            <View style={styles.actionRow}>
              <Pressable
                onPress={() => setContributeOpen(true)}
                style={[styles.mainAction, { backgroundColor: theme.coral }]}
              >
                <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={{ color: '#FFFFFF', fontFamily: theme.font('800'), fontSize: theme.sp(13.5) }}>
                  Aportar
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setWithdrawOpen(true)}
                style={[styles.secAction, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <ArrowUpRight size={16} color={theme.text} />
                <Text style={{ color: theme.text, fontFamily: theme.font('700'), fontSize: theme.sp(13.5) }}>
                  Retirar
                </Text>
              </Pressable>
              <Pressable
                onPress={() => syncGoal.mutate(goal.id)}
                style={[styles.syncBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <RefreshCw size={16} color={theme.brand} />
              </Pressable>
            </View>

            <PremiumCard padding={16} style={styles.statsCard}>
              <View style={styles.statCell}>
                <Text style={{ color: theme.textMuted, fontFamily: theme.font('600'), fontSize: theme.sp(11) }}>
                  Restante
                </Text>
                <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(15), fontVariant: ['tabular-nums'] }}>
                  {formatMaskedMoney(Math.max(0, target - current), goal.currency)}
                </Text>
              </View>
              <View style={[styles.vSep, { backgroundColor: theme.border }]} />
              <View style={styles.statCell}>
                <Text style={{ color: theme.textMuted, fontFamily: theme.font('600'), fontSize: theme.sp(11) }}>
                  Aporte mensual sugerido
                </Text>
                <Text style={{ color: theme.brand, fontFamily: theme.font('800'), fontSize: theme.sp(15), fontVariant: ['tabular-nums'] }}>
                  {formatMaskedMoney(goal.monthlyNeeded || 0, goal.currency)}
                </Text>
              </View>
              {goal.target_date ? (
                <>
                  <View style={[styles.vSep, { backgroundColor: theme.border }]} />
                  <View style={styles.statCell}>
                    <Text style={{ color: theme.textMuted, fontFamily: theme.font('600'), fontSize: theme.sp(11) }}>
                      Fecha límite
                    </Text>
                    <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(13) }}>
                      {format(new Date(goal.target_date), 'd MMM yy', { locale: es })}
                    </Text>
                  </View>
                </>
              ) : null}
            </PremiumCard>

            <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(15.5), marginTop: 4 }}>
              Historial de aportes ({contributions.length})
            </Text>

            {contribQuery.isLoading ? (
              <ShimmerSkeleton height={80} borderRadius={20} />
            ) : contributions.length === 0 ? (
              <EmptyStateCard
                icon={<Calendar size={26} color={theme.brand} />}
                title="Aún sin aportes registrados"
                description="Registra tu primer abono para ver crecer tu círculo de progreso."
                actionLabel="Hacer primer aporte"
                onAction={() => setContributeOpen(true)}
              />
            ) : (
              <View style={{ gap: 10 }}>
                {contributions.map((c) => {
                  const isNeg = Number(c.amount) < 0;
                  return (
                    <PremiumCard key={c.id} padding={14} style={styles.contribRow}>
                      <View
                        style={[
                          styles.contribIcon,
                          {
                            backgroundColor: alphaHex(
                              isNeg ? theme.coral : theme.income,
                              0.14
                            ),
                          },
                        ]}
                      >
                        {isNeg ? (
                          <ArrowUpRight size={17} color={theme.coral} />
                        ) : (
                          <ArrowDownLeft size={17} color={theme.income} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: theme.text, fontFamily: theme.font('700'), fontSize: theme.sp(13.5) }}>
                          {c.notes || (isNeg ? 'Retiro de meta' : 'Aporte a meta')}
                        </Text>
                        <Text style={{ color: theme.textMuted, fontFamily: theme.font('500'), fontSize: theme.sp(11.5) }}>
                          {format(new Date(c.contribution_date), "d 'de' MMM, yyyy", { locale: es })}
                        </Text>
                      </View>
                      <Text
                        style={{
                          color: isNeg ? theme.coral : theme.income,
                          fontFamily: theme.font('800'),
                          fontSize: theme.sp(14.5),
                          fontVariant: ['tabular-nums'],
                        }}
                      >
                        {isNeg ? '' : '+'}
                        {formatMaskedMoney(c.amount, goal.currency)}
                      </Text>
                    </PremiumCard>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <GoalFormModal open={editOpen} onOpenChange={setEditOpen} initialGoal={goal} />
      <ContributeModal open={contributeOpen} onOpenChange={setContributeOpen} goal={goal || null} />
      <WithdrawModal open={withdrawOpen} onOpenChange={setWithdrawOpen} goal={goal || null} />
      <ConfirmAlertModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        variant="danger"
        title="Eliminar meta"
        description={goal ? `¿Eliminar "${goal.name}"?` : ''}
        confirmLabel="Eliminar"
        isLoading={deleteGoal.isPending}
        onConfirm={async () => {
          if (goal) {
            await deleteGoal.mutateAsync(goal.id);
            router.back();
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { paddingBottom: 42 },
  heroIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBody: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 14 },
  body: { padding: 16, gap: 14 },
  actionRow: { flexDirection: 'row', gap: 10 },
  mainAction: {
    flex: 1.4,
    height: 46,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secAction: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  syncBtn: {
    width: 46,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsCard: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statCell: { flex: 1, gap: 3 },
  vSep: { width: 1, height: 32 },
  contribRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  contribIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
