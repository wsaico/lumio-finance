'use server';

import { createClient } from '@/lib/supabase/server';
import { startOfMonth, endOfMonth, subMonths, format, differenceInDays, endOfDay, startOfDay } from 'date-fns';
import { expandCategoryIds } from '@/lib/category-utils';
import { getExchangeRatesMap, convertAmount } from '@/lib/currency';

export async function getFinancialHealthData() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            throw new Error('Unauthorized');
        }

        const now = new Date();
        const targetCurrency = user.user_metadata?.currency || 'PEN';

        // 1. Fetch Rates and Accounts
        const [rateMap, accountsRes] = await Promise.all([
            getExchangeRatesMap(supabase),
            supabase.from('accounts').select('id, currency_code, current_balance, account_type').eq('user_id', user.id)
        ]);

        const accounts = accountsRes.data || [];
        const accountCurrencyMap: Record<string, string> = {};
        accounts.forEach(acc => {
            accountCurrencyMap[acc.id] = acc.currency_code;
        });

        const toBase = (amount: number, currency: string) => {
            return convertAmount(amount, currency, targetCurrency, rateMap);
        };

        // 2. Fetch Categories
        const [userExp, sysExp, userInc, sysInc] = await Promise.all([
            supabase.from('expense_categories').select('*').eq('user_id', user.id),
            supabase.from('expense_categories').select('*').is('user_id', null),
            supabase.from('income_categories').select('*').eq('user_id', user.id),
            supabase.from('income_categories').select('*').is('user_id', null)
        ]);

        const allCategories = [
            ...(userExp.data || []).map(c => ({ ...c, type: 'EXPENSE', parent_id: c.parent_category_id })),
            ...(sysExp.data || []).map(c => ({ ...c, type: 'EXPENSE', parent_id: c.parent_category_id })),
            ...(userInc.data || []).map(c => ({ ...c, type: 'INCOME', parent_id: c.parent_category_id })),
            ...(sysInc.data || []).map(c => ({ ...c, type: 'INCOME', parent_id: c.parent_category_id }))
        ];

        const idToCategory: Record<string, any> = {};
        allCategories.forEach(c => { idToCategory[c.id] = c; });

        // Range for current and previous month
        const currentStart = startOfMonth(now).toISOString();
        const currentEnd = endOfMonth(now).toISOString();
        const prevStart = startOfMonth(subMonths(now, 1)).toISOString();
        const prevEnd = endOfMonth(subMonths(now, 1)).toISOString();

        const getStatsForRange = async (start: string, end: string) => {
            const { data: txs } = await supabase
                .from('transactions')
                .select('amount, transaction_type, currency_code, account_id')
                .eq('user_id', user.id)
                .gte('transaction_date', start)
                .lte('transaction_date', end);

            let inc = 0, exp = 0;
            txs?.forEach(tx => {
                const amt = toBase(Number(tx.amount), tx.currency_code || accountCurrencyMap[tx.account_id]);
                if (tx.transaction_type === 'INCOME') inc += amt;
                if (tx.transaction_type === 'EXPENSE') exp += amt;
            });
            return { income: inc, expense: exp };
        };

        const [current, previous] = await Promise.all([
            getStatsForRange(currentStart, currentEnd),
            getStatsForRange(prevStart, prevEnd)
        ]);

        // 3. Category Breakdown (Needs/Wants/Savings)
        const { data: catTxs } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', user.id)
            .gte('transaction_date', currentStart)
            .lte('transaction_date', currentEnd)
            .eq('transaction_type', 'EXPENSE');

        let needs = 0, wants = 0, savings = 0;
        const categorySpending: Record<string, any> = {};

        catTxs?.forEach((tx: any) => {
            const amt = toBase(Number(tx.amount), tx.currency_code || accountCurrencyMap[tx.account_id]);
            const cat = tx.expense_category_id ? idToCategory[tx.expense_category_id] : null;
            const rule = cat?.budget_rule || 'WANT';

            if (rule === 'NEED') needs += amt;
            else if (rule === 'SAVINGS') savings += amt;
            else wants += amt;

            if (tx.expense_category_id) {
                if (!categorySpending[tx.expense_category_id]) {
                    categorySpending[tx.expense_category_id] = {
                        name: cat?.name || 'Otros',
                        amount: 0,
                        color: cat?.color || '#ccc',
                        rule
                    };
                }
                categorySpending[tx.expense_category_id].amount += amt;
            }
        });

        // 4. Liquidity & Health
        const liquidityAccounts = accounts.filter((acc: any) => acc.account_type !== 'CREDIT_CARD');
        const totalLiquidity = liquidityAccounts.reduce((sum, acc) => sum + toBase(Number(acc.current_balance), acc.currency_code), 0);

        const avgMonthlyExpense = previous.expense > 0 ? (current.expense + previous.expense) / 2 : current.expense;
        const runwayMonths = avgMonthlyExpense > 0 ? totalLiquidity / avgMonthlyExpense : 12;

        const savingsRate = current.income > 0 ? ((current.income - current.expense) / current.income) * 100 : 0;
        const healthScore = Math.min(100, Math.max(0,
            (savingsRate > 20 ? 40 : (savingsRate / 20) * 40) +
            (runwayMonths > 6 ? 30 : (runwayMonths / 6) * 30) +
            (current.income > current.expense ? 30 : 10)
        ));

        return {
            score: Math.round(healthScore),
            runway: Math.round(runwayMonths * 10) / 10,
            liquidity: totalLiquidity,
            metrics: {
                income: current.income,
                expense: current.expense,
                savings: current.income - current.expense,
                savingsRate: Math.round(savingsRate)
            },
            ruleBreakdown: {
                needs: { amount: needs, percent: current.income > 0 ? (needs / current.income) * 100 : 0 },
                wants: { amount: wants, percent: current.income > 0 ? (wants / current.income) * 100 : 0 },
                savings: { amount: savings, percent: current.income > 0 ? (savings / current.income) * 100 : 0 }
            },
            topCategories: Object.values(categorySpending)
                .sort((a: any, b: any) => b.amount - a.amount)
                .slice(0, 5),
            currency: targetCurrency
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
        console.error('Error fetching health data:', error);
        throw error;
    }
}
