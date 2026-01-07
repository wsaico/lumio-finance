'use server';

import { createClient } from '@/lib/supabase/server';
import { DashboardData, MonthlyMetric, BudgetAlert } from '@/components/analysis/types';
import { getExchangeRatesMap, convertAmount } from '@/lib/currency';

export async function getDashboardData(): Promise<DashboardData> {
    try {
        const supabase = await createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;

        // Default Empty State
        const emptyState: DashboardData = {
            metrics: { availableMoney: 0, totalIncome: 0, totalExpense: 0, netFlow: 0, savingsRate: 0, transactionsCount: 0, dailyIncomeAvg: 0, dailyExpenseAvg: 0 },
            history: [],
            accounts: [],
            expensesByCategory: [],
            healthScore: 0,
            activityHeatmap: [],
            activityDaily: []
        };

        if (!user) return emptyState;

        const userId = user.id;

        // 1. Fetch Accounts
        const { data: accountsData } = await supabase
            .from('accounts')
            .select('id, name, currency_code, current_balance, account_type')
            .eq('user_id', userId);

        const accounts = (accountsData || []).map(acc => ({
            id: acc.id,
            name: acc.name,
            currency: acc.currency_code,
            balance: Number(acc.current_balance),
            type: acc.account_type
        }));

        const targetCurrency = user.user_metadata?.currency || 'PEN';
        const rateMap = await getExchangeRatesMap(supabase);

        const availableMoney = accounts.reduce((sum, acc) => {
            return sum + convertAmount(acc.balance, acc.currency, targetCurrency, rateMap);
        }, 0);

        // 2. Fetch Transactions (Last 6 Months)
        const now = new Date();
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();

        const { data: transactions } = await supabase
            .from('transactions')
            .select(`
                amount, 
                transaction_type, 
                transaction_date, 
                currency_code, 
                account_id, 
                expense_category_id, 
                income_category_id,
                subcategory_id,
                expense_category:expense_categories(name, color),
                subcategory:subcategories(name, expense_category:expense_categories(name, color))
            `)
            .eq('user_id', userId)
            .gte('transaction_date', sixMonthsAgo)
            .order('transaction_date', { ascending: true });

        // 3. Process Metrics (Current Month)
        const currentMonthIdx = now.getMonth();
        const currentYear = now.getFullYear();

        const parseTxDate = (value: string | null | undefined) => {
            if (!value) return null;
            const datePart = value.split('T')[0];
            const [y, m, d] = datePart.split('-').map(Number);
            if (!y || !m || !d) return null;
            return { y, m, d };
        };

        const currentMonthTx = transactions?.filter(t => {
            const parts = parseTxDate(t.transaction_date);
            if (!parts) return false;
            return parts.m === currentMonthIdx + 1 && parts.y === currentYear;
        }) || [];

        let totalIncome = 0;
        let totalExpense = 0;
        currentMonthTx.forEach((t: any) => {
            const rawAmount = Number(t.amount);
            const currency = t.currency_code || accounts.find(a => a.id === t.account_id)?.currency || targetCurrency;
            const val = convertAmount(rawAmount, currency, targetCurrency, rateMap);

            if (t.transaction_type === 'INCOME') totalIncome += Math.abs(val);
            if (t.transaction_type === 'EXPENSE') totalExpense += Math.abs(val);
        });

        const netFlow = totalIncome - totalExpense;
        const savingsRate = totalIncome > 0 ? (netFlow / totalIncome) * 100 : 0;

        // 4. Process Monthly History (Last 6 Months)
        const historyMap = new Map<string, { income: number, expense: number }>();
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${monthNames[d.getMonth()]}`;
            historyMap.set(key, { income: 0, expense: 0 });
        }

        transactions?.forEach((t: any) => {
            const d = new Date(t.transaction_date);
            const key = monthNames[d.getMonth()];
            if (historyMap.has(key)) {
                const rawAmount = Number(t.amount);
                const currency = t.currency_code || accounts.find(a => a.id === t.account_id)?.currency || targetCurrency;
                const val = convertAmount(rawAmount, currency, targetCurrency, rateMap);

                const entry = historyMap.get(key)!;
                if (t.transaction_type === 'INCOME') entry.income += Math.abs(val);
                if (t.transaction_type === 'EXPENSE') entry.expense += Math.abs(val);
            }
        });

        const history: MonthlyMetric[] = Array.from(historyMap.entries()).map(([month, data]) => ({
            month,
            income: data.income,
            expense: data.expense,
            balance: data.income - data.expense
        }));

        // 5. Process Expenses by Category (Current Month Focus for Treemap - More relevant)
        const categoryMap = new Map<string, { value: number, color: string }>();

        currentMonthTx.forEach((t: any) => {
            if (t.transaction_type === 'EXPENSE') {
                const category = t.expense_category || t.subcategory?.expense_category;
                if (!category) return;

                const name = category.name;
                const color = category.color || '#94a3b8';
                const rawAmount = Number(t.amount);
                const currency = t.currency_code || accounts.find(a => a.id === t.account_id)?.currency || targetCurrency;
                const val = Math.abs(convertAmount(rawAmount, currency, targetCurrency, rateMap));

                if (categoryMap.has(name)) {
                    const entry = categoryMap.get(name)!;
                    entry.value += val;
                } else {
                    categoryMap.set(name, { value: val, color });
                }
            }
        });

        const expensesByCategory = Array.from(categoryMap.entries())
            .map(([name, data]) => ({ name, value: data.value, fill: data.color }))
            .sort((a, b) => b.value - a.value);

        // 6. Fetch Global Budget Comparison and Alerts
        const { data: budgets } = await supabase
            .from('budgets')
            .select('amount, name, color, include_categories, exclude_categories')
            .eq('user_id', userId)
            .eq('budget_month', currentMonthIdx + 1)
            .eq('budget_year', currentYear);

        let totalBudgetAmount = 0;
        let totalBudgetSpentAmount = 0;
        const budgetAlerts: BudgetAlert[] = [];

        (budgets || []).forEach(b => {
            const amount = Number(b.amount);
            totalBudgetAmount += amount;

            const includeCats = b.include_categories || [];
            const excludeCats = b.exclude_categories || [];

            const budgetSpent = currentMonthTx.reduce((sum, t: any) => {
                if (t.transaction_type !== 'EXPENSE') return sum;
                const category = t.expense_category || t.subcategory?.expense_category;
                const catName = category?.name || '';
                const isIncluded = includeCats.length === 0 || includeCats.includes(catName);
                const isExcluded = excludeCats.includes(catName);
                if (isIncluded && !isExcluded) {
                    const rawAmount = Number(t.amount);
                    const currency = t.currency_code || accounts.find(a => a.id === t.account_id)?.currency || targetCurrency;
                    return sum + convertAmount(rawAmount, currency, targetCurrency, rateMap);
                }
                return sum;
            }, 0);

            totalBudgetSpentAmount += budgetSpent;
            const percent = amount > 0 ? (budgetSpent / amount) * 100 : 0;
            if (percent > 0 || amount > 0) {
                budgetAlerts.push({
                    name: b.name,
                    total: amount,
                    spent: budgetSpent,
                    percent: Math.min(Math.round(percent), 100),
                    color: percent > 100 ? 'bg-red-500' : (percent > 85 ? 'bg-amber-500' : 'bg-emerald-500')
                });
            }
        });

        const budgetUsage = totalBudgetAmount > 0 ? (totalBudgetSpentAmount / totalBudgetAmount) * 100 : 0;

        // 7. Daily Metrics logic
        const daysInMonthElapsed = now.getDate();
        const dailyIncomeAvg = totalIncome / daysInMonthElapsed;
        const dailyExpenseAvg = totalExpense / daysInMonthElapsed;

        // 8. Health Score logic
        let healthScore = 0;
        if (totalIncome > 0) {
            const savingsComponent = Math.min(Math.max(savingsRate, 0), 20) / 20 * 50;
            const budgetComponent = totalBudgetAmount > 0 ? Math.max(0, (1 - (totalBudgetSpentAmount / totalBudgetAmount))) * 30 : 15;
            const usageComponent = currentMonthTx.length > 5 ? 20 : 10;
            healthScore = Math.floor(savingsComponent + budgetComponent + usageComponent);
        }

        // 9. Activity Heatmap
        const daysInMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();
        const activityHeatmap = new Array(daysInMonth).fill(false);
        const activityDaily = Array.from({ length: daysInMonth }, () => ({ count: 0, net: 0 }));

        currentMonthTx.forEach(t => {
            const parts = parseTxDate(t.transaction_date);
            const day = parts?.d ?? new Date(t.transaction_date).getDate();
            if (day >= 1 && day <= daysInMonth) {
                activityHeatmap[day - 1] = true;
                activityDaily[day - 1].count += 1;

                const rawAmount = Number(t.amount);
                const currency = t.currency_code || accounts.find(a => a.id === t.account_id)?.currency || targetCurrency;
                const val = convertAmount(rawAmount, currency, targetCurrency, rateMap);
                if (t.transaction_type === 'INCOME') activityDaily[day - 1].net += val;
                if (t.transaction_type === 'EXPENSE') activityDaily[day - 1].net -= val;
            }
        });

        return {
            metrics: {
                availableMoney,
                totalIncome,
                totalExpense,
                netFlow,
                savingsRate,
                transactionsCount: currentMonthTx.length,
                dailyIncomeAvg,
                dailyExpenseAvg
            },
            history,
            accounts,
            expensesByCategory,
            healthScore,
            budget: {
                totalActual: totalBudgetAmount,
                totalSpent: totalBudgetSpentAmount,
                usagePercentage: budgetUsage
            },
            budgetAlerts,
            activityHeatmap,
            activityDaily
        };

    } catch (error: any) {
        // Next.js dynamic usage error detection - MUST re-throw immediately and silently
        const errorString = String(error);
        const isDynamicError =
            error?.digest === 'DYNAMIC_SERVER_USAGE' ||
            error?.message?.includes('Dynamic server usage') ||
            error?.description?.includes('Dynamic server usage') ||
            errorString.includes('Dynamic server usage') ||
            errorString.includes('cookies') ||
            errorString.includes('next/headers');

        if (isDynamicError) {
            throw error;
        }
        console.error("Failed to fetch dashboard data:", error);
        return {
            metrics: { availableMoney: 0, totalIncome: 0, totalExpense: 0, netFlow: 0, savingsRate: 0, transactionsCount: 0, dailyIncomeAvg: 0, dailyExpenseAvg: 0 },
            history: [],
            accounts: [],
            expensesByCategory: [],
            healthScore: 0,
            activityHeatmap: [],
            activityDaily: []
        };
    }
}
