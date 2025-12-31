
/**
 * FINANICAL DATA MAPPERS
 * Centralized logic to convert Database (snake_case) to UI (camelCase)
 */

export function mapAccount(row: any) {
    const base = {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        accountType: row.account_type,
        currencyCode: row.currency_code,
        initialBalance: Number(row.initial_balance || 0),
        currentBalance: Number(row.current_balance || 0),
        fixedFundAmount: row.fixed_fund_amount ? Number(row.fixed_fund_amount) : null,
        bankName: row.bank_name,
        accountNumber: row.account_number,
        customBankName: row.custom_bank_name,
        excludeFromStats: row.exclude_from_stats || false,
        archived: row.archived || false,
        color: row.color,
        icon: row.icon,
        isActive: row.is_active,
        sortOrder: row.sort_order,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    }

    if (row.account_type === 'CREDIT_CARD') {
        return {
            ...base,
            lastFourDigits: row.last_four_digits,
            creditLimit: Number(row.credit_limit || 0),
            usedBalance: Number(row.used_balance || 0),
            availableCredit: Number(row.credit_limit || 0) - Number(row.used_balance || 0),
            closingDay: row.closing_day,
            paymentDueDay: row.payment_due_day,
            cardNetwork: row.card_network,
            interestRateAnnual: row.interest_rate_annual ? Number(row.interest_rate_annual) : null,
            interestRateMonthly: row.interest_rate_monthly ? Number(row.interest_rate_monthly) : null,
            minPaymentPercent: row.min_payment_percent ? Number(row.min_payment_percent) : 5,
            minPaymentAbsolute: row.min_payment_absolute ? Number(row.min_payment_absolute) : null,
        }
    }

    return base
}

export function mapTransaction(row: any) {
    return {
        id: row.id,
        userId: row.user_id,
        accountId: row.account_id,
        transactionType: row.transaction_type,
        amount: Number(row.amount || 0),
        transactionDate: row.transaction_date,
        description: row.description,
        notes: row.notes,
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        expenseCategoryId: row.expense_category_id,
        incomeCategoryId: row.income_category_id,
        subcategoryId: row.subcategory_id,
        transferToAccountId: row.transfer_to_account_id,
        savingsGoalId: row.savings_goal_id,
        loanId: row.loan_id,
        creditCardId: row.credit_card_id,
        recurringRuleId: row.recurring_rule_id,

        // Relations (flattened)
        account: row.account ? {
            name: row.account.name,
            icon: row.account.icon,
            color: row.account.color,
            currencyCode: row.account.currency_code
        } : undefined,
        expenseCategory: row.expense_category ? {
            name: row.expense_category.name,
            icon: row.expense_category.icon,
            color: row.expense_category.color
        } : undefined,
        incomeCategory: row.income_category ? {
            name: row.income_category.name,
            icon: row.income_category.icon,
            color: row.income_category.color
        } : undefined,
        subcategory: row.subcategory ? {
            name: row.subcategory.name
        } : undefined,
        loan: row.loan ? {
            personName: row.loan.person_name,
            status: row.loan.status,
            loanType: row.loan.loan_type
        } : undefined,
        creditCard: row.credit_card ? {
            name: row.credit_card.name,
            lastFourDigits: row.credit_card.last_four_digits,
            color: row.credit_card.color
        } : undefined
    }
}

export function mapPettyCashFund(row: any) {
    return {
        id: row.id,
        userId: row.user_id,
        accountId: row.account_id,
        fundCode: row.fund_code,
        fundName: row.fund_name,
        assignedAmount: Number(row.assigned_amount || 0),
        currentBalance: Number(row.current_balance || 0),
        currencyCode: row.currency_code,
        responsibleName: row.responsible_name,
        responsibleId: row.responsible_id,
        department: row.department,
        description: row.description,
        status: row.status,
        settlementThreshold: Number(row.settlement_threshold || 70),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        closedAt: row.closed_at,

        // Joined Data (if available)
        accountName: row.account?.name,
        expenseCount: row.expenses?.[0]?.count || 0,
        settlementCount: row.settlements?.[0]?.count || 0
    }
}

export function mapPettyCashExpense(row: any) {
    return {
        id: row.id,
        userId: row.user_id,
        fundId: row.fund_id,
        settlementId: row.settlement_id,
        expenseCode: row.expense_code,
        expenseDate: row.expense_date,
        amount: Number(row.amount || 0),
        categoryId: row.category_id,
        subcategoryId: row.subcategory_id,
        description: row.description,
        vendor: row.vendor,
        receiptNumber: row.receipt_number,
        receiptType: row.receipt_type,
        status: row.status,
        taxableAmount: row.taxable_amount ? Number(row.taxable_amount) : null,
        taxAmount: row.tax_amount ? Number(row.tax_amount) : null,
        attachmentUrl: row.attachment_url,
        justification: row.justification,
        approvedAt: row.approved_at,
        approvedBy: row.approved_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,

        // Relations
        fund: row.fund ? {
            fundCode: row.fund.fund_code,
            fundName: row.fund.fund_name
        } : undefined,
        category: row.category ? {
            name: row.category.name,
            color: row.category.color
        } : undefined,
        subcategory: row.subcategory ? {
            name: row.subcategory.name
        } : undefined,
        settlement: row.settlement ? {
            settlementCode: row.settlement.settlement_code,
            status: row.settlement.status
        } : undefined
    }
}

