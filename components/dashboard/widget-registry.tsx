"use client"

import { TotalBalanceCard } from "./total-balance-card"
import { FinancialHealthWidget } from "./widgets/financial-health-widget"
import { SavingsGoalsWidget } from "./widgets/savings-goals-widget"
import { AgeOfMoneyWidget } from "./age-of-money-widget"
import { CriticalBudgetsWidget } from "./widgets/critical-budgets-widget"
import { QuickActionsWidget } from "./widgets/quick-actions-widget"
import { CreditCardAlertWidget } from "./widgets/credit-card-alert-widget"
import { DailyVolatilityWidget } from "./widgets/daily-volatility-widget"
import { MonthlyActivityWidget } from "./widgets/monthly-activity-widget"
import { CalendarHeatmapWidget } from "./widgets/calendar-heatmap-widget"
import { SmartInsightsWidget } from "./smart-insights-widget"
import { CashFlowSummaryWidget } from "./cash-flow-summary-widget"
import { ExpenseStructureWidget } from "./expense-structure-widget"
import { TransactionList } from "@/components/transactions/transaction-list"
import { Card } from "@/components/ui/card"
import { ExpenseNatureWidget } from "./expense-nature-widget"
import { BalanceTrendWidget } from "./balance-trend-widget"
import { CurrencyBreakdownWidget } from "./currency-breakdown-widget"
import { WidgetId } from "@/hooks/use-dashboard-store"
import { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"

interface WidgetDefinition {
    id: WidgetId
    component: ReactNode
    title: string
    defaultColSpan: string // Tailwind classes e.g., 'col-span-1 md:col-span-2'
    minH?: string
}

const RecentActivityWidget = () => (
    <Card className="glass border-none shadow-premium-md p-4 md:p-6 h-full">
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-base md:text-lg font-semibold">
                Últimos Movimientos
            </h3>
            <Link href="/transactions/new">
                <Button size="sm" className="shadow-lg shadow-primary/20 bg-primary text-primary-foreground rounded-full px-4 h-8 gap-1">
                    <Plus className="w-4 h-4" /> Registrar
                </Button>
            </Link>
        </div>
        <TransactionList limit={5} />
    </Card>
)

export const WIDGET_REGISTRY: Record<WidgetId, WidgetDefinition> = {
    'total-balance': {
        id: 'total-balance',
        title: 'Balance Total',
        component: <TotalBalanceCard />,
        defaultColSpan: 'col-span-1 md:col-span-2'
    },
    'financial-health': {
        id: 'financial-health',
        title: 'Salud Financiera',
        component: <FinancialHealthWidget />,
        defaultColSpan: 'col-span-1',
        minH: 'min-h-[260px]'
    },
    'savings-goals': {
        id: 'savings-goals',
        title: 'Metas de Ahorro',
        component: <SavingsGoalsWidget />,
        defaultColSpan: 'col-span-1 md:col-span-2 lg:col-span-3',
        minH: 'min-h-[240px]'
    },
    'critical-budgets': {
        id: 'critical-budgets',
        title: 'Alertas de Presupuesto',
        component: <CriticalBudgetsWidget />,
        defaultColSpan: 'col-span-1',
        minH: 'min-h-[240px]'
    },
    'quick-actions': {
        id: 'quick-actions',
        title: 'Acciones Rápidas',
        component: <QuickActionsWidget />,
        defaultColSpan: 'col-span-1',
        minH: 'min-h-[150px]'
    },
    'credit-card-alerts': {
        id: 'credit-card-alerts',
        title: 'Vencimientos TC',
        component: <CreditCardAlertWidget />,
        defaultColSpan: 'col-span-1',
        minH: 'min-h-[180px]'
    },
    'cash-flow': {
        id: 'cash-flow',
        title: 'Flujo de Caja',
        component: <CashFlowSummaryWidget />,
        defaultColSpan: 'col-span-1 md:col-span-2 lg:col-span-3'
    },
    'expense-structure': {
        id: 'expense-structure',
        title: 'Estructura',
        component: <ExpenseStructureWidget />,
        defaultColSpan: 'col-span-1 md:col-span-2'
    },
    'recent-activity': {
        id: 'recent-activity',
        title: 'Actividad Reciente',
        component: <RecentActivityWidget />,
        defaultColSpan: 'col-span-1 md:col-span-2'
    },
    'balance-trend': {
        id: 'balance-trend',
        title: 'Tendencia',
        component: <BalanceTrendWidget />,
        defaultColSpan: 'col-span-1'
    },
    'currency-breakdown': {
        id: 'currency-breakdown',
        title: 'Monedas',
        component: <CurrencyBreakdownWidget />,
        defaultColSpan: 'col-span-1'
    },
    'expense-nature': {
        id: 'expense-nature',
        title: 'Naturaleza (50/30/20)',
        component: <ExpenseNatureWidget />,
        defaultColSpan: 'col-span-1'
    },
    'daily-volatility': {
        id: 'daily-volatility',
        title: 'Volatilidad Diaria',
        component: <DailyVolatilityWidget />,
        defaultColSpan: 'col-span-1 md:col-span-2',
        minH: 'min-h-[160px]'
    },
    'activity-heatmap': {
        id: 'activity-heatmap',
        title: 'Intensidad de Gastos',
        component: <MonthlyActivityWidget />,
        defaultColSpan: 'col-span-1 md:col-span-1',
        minH: 'min-h-[240px]'
    },
    'activity-heatmap-v2': {
        id: 'activity-heatmap-v2',
        title: 'Mapa de Calor',
        component: <CalendarHeatmapWidget />,
        defaultColSpan: 'col-span-1 md:col-span-2',
        minH: 'min-h-[240px]'
    },
    'age-of-money': {
        id: 'age-of-money',
        title: 'Edad del Dinero',
        component: <AgeOfMoneyWidget />,
        defaultColSpan: 'col-span-1',
        minH: 'min-h-[120px]'
    }
}
