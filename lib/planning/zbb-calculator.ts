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

const round2 = (n: number) => Math.round(n * 100) / 100;

export class ZBBCalculator {
    /**
     * Calcula el estado actual del dinero por asignar (Separado por moneda y tipo de destino)
     */
    static calculateMoneyPool(
        totalIncomeUSD: number,
        totalIncomePEN: number,
        allocations: Array<{
            allocated_amount_usd: number | string;
            allocated_amount_pen: number | string;
            goal_id?: string | null;
            category?: { name: string; budget_rule?: string } | null;
        }>
    ): MoneyPool {
        const incUSD = Number(totalIncomeUSD || 0);
        const incPEN = Number(totalIncomePEN || 0);

        const isSavings = (a: any) => {
            if (a.goal_id) return true;
            if (a.category?.budget_rule === 'SAVINGS') return true;

            if (a.category?.name) {
                const name = a.category.name.toLowerCase();
                return name.includes('inversi') || name.includes('ahorr') || name.includes('fondo') || name.includes('bolsa');
            }
            return false;
        };

        // USD Calculation (strict Number conversion + 2-decimal precision)
        const assignedExpensesUSD = round2(
            allocations
                .filter(a => !isSavings(a))
                .reduce((sum, a) => sum + Number(a.allocated_amount_usd || 0), 0)
        );

        const assignedSavingsUSD = round2(
            allocations
                .filter(a => isSavings(a))
                .reduce((sum, a) => sum + Number(a.allocated_amount_usd || 0), 0)
        );

        const assignedUSD = round2(assignedExpensesUSD + assignedSavingsUSD);

        // PEN Calculation
        const assignedExpensesPEN = round2(
            allocations
                .filter(a => !isSavings(a))
                .reduce((sum, a) => sum + Number(a.allocated_amount_pen || 0), 0)
        );

        const assignedSavingsPEN = round2(
            allocations
                .filter(a => isSavings(a))
                .reduce((sum, a) => sum + Number(a.allocated_amount_pen || 0), 0)
        );

        const assignedPEN = round2(assignedExpensesPEN + assignedSavingsPEN);

        const unassignedUSD = round2(incUSD - assignedUSD);
        const unassignedPEN = round2(incPEN - assignedPEN);

        return {
            usd: {
                total: incUSD,
                assigned: assignedUSD,
                assignedToExpenses: assignedExpensesUSD,
                assignedToSavings: assignedSavingsUSD,
                unassigned: Math.abs(unassignedUSD) < 0.01 ? 0 : unassignedUSD,
                percentage: incUSD > 0 ? (assignedUSD / incUSD) * 100 : 0,
            },
            pen: {
                total: incPEN,
                assigned: assignedPEN,
                assignedToExpenses: assignedExpensesPEN,
                assignedToSavings: assignedSavingsPEN,
                unassigned: Math.abs(unassignedPEN) < 0.01 ? 0 : unassignedPEN,
                percentage: incPEN > 0 ? (assignedPEN / incPEN) * 100 : 0,
            },
        };
    }

    /**
     * Valida si el plan puede cerrarse (Regla del Cero)
     */
    static validatePlan(pool: MoneyPool): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];
        const TOLERANCE = 0.01;

        if (Math.abs(pool.usd.unassigned) > TOLERANCE) {
            if (pool.usd.unassigned > 0) errors.push(`Te faltan asignar $${pool.usd.unassigned.toFixed(2)} USD`);
            else errors.push(`Has asignado $${Math.abs(pool.usd.unassigned).toFixed(2)} USD de más`);
        }

        if (Math.abs(pool.pen.unassigned) > TOLERANCE) {
            if (pool.pen.unassigned > 0) errors.push(`Te faltan asignar S/ ${pool.pen.unassigned.toFixed(2)} PEN`);
            else errors.push(`Has asignado S/ ${Math.abs(pool.pen.unassigned).toFixed(2)} PEN de más`);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}
