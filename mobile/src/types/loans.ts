export type LoanStatus = 'PENDING' | 'PARTIAL' | 'COLLECTED' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export type PaymentMethod = 'CASH' | 'TRANSFER' | 'CHECK' | 'CARD' | 'OTHER';

export interface LoanPayment {
  id: string;
  userId: string;
  accountReceivableId?: string;
  accountPayableId?: string;
  amount: number;
  currencyCode: string;
  paymentDate: string;
  transactionId?: string;
  notes?: string;
  paymentMethod?: PaymentMethod;
  principalAmount?: number;
  interestAmount?: number;
  createdAt: string;
}

export interface AccountReceivable {
  id: string;
  userId: string;
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  originalAmount: number;
  outstandingBalance: number;
  currencyCode: string;
  status: LoanStatus;
  loanDate: string;
  dueDate?: string;
  collectedAt?: string;
  notes?: string;
  interestRate?: number;
  interestType?: 'SIMPLE' | 'COMPOUND';
  paymentFrequency?: 'MONTHLY' | 'WEEKLY' | 'BIWEEKLY' | 'SINGLE';
  totalInstallments?: number;
  linkedTransactionId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  payments?: LoanPayment[];
  totalPaid?: number;
  percentPaid?: number;
  daysOverdue?: number;
}

export interface AccountPayable {
  id: string;
  userId: string;
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  originalAmount: number;
  outstandingBalance: number;
  currencyCode: string;
  status: LoanStatus;
  loanDate: string;
  dueDate?: string;
  paidAt?: string;
  notes?: string;
  interestRate?: number;
  interestType?: 'SIMPLE' | 'COMPOUND';
  paymentFrequency?: 'MONTHLY' | 'WEEKLY' | 'BIWEEKLY' | 'SINGLE';
  totalInstallments?: number;
  linkedTransactionId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  payments?: LoanPayment[];
  totalPaid?: number;
  percentPaid?: number;
  daysOverdue?: number;
}
