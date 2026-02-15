"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Plus, RefreshCw, ArrowUpRight, ArrowDownLeft } from "lucide-react"
import { LoanCardReceivable } from "@/components/loans/loan-card-receivable"
import { LoanCardPayable } from "@/components/loans/loan-card-payable"
import { LoansSummary } from "@/components/loans/loans-summary"
import { PaymentModal, PaymentFormData } from "@/components/loans/payment-modal"
import { CreateLoanModal } from "@/components/loans/create-loan-modal"
import { LoanDetailsModal } from "@/components/loans/loan-details-modal"
import { useAccountsReceivable, useUpdateAccountReceivable } from "@/hooks/useAccountsReceivable"
import { useAccountsPayable, useUpdateAccountPayable } from "@/hooks/useAccountsPayable"
import { useSettingsStore } from "@/hooks/useSettingsStore"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { AccountReceivable, AccountPayable } from "@/types/loans"

type LoanType = 'RECEIVABLE' | 'PAYABLE'

export default function LoansPage() {
    const { currencyCode } = useSettingsStore()
    const [activeTab, setActiveTab] = useState<'receivable' | 'payable'>('receivable')
    const [createLoanModalOpen, setCreateLoanModalOpen] = useState(false)
    const [paymentModalOpen, setPaymentModalOpen] = useState(false)
    const [detailModalOpen, setDetailModalOpen] = useState(false)
    const [selectedLoan, setSelectedLoan] = useState<{
        id: string
        contactName: string
        outstandingBalance: number
        totalPendingAmount?: number
        currencyCode: string
        type: LoanType
        paymentFrequency?: string
        nextInstallment?: {
            number: number
            amount: number
            dueDate: string
            principal: number
            interest: number
        } | null
    } | null>(null)

    const [selectedFullLoan, setSelectedFullLoan] = useState<(AccountReceivable | AccountPayable) & { type: LoanType } | null>(null)

    // Fetch data
    const {
        data: receivables = [],
        isLoading: receivablesLoading,
        refetch: refetchReceivables
    } = useAccountsReceivable()

    const {
        data: payables = [],
        isLoading: payablesLoading,
        refetch: refetchPayables
    } = useAccountsPayable()

    // Mutations
    const updateReceivable = useUpdateAccountReceivable()
    const updatePayable = useUpdateAccountPayable()

    // Handle payment registration
    const handleRegisterPayment = (id: string) => {
        const loan = activeTab === 'receivable'
            ? receivables.find((r: AccountReceivable) => r.id === id)
            : payables.find((p: AccountPayable) => p.id === id)

        if (!loan) return

        // Calculate smart defaults (Same logic as LoanDetailsModal)
        const installments = ((loan as any).installments || [])
            .sort((a: any, b: any) => a.installmentNumber - b.installmentNumber)

        const nextPendingInstallment = installments.find((i: any) =>
            i.status !== 'PAID' && i.status !== 'CANCELLED'
        )

        // Calculate total payable amount (Principal + Interest of all pending installments)
        const totalPendingAmount = installments
            .filter((i: any) => i.status !== 'PAID' && i.status !== 'CANCELLED')
            .reduce((sum: number, i: any) => sum + Number(i.totalAmount), 0) || loan.outstandingBalance

        setSelectedLoan({
            id: loan.id,
            contactName: loan.contactName,
            outstandingBalance: loan.outstandingBalance,
            totalPendingAmount, // New Field
            currencyCode: loan.currencyCode,
            type: activeTab === 'receivable' ? 'RECEIVABLE' : 'PAYABLE',
            paymentFrequency: (loan as any).paymentFrequency,
            nextInstallment: nextPendingInstallment ? {
                number: nextPendingInstallment.installmentNumber,
                amount: nextPendingInstallment.totalAmount,
                dueDate: nextPendingInstallment.dueDate,
                principal: nextPendingInstallment.principalAmount,
                interest: nextPendingInstallment.interestAmount,
            } : null
        })
        setPaymentModalOpen(true)
    }

    const handleViewDetails = (id: string) => {
        const loan = activeTab === 'receivable'
            ? receivables.find((r: AccountReceivable) => r.id === id)
            : payables.find((p: AccountPayable) => p.id === id)

        if (!loan) return

        setSelectedFullLoan({
            ...loan,
            type: activeTab === 'receivable' ? 'RECEIVABLE' : 'PAYABLE' as LoanType
        } as (AccountReceivable | AccountPayable) & { type: LoanType })
        setDetailModalOpen(true)
    }

    const handlePaymentSubmit = async (data: PaymentFormData) => {
        if (!selectedLoan) return

        try {
            if (selectedLoan.type === 'RECEIVABLE') {
                await updateReceivable.mutateAsync({
                    id: selectedLoan.id,
                    ...data
                })
            } else {
                await updatePayable.mutateAsync({
                    id: selectedLoan.id,
                    ...data
                })
            }

            setPaymentModalOpen(false)
            setSelectedLoan(null)
        } catch (error) {
            console.error('Error registering payment:', error)
        }
    }

    const handleRefresh = () => {
        refetchReceivables()
        refetchPayables()
    }

    // Calculate summary
    const summary = {
        totalReceivable: receivables.reduce((sum: number, r: AccountReceivable) =>
            sum + r.outstandingBalance, 0),
        totalPayable: payables.reduce((sum: number, p: AccountPayable) =>
            sum + p.outstandingBalance, 0),
        overdueReceivable: receivables
            .filter((r: AccountReceivable) => r.status === 'OVERDUE')
            .reduce((sum: number, r: AccountReceivable) => sum + r.outstandingBalance, 0),
        overduePayable: payables
            .filter((p: AccountPayable) => p.status === 'OVERDUE')
            .reduce((sum: number, p: AccountPayable) => sum + p.outstandingBalance, 0),
        currencyCode,
    }

    const isLoading = receivablesLoading || payablesLoading

    const [mounted, setMounted] = useState(false)

    // Prevent hydration mismatch
    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return <div className="container mx-auto py-6 space-y-6">
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="h-9 w-48 bg-muted/20 rounded-lg animate-pulse mb-2"></div>
                        <div className="h-5 w-96 bg-muted/20 rounded-lg animate-pulse"></div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-32 rounded-xl bg-muted/20 animate-pulse" />
                    ))}
                </div>
            </div>
        </div>
    }

    return (
        <div className="container mx-auto py-6 space-y-6 animate-in fade-in duration-500">
            {/* Header Toolbar */}
            <div className="space-y-4">
                <div className="flex items-center justify-end gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handleRefresh}
                        disabled={isLoading}
                        className={cn(isLoading && "animate-spin")}
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                        onClick={() => setCreateLoanModalOpen(true)}
                        className="gap-2 shadow-md hover:shadow-lg transition-all"
                    >
                        <Plus className="h-4 w-4" /> Nuevo Préstamo
                    </Button>
                </div>

                {/* Summary Cards */}
                <LoansSummary summary={summary} />
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'receivable' | 'payable')}>
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="receivable" className="gap-2">
                        <ArrowUpRight className="h-4 w-4" />
                        Por Cobrar ({receivables.length})
                    </TabsTrigger>
                    <TabsTrigger value="payable" className="gap-2">
                        <ArrowDownLeft className="h-4 w-4" />
                        Por Pagar ({payables.length})
                    </TabsTrigger>
                </TabsList>

                {/* Accounts Receivable Tab */}
                <TabsContent value="receivable" className="space-y-4 mt-6">
                    {receivablesLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-80 rounded-xl bg-muted/20 animate-pulse" />
                            ))}
                        </div>
                    ) : receivables.length === 0 ? (
                        <div className="flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed rounded-xl bg-gradient-to-br from-blue-50/50 to-blue-100/30">
                            <div className="p-4 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/10 mb-4">
                                <ArrowUpRight className="h-10 w-10 text-blue-600" />
                            </div>
                            <h3 className="text-xl font-semibold">No tienes cuentas por cobrar</h3>
                            <p className="text-muted-foreground text-center max-w-sm mt-2 mb-6">
                                Registra los préstamos que has otorgado para mantener un control financiero completo.
                            </p>
                            <Button onClick={() => setCreateLoanModalOpen(true)} className="shadow-lg">
                                <Plus className="mr-2 h-4 w-4" /> Registrar Préstamo
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {receivables.map((receivable: AccountReceivable) => (
                                <LoanCardReceivable
                                    key={receivable.id}
                                    receivable={receivable}
                                    onRegisterPayment={handleRegisterPayment}
                                    onViewDetails={handleViewDetails}
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Accounts Payable Tab */}
                <TabsContent value="payable" className="space-y-4 mt-6">
                    {payablesLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-80 rounded-xl bg-muted/20 animate-pulse" />
                            ))}
                        </div>
                    ) : payables.length === 0 ? (
                        <div className="flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed rounded-xl bg-gradient-to-br from-orange-50/50 to-orange-100/30">
                            <div className="p-4 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-600/10 mb-4">
                                <ArrowDownLeft className="h-10 w-10 text-orange-600" />
                            </div>
                            <h3 className="text-xl font-semibold">No tienes cuentas por pagar</h3>
                            <p className="text-muted-foreground text-center max-w-sm mt-2 mb-6">
                                Registra los préstamos que has recibido para llevar un control de tus obligaciones.
                            </p>
                            <Button onClick={() => setCreateLoanModalOpen(true)} className="shadow-lg">
                                <Plus className="mr-2 h-4 w-4" /> Registrar Deuda
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {payables.map((payable: AccountPayable) => (
                                <LoanCardPayable
                                    key={payable.id}
                                    payable={payable}
                                    onRegisterPayment={handleRegisterPayment}
                                    onViewDetails={handleViewDetails}
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Create Loan Modal */}
            <CreateLoanModal
                open={createLoanModalOpen}
                onClose={() => setCreateLoanModalOpen(false)}
            />

            {/* Payment Modal */}
            <PaymentModal
                open={paymentModalOpen}
                onClose={() => {
                    setPaymentModalOpen(false)
                    setSelectedLoan(null)
                }}
                onSubmit={handlePaymentSubmit}
                loan={selectedLoan}
                isLoading={updateReceivable.isPending || updatePayable.isPending}
            />

            {/* View Details Modal */}
            <LoanDetailsModal
                open={detailModalOpen}
                onClose={() => {
                    setDetailModalOpen(false)
                    setSelectedFullLoan(null)
                }}
                loan={selectedFullLoan}
            />
        </div>
    )
}
