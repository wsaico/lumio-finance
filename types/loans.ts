// Professional Loan Management Types
// Supports Accounts Receivable (money owed to you) and Accounts Payable (money you owe)

export type LoanStatus = 'PENDING' | 'PARTIAL' | 'COLLECTED' | 'PAID' | 'OVERDUE' | 'CANCELLED'

export type PaymentMethod = 'CASH' | 'TRANSFER' | 'CHECK' | 'CARD' | 'OTHER'

// ============================================
// Account Receivable (Cuentas por Cobrar)
// ============================================
export interface AccountReceivable {
    id: string
    userId: string
    contactName: string
    contactEmail?: string
    contactPhone?: string
    originalAmount: number
    outstandingBalance: number
    currencyCode: string
    status: LoanStatus
    loanDate: string
    dueDate?: string
    collectedAt?: string
    notes?: string
    interestRate?: number
    interestType?: 'SIMPLE' | 'COMPOUND'
    paymentFrequency?: 'MONTHLY' | 'WEEKLY' | 'BIWEEKLY' | 'SINGLE'
    totalInstallments?: number
    linkedTransactionId?: string
    metadata?: Record<string, any>
    createdAt: string
    updatedAt: string
    // Computed fields
    payments?: LoanPayment[]
    totalPaid?: number
    percentPaid?: number
    daysOverdue?: number
}

// ============================================
// Account Payable (Cuentas por Pagar)
// ============================================
export interface AccountPayable {
    id: string
    userId: string
    contactName: string
    contactEmail?: string
    contactPhone?: string
    originalAmount: number
    outstandingBalance: number
    currencyCode: string
    status: LoanStatus
    loanDate: string
    dueDate?: string
    paidAt?: string
    notes?: string
    interestRate?: number
    interestType?: 'SIMPLE' | 'COMPOUND'
    paymentFrequency?: 'MONTHLY' | 'WEEKLY' | 'BIWEEKLY' | 'SINGLE'
    totalInstallments?: number
    linkedTransactionId?: string
    metadata?: Record<string, any>
    createdAt: string
    updatedAt: string
    // Computed fields
    payments?: LoanPayment[]
    totalPaid?: number
    percentPaid?: number
    daysOverdue?: number
}

// ============================================
// Loan Payment (Partial/Full Payments)
// ============================================
export interface LoanPayment {
    id: string
    userId: string
    accountReceivableId?: string
    accountPayableId?: string
    amount: number
    currencyCode: string
    paymentDate: string
    transactionId?: string
    notes?: string
    paymentMethod?: PaymentMethod
    principalAmount?: number
    interestAmount?: number
    createdAt: string
}

// ============================================
// DTOs for API Requests
// ============================================

export interface CreateAccountReceivableDTO {
    contactName: string
    contactEmail?: string
    contactPhone?: string
    amount: number
    currencyCode: string
    dueDate?: string
    notes?: string
    interestRate?: number
    interestType?: 'SIMPLE' | 'COMPOUND'
    paymentFrequency?: 'MONTHLY' | 'WEEKLY' | 'BIWEEKLY' | 'SINGLE'
    totalInstallments?: number
    accountId: string
}

export interface CreateAccountPayableDTO {
    contactName: string
    contactEmail?: string
    contactPhone?: string
    amount: number
    currencyCode: string
    dueDate?: string
    notes?: string
    interestRate?: number
    interestType?: 'SIMPLE' | 'COMPOUND'
    paymentFrequency?: 'MONTHLY' | 'WEEKLY' | 'BIWEEKLY' | 'SINGLE'
    totalInstallments?: number
    accountId: string
}

export interface CreatePaymentDTO {
    accountReceivableId?: string
    accountPayableId?: string
    amount: number
    paymentDate?: string
    notes?: string
    paymentMethod?: PaymentMethod
    accountId: string
    principalAmount?: number
    interestAmount?: number
}

// ============================================
// Summary/Stats Types
// ============================================

export interface LoansSummary {
    receivables: {
        total: number
        pending: number
        overdue: number
        collected: number
        totalAmount: number
        totalOutstanding: number
    }
    payables: {
        total: number
        pending: number
        overdue: number
        paid: number
        totalAmount: number
        totalOutstanding: number
    }
}

// ============================================
// UI Helper Types
// ============================================

export interface LoanCardData {
    id: string
    type: 'RECEIVABLE' | 'PAYABLE'
    contactName: string
    originalAmount: number
    outstandingBalance: number
    currencyCode: string
    status: LoanStatus
    dueDate?: string
    percentPaid: number
    daysOverdue?: number
    payments: LoanPayment[]
}