export function mapPettyCashSettlement(row: any) {
    return {
        id: row.id,
        userId: row.user_id,
        fundId: row.fund_id,
        replenishmentId: row.replenishment_id,
        settlementCode: row.settlement_code,
        settlementDate: row.settlement_date,
        totalAmount: Number(row.total_amount || 0),
        expenseCount: Number(row.expense_count || 0),
        responsibleName: row.responsible_name,
        receivedBy: row.received_by,
        approvedBy: row.approved_by,
        accountedBy: row.accounted_by,
        approvedAt: row.approved_at,
        accountedAt: row.accounted_at,
        accountingCode: row.accounting_code,
        notes: row.notes,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,

        // Relations
        fund: row.fund ? {
            fundCode: row.fund.fund_code,
            fundName: row.fund.fund_name,
            responsibleName: row.fund.responsible_name
        } : undefined,
        expenses: row.expenses?.map((e: any) => ({
            id: e.id,
            expenseCode: e.expense_code,
            expenseDate: e.expense_date,
            amount: Number(e.amount || 0),
            description: e.description,
            vendor: e.vendor,
            receiptNumber: e.receipt_number,
            receiptType: e.receipt_type,
            category: e.category ? {
                name: e.category.name,
                color: e.category.color
            } : undefined
        })),
        replenishment: row.replenishment ? {
            id: row.replenishment.id,
            replenishmentCode: row.replenishment.replenishment_code,
            amount: Number(row.replenishment.amount || 0),
            status: row.replenishment.status,
            paymentMethod: row.replenishment.payment_method
        } : undefined
    }
}

export function mapPettyCashReplenishment(row: any) {
    return {
        id: row.id,
        userId: row.user_id,
        fundId: row.fund_id,
        settlementId: row.settlement_id,
        replenishmentCode: row.replenishment_code,
        replenishmentDate: row.replenishment_date,
        amount: Number(row.amount || 0),
        paymentMethod: row.payment_method,
        referenceNumber: row.reference_number,
        approvedBy: row.approved_by,
        deliveredBy: row.delivered_by,
        receivedBy: row.received_by,
        deliveredAt: row.delivered_at,
        confirmedAt: row.confirmed_at,
        notes: row.notes,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,

        // Relations
        fund: row.fund ? {
            fundCode: row.fund.fund_code,
            fundName: row.fund.fund_name,
            responsibleName: row.fund.responsible_name
        } : undefined,
        settlement: row.settlement ? {
            settlementCode: row.settlement.settlement_code,
            settlementDate: row.settlement.settlement_date,
            totalAmount: Number(row.settlement.total_amount || 0),
            expenseCount: row.settlement.expense_count,
            status: row.settlement.status
        } : undefined
    }
}

export function mapPettyCashAudit(row: any) {
    return {
        id: row.id,
        userId: row.user_id,
        fundId: row.fund_id,
        auditCode: row.audit_code,
        auditDate: row.audit_date,
        auditType: row.audit_type,
        expectedCash: Number(row.expected_cash || 0),
        actualCash: Number(row.actual_cash || 0),
        variance: Number(row.variance || 0),
        pendingExpenses: Number(row.pending_expenses || 0),
        auditedBy: row.audited_by,
        responsiblePresent: row.responsible_present,
        findings: row.findings,
        recommendations: row.recommendations,
        attachmentUrl: row.attachment_url,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,

        // Relations
        fund: row.fund ? {
            fundCode: row.fund.fund_code,
            fundName: row.fund.fund_name,
            responsibleName: row.fund.responsible_name,
            currentBalance: Number(row.fund.current_balance || 0),
            assignedAmount: Number(row.fund.assigned_amount || 0)
        } : undefined
    }
}

export function mapPettyCashTransfer(row: any) {
    return {
        id: row.id,
        userId: row.user_id,
        fromFundId: row.from_fund_id,
        transferCode: row.transfer_code,
        transferDate: row.transfer_date,
        amount: Number(row.amount || 0),
        transferType: row.transfer_type,
        toResponsibleName: row.to_responsible_name,
        toResponsibleId: row.to_responsible_id,
        reason: row.reason,
        receiptNumber: row.receipt_number,
        returnDate: row.return_date,
        deliveredAt: row.delivered_at,
        returnedAt: row.returned_at,
        status: row.status,
        deliveredBy: row.delivered_by,
        receivedBy: row.received_by,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,

        // Relations
        fund: row.fund ? {
            fundCode: row.fund.fund_code,
            fundName: row.fund.fund_name,
            responsibleName: row.fund.responsible_name,
            currentBalance: Number(row.fund.current_balance || 0)
        } : undefined
    }
}
