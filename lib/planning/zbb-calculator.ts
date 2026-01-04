export interface PoolData {
    total: number;
    assigned: number;
    assignedToExpenses: number;
    assignedToSavings: number;
    unassigned: number;
    percentage: number;
}

export interface MoneyPool {
    usd: PoolData;
    pen: PoolData;
}

export class ZBBCalculator {
    /**
     * Calcula el estado actual del dinero por asignar (Separado por moneda y tipo de destino)
     */
    static calculateMoneyPool(
        totalIncomeUSD: number,
        totalIncomePEN: number,
        allocations: Array<{
            allocated_amount_usd: number;
            allocated_amount_pen: number;
            goal_id?: string | null;
            category?: { name: string; budget_rule?: string } | null;
        }>
    ): MoneyPool {

        // Smart Detection: Goal ID OR Budget Rule = 'SAVINGS'
        // This relies on the database field 'budget_rule' being passed in the category object.
        const isSavings = (a: any) => {
            if (a.goal_id) return true;
            if (a.category?.budget_rule === 'SAVINGS') return true;

            // Fallback: Check keywords if budget_rule is missing but name implies savings
            if (a.category?.name) {
                const name = a.category.name.toLowerCase();
                return name.includes('inversi') || name.includes('ahorr') || name.includes('fondo') || name.includes('bolsa');
            }
            return false;
        };

        // USD Calculation
        const assignedExpensesUSD = allocations
            .filter(a => !isSavings(a))
            .reduce((sum, a) => sum + (a.allocated_amount_usd || 0), 0);

        const assignedSavingsUSD = allocations
            .filter(a => isSavings(a))
            .reduce((sum, a) => sum + (a.allocated_amount_usd || 0), 0);

        const assignedUSD = assignedExpensesUSD + assignedSavingsUSD;

        // PEN Calculation
        const assignedExpensesPEN = allocations
            .filter(a => !isSavings(a))
            .reduce((sum, a) => sum + (a.allocated_amount_pen || 0), 0);

        const assignedSavingsPEN = allocations
            .filter(a => isSavings(a))
            .reduce((sum, a) => sum + (a.allocated_amount_pen || 0), 0);

        const assignedPEN = assignedExpensesPEN + assignedSavingsPEN;

        return {
            usd: {
                total: totalIncomeUSD,
                assigned: assignedUSD,
                assignedToExpenses: assignedExpensesUSD,
                assignedToSavings: assignedSavingsUSD,
                unassigned: totalIncomeUSD - assignedUSD,
                percentage: totalIncomeUSD > 0 ? (assignedUSD / totalIncomeUSD) * 100 : 0,
            },
            pen: {
                total: totalIncomePEN,
                assigned: assignedPEN,
                assignedToExpenses: assignedExpensesPEN,
                assignedToSavings: assignedSavingsPEN,
                unassigned: totalIncomePEN - assignedPEN,
                percentage: totalIncomePEN > 0 ? (assignedPEN / totalIncomePEN) * 100 : 0,
            },
        };
    }

    /**
     * Valida si el plan puede cerrarse (Regla del Cero)
     */
    static validatePlan(pool: MoneyPool): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];
        const TOLERANCE = 0.01;

        // 1. Check USD
        if (Math.abs(pool.usd.unassigned) > TOLERANCE) {
            if (pool.usd.unassigned > 0) errors.push(`Te faltan asignar $${pool.usd.unassigned.toFixed(2)} USD`);
            else errors.push(`Has asignado $${Math.abs(pool.usd.unassigned).toFixed(2)} USD de más`);
        }

        // 2. Check PEN
        if (Math.abs(pool.pen.unassigned) > TOLERANCE) {
            if (pool.pen.unassigned > 0) errors.push(`Te faltan asignar S/ ${pool.pen.unassigned.toFixed(2)} PEN`);
            else errors.push(`Has asignado S/ ${Math.abs(pool.pen.unassigned).toFixed(2)} PEN de más`);
        }

        return {
            isValid: errors.length === 0,
            errors
        }
    }
}
