"use client"

import { useState } from "react"
import { SettlementCodeStep } from "./settlement-code-step"
import { FundSelectionStep } from "./fund-selection-step"
import { ExpenseSelectionStep } from "./expense-selection-step"
import { DetailsStep } from "./details-step"
import { ConfirmationStep } from "./confirmation-step"
import { usePettyCashExpenses } from "@/hooks/use-petty-cash"

type WizardStep = 'code' | 'fund' | 'expenses' | 'details' | 'confirmation'

interface WizardData {
    settlementCode?: string
    fundId?: string
    fundCode?: string
    responsibleName?: string
    expenseIds?: string[]
    totalAmount?: number
    settlementId?: string
}

export function SmartSettlementWizard() {
    const [currentStep, setCurrentStep] = useState<WizardStep>('code')
    const [wizardData, setWizardData] = useState<WizardData>({})

    // Get expenses for calculating total
    const { data: expenses } = usePettyCashExpenses(
        wizardData.fundId || undefined,
        'APPROVED',
        'null'
    )

    const selectedExpenses = expenses?.filter((e: any) =>
        wizardData.expenseIds?.includes(e.id)
    ) || []
    const totalAmount = selectedExpenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0)

    const handleCodeNext = (data: { settlementCode: string }) => {
        setWizardData(prev => ({ ...prev, ...data }))
        setCurrentStep('fund')
    }

    const handleFundNext = (data: { fundId: string; fundCode: string; responsibleName: string }) => {
        setWizardData(prev => ({ ...prev, ...data }))
        setCurrentStep('expenses')
    }

    const handleExpensesNext = (data: { expenseIds: string[] }) => {
        // Calculate total from current expenses
        const selectedExpenses = expenses?.filter((e: any) => data.expenseIds.includes(e.id)) || []
        const calculatedTotal = selectedExpenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0)

        setWizardData(prev => ({
            ...prev,
            ...data,
            totalAmount: calculatedTotal
        }))
        setCurrentStep('details')
    }

    const handleDetailsSuccess = (settlementId: string) => {
        setWizardData(prev => ({ ...prev, settlementId }))
        setCurrentStep('confirmation')
    }

    const handleBack = (step: WizardStep) => {
        setCurrentStep(step)
    }

    return (
        <>
            {currentStep === 'code' && (
                <SettlementCodeStep onNext={handleCodeNext} />
            )}

            {currentStep === 'fund' && (
                <FundSelectionStep
                    onNext={handleFundNext}
                    onBack={() => handleBack('code')}
                />
            )}

            {currentStep === 'expenses' && wizardData.fundId && wizardData.fundCode && (
                <ExpenseSelectionStep
                    fundId={wizardData.fundId}
                    fundCode={wizardData.fundCode}
                    onNext={handleExpensesNext}
                    onBack={() => handleBack('fund')}
                />
            )}

            {currentStep === 'details' && wizardData.settlementCode && wizardData.fundId && wizardData.fundCode && wizardData.expenseIds && wizardData.responsibleName && (
                <DetailsStep
                    settlementCode={wizardData.settlementCode}
                    fundId={wizardData.fundId}
                    fundCode={wizardData.fundCode}
                    expenseIds={wizardData.expenseIds}
                    totalAmount={wizardData.totalAmount || 0}
                    expenseCount={wizardData.expenseIds.length}
                    defaultResponsibleName={wizardData.responsibleName}
                    onBack={() => handleBack('expenses')}
                    onSuccess={handleDetailsSuccess}
                />
            )}

            {currentStep === 'confirmation' && wizardData.settlementCode && wizardData.settlementId && wizardData.fundCode && wizardData.expenseIds && (
                <ConfirmationStep
                    settlementCode={wizardData.settlementCode}
                    settlementId={wizardData.settlementId}
                    fundCode={wizardData.fundCode}
                    totalAmount={wizardData.totalAmount || 0}
                    expenseCount={wizardData.expenseIds.length}
                />
            )}
        </>
    )
}
