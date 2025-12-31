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
    accountId: string // Para la transacción de salida de caja
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
    accountId: string // Para la transacción de entrada de caja
}

export interface CreatePaymentDTO {
    accountReceivableId?: string
    accountPayableId?: string
    amount: number
    paymentDate?: string
    notes?: string
    paymentMethod?: PaymentMethod
    accountId: string // Cuenta donde se registra el movimiento
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
