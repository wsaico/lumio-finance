import { useMemo } from 'react'

export interface Account {
    id: string
    name: string
    balance: number
    currencyCode: string
}

export type ValidationSeverity = 'error' | 'warning' | 'success'

export interface BalanceValidationResult {
    valid: boolean
    severity: ValidationSeverity
    message?: string
    details: {
        currentBalance: number
        requestedAmount: number
        balanceAfter: number
        shortage?: number
        threshold?: number
    }
}

interface UseBalanceValidationOptions {
    /** Percentage threshold for low balance warning (default: 0.1 = 10%) */
    lowBalanceThreshold?: number
    /** Allow negative balance (for credit accounts) */
    allowNegative?: boolean
}

/**
 * Hook for validating account balance before transactions
 *
 * @example
 * ```tsx
 * const validation = useBalanceValidation(accountId, 500, accounts)
 * if (!validation?.valid) {
 *   // Show error
 * }
 * ```
 */
export function useBalanceValidation(
    accountId: string | undefined,
    amount: number,
    accounts: Account[] | undefined,
    options: UseBalanceValidationOptions = {}
): BalanceValidationResult | null {
    const {
        lowBalanceThreshold = 0.1, // 10% by default
        allowNegative = false
    } = options

    return useMemo(() => {
        // Return null if no validation can be performed
        if (!accountId || !amount || amount <= 0 || !accounts) {
            return null
        }

        // Find the account
        const account = accounts.find(a => a.id === accountId)
        if (!account) {
            return {
                valid: false,
                severity: 'error',
                message: 'Cuenta no encontrada',
                details: {
                    currentBalance: 0,
                    requestedAmount: amount,
                    balanceAfter: 0,
                    shortage: amount
                }
            }
        }

        const currentBalance = Number(account.balance)
        const balanceAfter = currentBalance - amount

        // CRITICAL: Negative balance (insufficient funds)
        if (balanceAfter < 0 && !allowNegative) {
            return {
                valid: false,
                severity: 'error',
                message: 'Saldo insuficiente',
                details: {
                    currentBalance,
                    requestedAmount: amount,
                    balanceAfter,
                    shortage: Math.abs(balanceAfter)
                }
            }
        }

        // WARNING: Low balance (will leave account with < threshold%)
        const threshold = currentBalance * lowBalanceThreshold
        if (balanceAfter < threshold && balanceAfter >= 0) {
            return {
                valid: true,
                severity: 'warning',
                message: 'Esta operación dejará tu saldo muy bajo',
                details: {
                    currentBalance,
                    requestedAmount: amount,
                    balanceAfter,
                    threshold
                }
            }
        }

        // SUCCESS: Sufficient balance
        return {
            valid: true,
            severity: 'success',
            details: {
                currentBalance,
                requestedAmount: amount,
                balanceAfter
            }
        }
    }, [accountId, amount, accounts, lowBalanceThreshold, allowNegative])
}
