export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
    startOfMonth,
    endOfMonth,
    subMonths,
    subDays,
    format,
    differenceInDays,
    endOfDay,
    startOfDay,
} from "date-fns"
import { es } from "date-fns/locale"
import { expandCategoryIds } from "@/lib/category-utils"
import { getExchangeRatesMap, convertAmount } from "@/lib/currency"
import { getServiceRoleClient } from "@/lib/server/system-settings"

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const categoriesFilter = searchParams.get("categories")?.split(",").filter(Boolean) || []
        const accountsFilter = searchParams.get("accounts")?.split(",").filter(Boolean) || []
        const typeParam = searchParams.get("type") || "ALL"
        const periodParam = searchParams.get("period") || "6m"
        const startDateParam = searchParams.get("startDate")
        const endDateParam = searchParams.get("endDate")

        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const db = getServiceRoleClient() || supabase
        const now = new Date()
        const targetCurrency =
            searchParams.get("currency") || user.user_metadata?.currency || "PEN"

        // 0. Fetch Exchange Rates, Accounts, and Categories in parallel
        const [rateMap, accountsRes, userExp, sysExp, userInc, sysInc] = await Promise.all([
            getExchangeRatesMap(db),
            db
                .from("accounts")
                .select(
                    "id, name, currency_code, current_balance, credit_limit, used_balance, account_type, payment_due_day, is_active, exclude_from_stats"
                )
                .eq("user_id", user.id)
                .eq("is_active", true),
            db.from("expense_categories").select("*").eq("user_id", user.id),
            db.from("expense_categories").select("*").is("user_id", null),
            db.from("income_categories").select("*").eq("user_id", user.id),
            db.from("income_categories").select("*").is("user_id", null),
        ])

        const accounts = (accountsRes.data || []).filter((a: any) => !a.exclude_from_stats)
        const accountCurrencyMap: Record<string, string> = {}
        accounts.forEach((acc: any) => {
            accountCurrencyMap[acc.id] = acc.currency_code
        })

        const toBase = (amount: number, currency?: string) => {
            return convertAmount(Number(amount || 0), currency || targetCurrency, targetCurrency, rateMap)
        }

        const allCategories = [
            ...(userExp.data || []).map((c: any) => ({
                ...c,
                type: "EXPENSE",
                parent_id: c.parent_category_id,
            })),
            ...(sysExp.data || []).map((c: any) => ({
                ...c,
                type: "EXPENSE",
                parent_id: c.parent_category_id,
            })),
            ...(userInc.data || []).map((c: any) => ({
                ...c,
                type: "INCOME",
                parent_id: c.parent_category_id,
            })),
            ...(sysInc.data || []).map((c: any) => ({
                ...c,
                type: "INCOME",
                parent_id: c.parent_category_id,
            })),
        ]

        const idToCategory: Record<string, any> = {}
        const categoriesByName: Record<string, string[]> = {}
        const normalize = (n: string) => (n ? n.trim().toLowerCase() : "")

        allCategories.forEach((c) => {
            idToCategory[c.id] = c
            if (c.name) {
                const key = normalize(c.name)
                if (!categoriesByName[key]) categoriesByName[key] = []
                categoriesByName[key].push(c.id)
            }
        })

        // 1. Coherent Analytical Period Window
        let analyticsStartDate: Date
        let analyticsEndDate: Date = endOfDay(now)
        let monthsInPeriod = 1
        let trendMonthsCount = 6

        if (periodParam === "this_month") {
            analyticsStartDate = startOfMonth(now)
            analyticsEndDate = endOfDay(now)
            monthsInPeriod = 1
            trendMonthsCount = 6
        } else if (periodParam === "1m") {
            analyticsStartDate = startOfDay(subDays(now, 29))
            analyticsEndDate = endOfDay(now)
            monthsInPeriod = 1
            trendMonthsCount = 6
        } else if (periodParam === "3m") {
            analyticsStartDate = startOfMonth(subMonths(now, 2))
            analyticsEndDate = endOfDay(now)
            monthsInPeriod = 3
            trendMonthsCount = 3
        } else if (periodParam === "12m") {
            analyticsStartDate = startOfMonth(subMonths(now, 11))
            analyticsEndDate = endOfDay(now)
            monthsInPeriod = 12
            trendMonthsCount = 12
        } else if (periodParam === "custom" && startDateParam && endDateParam) {
            analyticsStartDate = startOfDay(new Date(startDateParam))
            analyticsEndDate = endOfDay(new Date(endDateParam))
            const diffD = Math.max(1, differenceInDays(analyticsEndDate, analyticsStartDate) + 1)
            monthsInPeriod = Math.max(1, Math.round((diffD / 30) * 10) / 10)
            trendMonthsCount = 6
        } else {
            // Default "6m"
            analyticsStartDate = startOfMonth(subMonths(now, 5))
            analyticsEndDate = endOfDay(now)
            monthsInPeriod = 6
            trendMonthsCount = 6
        }

        const analyticsStart = analyticsStartDate.toISOString()
        const analyticsEnd = analyticsEndDate.toISOString()
        const elapsedDaysInPeriod = Math.max(
            1,
            differenceInDays(analyticsEndDate, analyticsStartDate) + 1
        )

        const thisMonthStart = startOfMonth(now).toISOString()
        const thisMonthEnd = endOfMonth(now).toISOString()
        const prevMonthStart = startOfMonth(subMonths(now, 1)).toISOString()
        const prevMonthEnd = endOfMonth(subMonths(now, 1)).toISOString()

        // Earliest date needed for both trend and period analysis in a SINGLE batch query
        const trendStartDate = startOfMonth(subMonths(now, Math.max(trendMonthsCount, 2) - 1))
        const batchFetchStart =
            analyticsStartDate < trendStartDate
                ? analyticsStartDate.toISOString()
                : trendStartDate.toISOString()

        const applyCommonFilters = (query: any) => {
            let q = query.eq("user_id", user.id)
            if (categoriesFilter.length > 0) {
                q = q.or(
                    `expense_category_id.in.(${categoriesFilter.join(",")}),income_category_id.in.(${categoriesFilter.join(",")})`
                )
            }
            if (accountsFilter.length > 0) {
                q = q.in("account_id", accountsFilter)
            }
            if (typeParam !== "ALL") {
                q = q.eq("transaction_type", typeParam)
            }
            return q
        }

        // Single batch query for all transactions in the analytical & trend window
        let txQuery = db
            .from("transactions")
            .select(
                "id, amount, transaction_type, currency_code, account_id, expense_category_id, income_category_id, subcategory_id, transaction_date, description, savings_goal_id, loan_id, metadata"
            )
            .gte("transaction_date", batchFetchStart)
            .lte("transaction_date", thisMonthEnd)

        txQuery = applyCommonFilters(txQuery)
        const { data: allWindowTxs, error: txError } = await txQuery
        if (txError) {
            console.error("[FinancialHealth] Batch Tx Query Error:", txError)
        }

        const windowTxs = allWindowTxs || []

        // 2. Build Multi-Month Trend in memory (Spanish labels, zero sequential round-trips)
        const trendBuckets: Record<
            string,
            { key: string; name: string; income: number; expense: number; net: number }
        > = {}
        const trendOrder: string[] = []

        for (let i = trendMonthsCount - 1; i >= 0; i--) {
            const mDate = subMonths(now, i)
            const key = format(mDate, "yyyy-MM")
            const rawLabel = format(mDate, "MMM", { locale: es }).replace(".", "")
            const label = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1)
            trendBuckets[key] = { key, name: label, income: 0, expense: 0, net: 0 }
            trendOrder.push(key)
        }

        let periodIncome = 0
        let periodExpense = 0
        let thisMonthIncome = 0
        let thisMonthExpense = 0
        let prevMonthIncome = 0
        let prevMonthExpense = 0

        const periodTxs: any[] = []

        for (const tx of windowTxs) {
            const rawAmount = Number(tx.amount || 0)
            const currency = tx.currency_code || accountCurrencyMap[tx.account_id] || targetCurrency
            const amt = toBase(rawAmount, currency)
            const txIso = new Date(tx.transaction_date).toISOString()
            const monthKey = format(new Date(tx.transaction_date), "yyyy-MM")

            if (trendBuckets[monthKey]) {
                if (tx.transaction_type === "INCOME") trendBuckets[monthKey].income += amt
                else if (tx.transaction_type === "EXPENSE") trendBuckets[monthKey].expense += amt
                trendBuckets[monthKey].net =
                    trendBuckets[monthKey].income - trendBuckets[monthKey].expense
            }

            if (txIso >= analyticsStart && txIso <= analyticsEnd) {
                periodTxs.push({ ...tx, convertedAmount: amt })
                if (tx.transaction_type === "INCOME") periodIncome += amt
                else if (tx.transaction_type === "EXPENSE") periodExpense += amt
            }

            if (txIso >= thisMonthStart && txIso <= thisMonthEnd) {
                if (tx.transaction_type === "INCOME") thisMonthIncome += amt
                else if (tx.transaction_type === "EXPENSE") thisMonthExpense += amt
            } else if (txIso >= prevMonthStart && txIso <= prevMonthEnd) {
                if (tx.transaction_type === "INCOME") prevMonthIncome += amt
                else if (tx.transaction_type === "EXPENSE") prevMonthExpense += amt
            }
        }

        const trend = trendOrder.map((k) => ({
            name: trendBuckets[k].name,
            income: Math.round(trendBuckets[k].income * 100) / 100,
            expense: Math.round(trendBuckets[k].expense * 100) / 100,
            net: Math.round(trendBuckets[k].net * 100) / 100,
        }))

        // 3. Category Breakdown & 50/30/20 Rule on Period Transactions
        const categorySpending: Record<
            string,
            {
                id: string
                name: string
                amount: number
                color: string
                icon?: string
                count: number
                percent: number
                rule: string
            }
        > = {}
        let needsVal = 0
        let wantsVal = 0
        let savingsVal = 0

        for (const tx of periodTxs) {
            const amt = tx.convertedAmount
            const type = tx.transaction_type

            if (type === "INCOME") continue

            // Transfer or movement linked to a savings goal counts toward 20% Savings/Freedom
            if (tx.savings_goal_id) {
                savingsVal += amt
                continue
            }

            if (type === "TRANSFER") continue

            // Debt / Loan payments count toward 20% Financial Freedom
            if (tx.loan_id || tx.metadata?.isLoanMovement) {
                savingsVal += amt
                const debtKey = "debt-repayment"
                if (!categorySpending[debtKey]) {
                    categorySpending[debtKey] = {
                        id: debtKey,
                        name: "Pago de Deuda",
                        amount: 0,
                        color: "#10B981",
                        icon: "hand-coins",
                        count: 0,
                        percent: 0,
                        rule: "SAVINGS",
                    }
                }
                categorySpending[debtKey].amount += amt
                categorySpending[debtKey].count += 1
                continue
            }

            const catId = tx.expense_category_id || "uncategorized"
            const cat = tx.expense_category_id ? idToCategory[tx.expense_category_id] : null
            const rule = cat?.budget_rule || "WANT"

            if (rule === "NEED") needsVal += amt
            else if (rule === "SAVINGS") savingsVal += amt
            else wantsVal += amt

            if (!categorySpending[catId]) {
                categorySpending[catId] = {
                    id: catId,
                    name: cat?.name || "Sin categoría",
                    amount: 0,
                    color: cat?.color || "#94A3B8",
                    icon: cat?.icon || "tag",
                    count: 0,
                    percent: 0,
                    rule,
                }
            }
            categorySpending[catId].amount += amt
            categorySpending[catId].count += 1
        }

        // Include positive net retained savings in the 20% bucket when income exceeds expenses
        const netRetained = Math.max(0, periodIncome - periodExpense)
        if (netRetained > savingsVal) {
            savingsVal = netRetained
        }

        const totalCategorizedExpense = Object.values(categorySpending).reduce(
            (s, c) => s + c.amount,
            0
        )
        const categoriesList = Object.values(categorySpending)
            .sort((a, b) => b.amount - a.amount)
            .map((c) => ({
                ...c,
                amount: Math.round(c.amount * 100) / 100,
                percent:
                    totalCategorizedExpense > 0
                        ? Math.round((c.amount / totalCategorizedExpense) * 1000) / 10
                        : 0,
            }))

        const ruleBase =
            periodIncome > 0 ? periodIncome : Math.max(1, needsVal + wantsVal + savingsVal)
        const hasRuleActivity = periodIncome > 0 || periodExpense > 0

        const budgetRule = {
            needs: {
                amount: Math.round(needsVal * 100) / 100,
                percent: hasRuleActivity ? (needsVal / ruleBase) * 100 : 0,
                target: 50,
                status: hasRuleActivity && (needsVal / ruleBase) * 100 > 55 ? "WARNING" : "OK",
            },
            wants: {
                amount: Math.round(wantsVal * 100) / 100,
                percent: hasRuleActivity ? (wantsVal / ruleBase) * 100 : 0,
                target: 30,
                status: hasRuleActivity && (wantsVal / ruleBase) * 100 > 35 ? "WARNING" : "OK",
            },
            savings: {
                amount: Math.round(savingsVal * 100) / 100,
                percent: hasRuleActivity ? (savingsVal / ruleBase) * 100 : 0,
                target: 20,
                status: hasRuleActivity && (savingsVal / ruleBase) * 100 < 15 ? "WARNING" : "OK",
            },
        }

        // 4. Liquidity, Credit Card Liabilities, Runway & Health Score
        const liquidityAccounts = accounts.filter((acc: any) => acc.account_type !== "CREDIT_CARD")
        const totalLiquidity =
            liquidityAccounts.reduce((sum: number, acc: any) => {
                return sum + toBase(Number(acc.current_balance || 0), acc.currency_code)
            }, 0) || 0

        const cardLiabilities =
            accounts
                .filter((acc: any) => acc.account_type === "CREDIT_CARD")
                .reduce((sum: number, acc: any) => {
                    const debt = Math.max(
                        Math.abs(Number(acc.used_balance || 0)),
                        Math.abs(Math.min(0, Number(acc.current_balance || 0)))
                    )
                    return sum + toBase(debt, acc.currency_code)
                }, 0) || 0

        const savingsRate =
            periodIncome > 0 ? ((periodIncome - periodExpense) / periodIncome) * 100 : 0

        const burnRate = periodExpense / elapsedDaysInPeriod
        const monthlyExpenseEquivalent =
            monthsInPeriod > 0 ? periodExpense / monthsInPeriod : periodExpense

        const avgMonthlyExpense =
            monthlyExpenseEquivalent > 0
                ? monthlyExpenseEquivalent
                : prevMonthExpense > 0
                  ? (thisMonthExpense + prevMonthExpense) / 2
                  : thisMonthExpense

        const runwayMonths =
            totalLiquidity <= 0
                ? 0
                : avgMonthlyExpense > 0
                  ? totalLiquidity / avgMonthlyExpense
                  : 12

        const hasAnyFinancialData =
            accounts.length > 0 || periodIncome > 0 || periodExpense > 0 || totalLiquidity > 0

        let healthScore = 0
        if (hasAnyFinancialData) {
            const savingsScore =
                periodIncome > 0
                    ? Math.max(0, Math.min(40, (savingsRate / 20) * 40))
                    : totalLiquidity > 0
                      ? 20
                      : 0
            const runwayScore = Math.max(0, Math.min(30, (runwayMonths / 6) * 30))
            const stabilityScore =
                periodIncome > 0 && periodExpense <= periodIncome
                    ? 20
                    : periodExpense === 0 && totalLiquidity > 0
                      ? 15
                      : 8
            const growthScore =
                thisMonthIncome >= prevMonthIncome && (thisMonthIncome > 0 || totalLiquidity > 0)
                    ? 10
                    : 5
            healthScore = Math.round(savingsScore + runwayScore + stabilityScore + growthScore)
        }

        // Forecasts (Current Month projection)
        const daysInCurrentMonth = endOfMonth(now).getDate()
        const currentDayOfMonth = Math.max(1, now.getDate())
        const remainingDaysInMonth = Math.max(0, daysInCurrentMonth - currentDayOfMonth)
        const currentMonthDailyBurn = thisMonthExpense / currentDayOfMonth
        const predictedMonthEndExpense =
            thisMonthExpense > 0
                ? thisMonthExpense + currentMonthDailyBurn * remainingDaysInMonth
                : monthlyExpenseEquivalent
        const monthlyNetAvg = (periodIncome - periodExpense) / Math.max(1, monthsInPeriod)
        const estimatedYearlySavings = monthlyNetAvg * 12

        // 5. Annualized Leaks (Normalized to true monthly average x 12)
        const annualizedImpact = categoriesList
            .filter((c) => c.amount > 0)
            .slice(0, 4)
            .map((c) => {
                const monthlyAvg = c.amount / Math.max(1, monthsInPeriod)
                return {
                    id: c.id,
                    name: c.name,
                    monthly: Math.round(monthlyAvg * 100) / 100,
                    yearly: Math.round(monthlyAvg * 12 * 100) / 100,
                    color: c.color,
                    percent: c.percent,
                }
            })

        // 6. Active Budgets (Current Month Progress, converted to targetCurrency)
        const { data: budgets } = await db
            .from("budgets")
            .select("*")
            .eq("user_id", user.id)
            .eq("is_active", true)

        const idToName: Record<string, string> = {}
        allCategories.forEach((c) => {
            idToName[c.id] = c.name
        })

        const thisMonthExpenseTxs = windowTxs.filter((tx: any) => {
            const txIso = new Date(tx.transaction_date).toISOString()
            return (
                txIso >= thisMonthStart &&
                txIso <= thisMonthEnd &&
                tx.transaction_type === "EXPENSE"
            )
        })

        const mappedBudgets = (budgets || [])
            .map((b: any) => {
                let spent = 0
                const budgetLimit = toBase(Number(b.amount || 0), b.currency_code)

                if (b.include_categories && b.include_categories.length > 0) {
                    const targetIds: string[] = []
                    b.include_categories.forEach((id: string) => {
                        targetIds.push(id)
                        const name = idToName[id]
                        if (name) {
                            const key = normalize(name)
                            if (categoriesByName[key]) {
                                targetIds.push(...categoriesByName[key])
                            }
                        }
                    })

                    const targetIdsSet = new Set(expandCategoryIds(targetIds, allCategories))

                    spent = thisMonthExpenseTxs.reduce((sum: number, tx: any) => {
                        const match =
                            (tx.expense_category_id && targetIdsSet.has(tx.expense_category_id)) ||
                            (tx.subcategory_id && targetIdsSet.has(tx.subcategory_id))
                        if (!match) return sum
                        const txCurr =
                            tx.currency_code || accountCurrencyMap[tx.account_id] || targetCurrency
                        return sum + toBase(Number(tx.amount || 0), txCurr)
                    }, 0)
                } else {
                    spent = thisMonthExpenseTxs.reduce((sum: number, tx: any) => {
                        const txCurr =
                            tx.currency_code || accountCurrencyMap[tx.account_id] || targetCurrency
                        return sum + toBase(Number(tx.amount || 0), txCurr)
                    }, 0)
                }

                const rawPct = budgetLimit > 0 ? (spent / budgetLimit) * 100 : 0
                return {
                    id: b.id,
                    name: b.name,
                    amount: Math.round(budgetLimit * 100) / 100,
                    spent: Math.round(spent * 100) / 100,
                    percent: Math.round(rawPct * 10) / 10,
                    color: b.color || "#7C5CFC",
                }
            })
            .sort((a: any, b: any) => b.percent - a.percent)

        // 7. Active Loans (Receivables + Payables + Legacy Loans table) + Recurring Rules
        const [receivablesRes, payablesRes, legacyLoansRes, recurringRes] = await Promise.all([
            db
                .from("accounts_receivable")
                .select("*")
                .eq("user_id", user.id)
                .in("status", ["PENDING", "PARTIAL", "OVERDUE"])
                .order("outstanding_balance", { ascending: false }),
            db
                .from("accounts_payable")
                .select("*")
                .eq("user_id", user.id)
                .in("status", ["PENDING", "PARTIAL", "OVERDUE"])
                .order("outstanding_balance", { ascending: false }),
            db
                .from("loans")
                .select("*")
                .eq("user_id", user.id)
                .eq("status", "ACTIVE"),
            db
                .from("recurring_rules")
                .select("id, amount, currency_code, transaction_type, next_occurrence, frequency, is_active")
                .eq("user_id", user.id)
                .eq("is_active", true),
        ])

        const mappedLoans: any[] = []

        for (const r of receivablesRes.data || []) {
            const orig = toBase(Number(r.original_amount || 0), r.currency_code)
            const rem = toBase(Number(r.outstanding_balance || 0), r.currency_code)
            mappedLoans.push({
                id: r.id,
                person: r.contact_name,
                type: "LENT",
                amount: orig,
                paid: Math.max(0, orig - rem),
                remaining: rem,
                dueDate: r.due_date,
                status: r.status,
            })
        }

        for (const p of payablesRes.data || []) {
            const orig = toBase(Number(p.original_amount || 0), p.currency_code)
            const rem = toBase(Number(p.outstanding_balance || 0), p.currency_code)
            mappedLoans.push({
                id: p.id,
                person: p.contact_name,
                type: "BORROWED",
                amount: orig,
                paid: Math.max(0, orig - rem),
                remaining: rem,
                dueDate: p.due_date,
                status: p.status,
            })
        }

        for (const l of legacyLoansRes.data || []) {
            const orig = toBase(Number(l.principal_amount || 0), l.currency_code)
            const rem = toBase(Number(l.remaining_balance || 0), l.currency_code)
            mappedLoans.push({
                id: l.id,
                person: l.contact_name,
                type: l.loan_type === "BORROWED" ? "BORROWED" : "LENT",
                amount: orig,
                paid: Math.max(0, orig - rem),
                remaining: rem,
                dueDate: l.due_date,
                status: l.status,
            })
        }

        const totalReceivable = mappedLoans
            .filter((l) => l.type === "LENT")
            .reduce((acc, c) => acc + c.remaining, 0)
        const totalPayable = mappedLoans
            .filter((l) => l.type === "BORROWED")
            .reduce((acc, c) => acc + c.remaining, 0)

        // 7B. Month-End Balance Projection (handles variable income + upcoming bills)
        const todayDateStr = format(now, "yyyy-MM-dd")
        const monthEndDateStr = format(endOfMonth(now), "yyyy-MM-dd")
        const activeRules = recurringRes.data || []

        let upcomingFixedBills = 0
        let scheduledRemainingIncome = 0

        for (const r of activeRules) {
            const nextDate = r.next_occurrence ? String(r.next_occurrence).slice(0, 10) : ""
            if (!nextDate || nextDate <= todayDateStr || nextDate > monthEndDateStr) continue
            const amtBase = toBase(Number(r.amount || 0), r.currency_code)
            if (r.transaction_type === "EXPENSE") {
                upcomingFixedBills += amtBase
            } else if (r.transaction_type === "INCOME") {
                scheduledRemainingIncome += amtBase
            }
        }

        for (const p of payablesRes.data || []) {
            if ((p.metadata as any)?.isCreditCardMirror) continue
            const rem = toBase(Number(p.outstanding_balance || 0), p.currency_code)
            if (rem <= 0 || !p.due_date) continue
            const dueStr = String(p.due_date).slice(0, 10)
            if (dueStr <= monthEndDateStr) {
                upcomingFixedBills += rem
            }
        }

        for (const acc of accounts) {
            if (acc.account_type !== "CREDIT_CARD") continue
            const used = Math.max(0, Number(acc.used_balance || 0))
            const dueDay = Number(acc.payment_due_day || 0)
            if (used > 0 && dueDay >= currentDayOfMonth && dueDay <= daysInCurrentMonth) {
                upcomingFixedBills += toBase(used, acc.currency_code)
            }
        }

        const txAmountBase = (tx: any) =>
            toBase(
                Number(tx.amount || 0),
                tx.currency_code || accountCurrencyMap[tx.account_id] || targetCurrency
            )

        const variableThisMonthExpense = thisMonthExpenseTxs.reduce((sum: number, tx: any) => {
            const m = String(tx.metadata?.mode || "")
            if (m === "SUBSCRIPTION" || m === "RECURRING") return sum
            return sum + txAmountBase(tx)
        }, 0)

        const rawDailyVar = variableThisMonthExpense / currentDayOfMonth
        const histDailyVar = avgMonthlyExpense > 0 ? avgMonthlyExpense / daysInCurrentMonth : rawDailyVar
        const dailyVarBurn =
            currentDayOfMonth >= 5
                ? rawDailyVar * 0.7 + histDailyVar * 0.3
                : rawDailyVar * 0.35 + histDailyVar * 0.65

        const remainingVariableExpense = dailyVarBurn * remainingDaysInMonth
        const remainingProjectedExpense = remainingVariableExpense + upcomingFixedBills

        const priorIncomes = trendOrder
            .slice(0, -1)
            .slice(-3)
            .map((k) => Number(trendBuckets[k]?.income || 0))
            .filter((v) => v > 0)

        const avgPriorIncome =
            priorIncomes.length > 0
                ? priorIncomes.reduce((s, v) => s + v, 0) / priorIncomes.length
                : 0
        const minPriorIncome = priorIncomes.length > 0 ? Math.min(...priorIncomes) : 0
        const maxPriorIncome = priorIncomes.length > 0 ? Math.max(...priorIncomes) : 0
        const incomeIsVariable =
            priorIncomes.length >= 2 && avgPriorIncome > 0
                ? (maxPriorIncome - minPriorIncome) / avgPriorIncome > 0.25
                : priorIncomes.length <= 1

        let expectedRemainingIncome = scheduledRemainingIncome
        if (
            expectedRemainingIncome <= 0 &&
            !incomeIsVariable &&
            avgPriorIncome > 0 &&
            thisMonthIncome < avgPriorIncome * 0.85
        ) {
            expectedRemainingIncome = Math.max(0, avgPriorIncome - thisMonthIncome)
        }
        const optimisticRemainingIncome =
            minPriorIncome > 0 && thisMonthIncome < minPriorIncome
                ? Math.max(expectedRemainingIncome, minPriorIncome - thisMonthIncome)
                : expectedRemainingIncome

        const projectedMonthEndBalance =
            totalLiquidity + expectedRemainingIncome - remainingProjectedExpense
        const conservativeMonthEndBalance = totalLiquidity - remainingProjectedExpense
        const optimisticMonthEndBalance =
            totalLiquidity + optimisticRemainingIncome - remainingProjectedExpense
        const safetyBuffer = Math.max(200, avgMonthlyExpense * 0.15)
        const shortfallRisk: "SAFE" | "TIGHT" | "SHORTFALL" =
            projectedMonthEndBalance < 0
                ? "SHORTFALL"
                : projectedMonthEndBalance < safetyBuffer
                  ? "TIGHT"
                  : "SAFE"
        const shortfallAmount =
            projectedMonthEndBalance < 0 ? Math.abs(projectedMonthEndBalance) : 0

        // 7C. Detector de Gastos Hormiga & Reto Día sin Gasto
        const antThreshold = Math.round(toBase(40, "PEN") * 100) / 100
        const thirtyDaysAgoIso = startOfDay(subDays(now, 29)).toISOString()
        const antSourceTxs =
            currentDayOfMonth < 7 && thisMonthExpenseTxs.length < 5
                ? windowTxs.filter(
                      (tx: any) =>
                          tx.transaction_type === "EXPENSE" &&
                          new Date(tx.transaction_date).toISOString() >= thirtyDaysAgoIso
                  )
                : thisMonthExpenseTxs

        const antGroups: Record<
            string,
            { name: string; categoryName: string; color: string; count: number; total: number }
        > = {}
        const sourceExpenseTotal = antSourceTxs.reduce(
            (s: number, tx: any) => s + txAmountBase(tx),
            0
        )

        for (const tx of antSourceTxs) {
            const amt = txAmountBase(tx)
            if (amt <= 0 || amt > antThreshold) continue
            const cat = tx.expense_category_id ? idToCategory[tx.expense_category_id] : null
            const rawDesc = String(tx.description || "")
                .replace(/yape\s*(a|de)?\s*/gi, "")
                .replace(/plin\s*(a|de)?\s*/gi, "")
                .replace(/[^\p{L}\p{N}\s]/gu, " ")
                .trim()
            const tokens = rawDesc.split(/\s+/).filter((w) => w.length >= 2).slice(0, 2)
            const key =
                tokens.length > 0
                    ? tokens.join(" ").toLowerCase()
                    : `cat:${cat?.id || "otros"}`
            const displayLabel =
                tokens.length > 0
                    ? tokens.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
                    : cat?.name || "Gasto pequeño"

            if (!antGroups[key]) {
                antGroups[key] = {
                    name: displayLabel,
                    categoryName: cat?.name || "Varios",
                    color: cat?.color || "#FF7A33",
                    count: 0,
                    total: 0,
                }
            }
            antGroups[key].count += 1
            antGroups[key].total += amt
        }

        const allAntGroups = Object.values(antGroups)
        let matchedAnt = allAntGroups.filter((g) => g.count >= 3)
        if (matchedAnt.length === 0) {
            matchedAnt = allAntGroups.filter((g) => g.count >= 2)
        }
        matchedAnt.sort((a, b) => b.total - a.total)

        const antTotalMonthly = matchedAnt.reduce((s, g) => s + g.total, 0)
        const antCount = matchedAnt.reduce((s, g) => s + g.count, 0)
        const antPercentOfExpense =
            sourceExpenseTotal > 0 ? Math.round((antTotalMonthly / sourceExpenseTotal) * 1000) / 10 : 0
        const topLeaks = matchedAnt.slice(0, 4).map((g) => ({
            name: g.name,
            categoryName: g.categoryName,
            color: g.color,
            count: g.count,
            avgTicket: Math.round((g.total / g.count) * 100) / 100,
            total: Math.round(g.total * 100) / 100,
            yearlyProjection: Math.round(g.total * 12 * 100) / 100,
        }))

        const topAnt = topLeaks[0]
        const concreteTip = topAnt
            ? `Si reduces "${topAnt.name}" a la mitad, liberarías ${(topAnt.total / 2).toFixed(0)} ${targetCurrency} al mes (${Math.round(topAnt.yearlyProjection / 2)} ${targetCurrency} al año).`
            : "Aún no se detectan gastos hormiga frecuentes este mes."

        const spendDaySet = new Set<number>()
        for (const tx of thisMonthExpenseTxs) {
            const d = new Date(tx.transaction_date).getDate()
            if (d >= 1 && d <= currentDayOfMonth) spendDaySet.add(d)
        }
        const noSpendCount = Math.max(0, currentDayOfMonth - spendDaySet.size)
        const todayIsNoSpend = !spendDaySet.has(currentDayOfMonth)

        // 8. Smart Financial Insights
        const insights: { type: string; title: string; message: string; impact: string }[] = []
        const roundedRunway = Math.round(runwayMonths * 10) / 10

        if (!hasAnyFinancialData) {
            insights.push({
                type: "INFO",
                title: "Sin movimientos suficientes",
                message:
                    "Registra tus cuentas y primeros movimientos (o activa el Modo Demo en Ajustes) para desbloquear el diagnóstico completo.",
                impact: "INICIAL",
            })
        } else {
            if (savingsRate >= 20 && periodIncome > 0) {
                insights.push({
                    type: "SUCCESS",
                    title: "Retención de capital sobresaliente",
                    message: `Estás reteniendo el ${Math.round(savingsRate)}% de tus ingresos, superando la meta recomendada del 20%.`,
                    impact: "POSITIVO",
                })
            } else if (savingsRate < 10 && periodIncome > 0) {
                insights.push({
                    type: "WARNING",
                    title: "Margen de ahorro reducido",
                    message: `Tu retención actual es de ${Math.max(0, Math.round(savingsRate))}%. Reducir un 15% en gastos variables liberaría liquidez inmediata.`,
                    impact: "ALTO",
                })
            }

            if (thisMonthExpense > prevMonthExpense * 1.15 && prevMonthExpense > 0) {
                const pctUp = Math.round((thisMonthExpense / prevMonthExpense - 1) * 100)
                insights.push({
                    type: "CAUTION",
                    title: "Aceleración de gasto mensual",
                    message: `Tus gastos de este mes van un ${pctUp}% por encima del mes anterior. Revisa tu categoría principal.`,
                    impact: "MEDIO",
                })
            }

            if (roundedRunway < 3 && avgMonthlyExpense > 0) {
                insights.push({
                    type: "DANGER",
                    title: "Reserva de liquidez baja",
                    message: `Tu liquidez actual cubre ${roundedRunway} meses de gastos fijos. El estándar recomendado es de 3 a 6 meses.`,
                    impact: "CRÍTICO",
                })
            } else if (roundedRunway >= 6 && avgMonthlyExpense > 0) {
                insights.push({
                    type: "SUCCESS",
                    title: "Blindaje patrimonial sólido",
                    message: `Cuentas con ${roundedRunway} meses de oxígeno financiero para afrontar cualquier imprevisto con tranquilidad.`,
                    impact: "POSITIVO",
                })
            }

            const overBudget = mappedBudgets.find((b: any) => b.percent >= 90)
            if (overBudget) {
                insights.push({
                    type: overBudget.percent >= 100 ? "DANGER" : "WARNING",
                    title:
                        overBudget.percent >= 100
                            ? `Presupuesto excedido: ${overBudget.name}`
                            : `Presupuesto al límite: ${overBudget.name}`,
                    message: `Has consumido el ${Math.round(overBudget.percent)}% del límite asignado para este mes.`,
                    impact: overBudget.percent >= 100 ? "CRÍTICO" : "ALTO",
                })
            }
        }

        return NextResponse.json({
            range: {
                startDate: analyticsStart,
                endDate: analyticsEnd,
                days: elapsedDaysInPeriod,
                months: monthsInPeriod,
                period: periodParam,
            },
            kpis: {
                income: Math.round(periodIncome * 100) / 100,
                expense: Math.round(periodExpense * 100) / 100,
                thisMonthIncome: Math.round(thisMonthIncome * 100) / 100,
                thisMonthExpense: Math.round(thisMonthExpense * 100) / 100,
                savingsRate: Math.round(savingsRate * 10) / 10,
                burnRate: Math.round(burnRate * 100) / 100,
                netCashFlow: Math.round((periodIncome - periodExpense) * 100) / 100,
                healthScore,
                runwayMonths: roundedRunway,
                totalLiquidity: Math.round(totalLiquidity * 100) / 100,
                liabilities: Math.round((cardLiabilities + totalPayable) * 100) / 100,
                cardLiabilities: Math.round(cardLiabilities * 100) / 100,
                totalReceivable: Math.round(totalReceivable * 100) / 100,
                totalPayable: Math.round(totalPayable * 100) / 100,
                transactionCount: periodTxs.length,
            },
            comparison: {
                incomeChange:
                    prevMonthIncome > 0
                        ? Math.round((thisMonthIncome / prevMonthIncome - 1) * 1000) / 10
                        : 0,
                expenseChange:
                    prevMonthExpense > 0
                        ? Math.round((thisMonthExpense / prevMonthExpense - 1) * 1000) / 10
                        : 0,
            },
            categories: categoriesList,
            trend,
            budgetRule,
            insights,
            forecast: {
                predictedMonthEndExpense: Math.round(predictedMonthEndExpense * 100) / 100,
                estimatedYearlySavings: Math.round(estimatedYearlySavings * 100) / 100,
                projectedMonthEndBalance: Math.round(projectedMonthEndBalance * 100) / 100,
                conservativeMonthEndBalance: Math.round(conservativeMonthEndBalance * 100) / 100,
                optimisticMonthEndBalance: Math.round(optimisticMonthEndBalance * 100) / 100,
                remainingProjectedExpense: Math.round(remainingProjectedExpense * 100) / 100,
                upcomingFixedBills: Math.round(upcomingFixedBills * 100) / 100,
                expectedRemainingIncome: Math.round(expectedRemainingIncome * 100) / 100,
                daysLeftInMonth: remainingDaysInMonth,
                incomeIsVariable,
                shortfallRisk,
                shortfallAmount: Math.round(shortfallAmount * 100) / 100,
            },
            antExpenses: {
                threshold: antThreshold,
                totalMonthly: Math.round(antTotalMonthly * 100) / 100,
                count: antCount,
                percentOfExpense: antPercentOfExpense,
                topLeaks,
                concreteTip,
                noSpendDays: {
                    countThisMonth: noSpendCount,
                    elapsedDays: currentDayOfMonth,
                    todayIsNoSpend,
                },
            },
            annualizedImpact,
            budgets: mappedBudgets,
            loans: mappedLoans,
        })
    } catch (error: any) {
        if (
            error &&
            (error.digest === "DYNAMIC_SERVER_USAGE" ||
                String(error).includes("Dynamic server usage"))
        ) {
            throw error
        }

        console.error("[FINANCIAL_HEALTH_ERROR]", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
