"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, ArrowUpRight, ArrowDownLeft } from "lucide-react"
import { LoanCardReceivable } from "@/components/loans/loan-card-receivable"
import { LoanCardPayable } from "@/components/loans/loan-card-payable"
import { LoansSummary } from "@/components/loans/loans-summary"
import { PaymentModal, PaymentFormData } from "@/components/loans/payment-modal"
import { CreateLoanModal } from "@/components/loans/create-loan-modal"
import { LoanDetailsModal } from "@/components/loans/loan-details-modal"
import { useAccountsReceivable, useUpdateAccountReceivable } from "@/hooks/useAccountsReceivable"
import { useAccountsPayable, useUpdateAccountPayable } from "@/hooks/useAccountsPayable"
import { useSettingsStore } from "@/hooks/useSettingsStore"
import { useExchangeRates } from "@/hooks/useExchangeRates"
import { cn } from "@/lib/utils"
import { PremiumPreviewGate } from "@/components/billing/premium-preview-gate"
import type { AccountReceivable, AccountPayable } from "@/types/loans"

type LoanType = "RECEIVABLE" | "PAYABLE"
type StatusFilter = "ACTIVE" | "OVERDUE" | "COMPLETED" | "ALL"

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
    { id: "ACTIVE", label: "Activos" },
    { id: "OVERDUE", label: "Vencidos" },
    { id: "COMPLETED", label: "Liquidados" },
    { id: "ALL", label: "Todos" },
]

export default function LoansPage() {
    const { currencyCode } = useSettingsStore()
    const { convert } = useExchangeRates()

    const [activeTab, setActiveTab] = useState<"receivable" | "payable">("receivable")
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("ACTIVE")
    const [createLoanModalOpen, setCreateLoanModalOpen] = useState(false)
    const [paymentModalOpen, setPaymentModalOpen] = useState(false)
    const [detailModalOpen, setDetailModalOpen] = useState(false)
    const [mounted, setMounted] = useState(false)

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

    const [selectedDetailRef, setSelectedDetailRef] = useState<{
        id: string
        type: LoanType
    } | null>(null)

    useEffect(() => setMounted(true), [])

    const { data: receivables = [], isLoading: receivablesLoading } = useAccountsReceivable()
    const { data: payables = [], isLoading: payablesLoading } = useAccountsPayable()

    const updateReceivable = useUpdateAccountReceivable()
    const updatePayable = useUpdateAccountPayable()

    // Multi-currency converted summary (fixes raw PEN+USD addition bug!)
    const summary = useMemo(() => {
        const toPrimary = (amount: number, fromCurrency?: string) => {
            const cur = fromCurrency || currencyCode
            if (cur === currencyCode) return Number(amount || 0)
            return convert(Number(amount || 0), cur, currencyCode)
        }

        const isActive = (status: string) =>
            status !== "PAID" && status !== "COLLECTED" && status !== "CANCELLED"

        const activeRec = receivables.filter((r: AccountReceivable) => isActive(r.status))
        const activePay = payables.filter((p: AccountPayable) => isActive(p.status))

        return {
            totalReceivable: activeRec.reduce(
                (sum: number, r: AccountReceivable) =>
                    sum + toPrimary(r.outstandingBalance, r.currencyCode),
                0
            ),
            totalPayable: activePay.reduce(
                (sum: number, p: AccountPayable) =>
                    sum + toPrimary(p.outstandingBalance, p.currencyCode),
                0
            ),
            overdueReceivable: receivables
                .filter((r: AccountReceivable) => r.status === "OVERDUE")
                .reduce(
                    (sum: number, r: AccountReceivable) =>
                        sum + toPrimary(r.outstandingBalance, r.currencyCode),
                    0
                ),
            overduePayable: payables
                .filter((p: AccountPayable) => p.status === "OVERDUE")
                .reduce(
                    (sum: number, p: AccountPayable) =>
                        sum + toPrimary(p.outstandingBalance, p.currencyCode),
                    0
                ),
            activeReceivableCount: activeRec.length,
            activePayableCount: activePay.length,
            currencyCode,
        }
    }, [receivables, payables, currencyCode, convert])

    const filterByStatus = <T extends { status: string }>(list: T[]) => {
        if (statusFilter === "ALL") return list
        if (statusFilter === "OVERDUE") return list.filter((x) => x.status === "OVERDUE")
        if (statusFilter === "COMPLETED") {
            return list.filter((x) => x.status === "PAID" || x.status === "COLLECTED")
        }
        return list.filter(
            (x) => x.status !== "PAID" && x.status !== "COLLECTED" && x.status !== "CANCELLED"
        )
    }

    const filteredReceivables = useMemo(
        () => filterByStatus(receivables),
        [receivables, statusFilter]
    )
    const filteredPayables = useMemo(() => filterByStatus(payables), [payables, statusFilter])

    const selectedFullLoan = useMemo(() => {
        if (!selectedDetailRef) return null
        const found =
            selectedDetailRef.type === "RECEIVABLE"
                ? receivables.find((r: AccountReceivable) => r.id === selectedDetailRef.id)
                : payables.find((p: AccountPayable) => p.id === selectedDetailRef.id)
        if (!found) return null
        return {
            ...found,
            type: selectedDetailRef.type,
        } as (AccountReceivable | AccountPayable) & { type: LoanType }
    }, [selectedDetailRef, receivables, payables])

    const handleRegisterPayment = (id: string) => {
        const loan =
            activeTab === "receivable"
                ? receivables.find((r: AccountReceivable) => r.id === id)
                : payables.find((p: AccountPayable) => p.id === id)

        if (!loan) return

        const installments = [...((loan as any).installments || [])].sort(
            (a: any, b: any) => a.installmentNumber - b.installmentNumber
        )

        const nextPendingInstallment = installments.find(
            (i: any) => i.status !== "PAID" && i.status !== "CANCELLED"
        )

        const totalPendingAmount =
            installments
                .filter((i: any) => i.status !== "PAID" && i.status !== "CANCELLED")
                .reduce((sum: number, i: any) => sum + Number(i.totalAmount), 0) ||
            loan.outstandingBalance

        setSelectedLoan({
            id: loan.id,
            contactName: loan.contactName,
            outstandingBalance: loan.outstandingBalance,
            totalPendingAmount,
            currencyCode: loan.currencyCode,
            type: activeTab === "receivable" ? "RECEIVABLE" : "PAYABLE",
            paymentFrequency: (loan as any).paymentFrequency,
            nextInstallment: nextPendingInstallment
                ? {
                      number: nextPendingInstallment.installmentNumber,
                      amount: nextPendingInstallment.totalAmount,
                      dueDate: nextPendingInstallment.dueDate,
                      principal: nextPendingInstallment.principalAmount,
                      interest: nextPendingInstallment.interestAmount,
                  }
                : null,
        })
        setPaymentModalOpen(true)
    }

    const handleViewDetails = (id: string) => {
        setSelectedDetailRef({
            id,
            type: activeTab === "receivable" ? "RECEIVABLE" : "PAYABLE",
        })
        setDetailModalOpen(true)
    }

    const handlePaymentSubmit = async (data: PaymentFormData) => {
        if (!selectedLoan) return

        try {
            if (selectedLoan.type === "RECEIVABLE") {
                await updateReceivable.mutateAsync({ id: selectedLoan.id, ...data })
            } else {
                await updatePayable.mutateAsync({ id: selectedLoan.id, ...data })
            }
            setPaymentModalOpen(false)
            setSelectedLoan(null)
        } catch (error) {
            console.error("Error registering payment:", error)
        }
    }

    if (!mounted) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-48 w-full rounded-[1.75rem]" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-52 rounded-3xl" />
                    ))}
                </div>
            </div>
        )
    }

    const activeList = activeTab === "receivable" ? filteredReceivables : filteredPayables
    const isListLoading = activeTab === "receivable" ? receivablesLoading : payablesLoading

    return (
        <PremiumPreviewGate moduleName="Préstamos">
        <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
            {/* EXECUTIVE HERO SUMMARY */}
            <LoansSummary summary={summary} onCreateLoan={() => setCreateLoanModalOpen(true)} />

            {/* SEGMENTED TABS + STATUS FILTER CHIPS */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Primary Direction Switcher */}
                <div className="grid grid-cols-2 p-1 rounded-2xl bg-muted/50 border border-border/60 w-full sm:w-auto gap-1">
                    <button
                        type="button"
                        onClick={() => setActiveTab("receivable")}
                        className={cn(
                            "px-4 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all",
                            activeTab === "receivable"
                                ? "bg-indigo-600 text-white shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <ArrowUpRight className="h-3.5 w-3.5" />
                        <span>Por Cobrar ({receivables.length})</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("payable")}
                        className={cn(
                            "px-4 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all",
                            activeTab === "payable"
                                ? "bg-amber-500 text-white shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <ArrowDownLeft className="h-3.5 w-3.5" />
                        <span>Por Pagar ({payables.length})</span>
                    </button>
                </div>

                {/* Status Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    {STATUS_FILTERS.map((f) => {
                        const active = statusFilter === f.id
                        return (
                            <button
                                key={f.id}
                                type="button"
                                onClick={() => setStatusFilter(f.id)}
                                className={cn(
                                    "px-3 py-1.5 rounded-full text-xs font-bold border transition-all shrink-0",
                                    active
                                        ? "bg-card text-foreground border-primary/40 shadow-xs"
                                        : "bg-transparent text-muted-foreground border-border/50 hover:text-foreground"
                                )}
                            >
                                {f.label}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* LOANS GRID */}
            {isListLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-52 rounded-3xl" />
                    ))}
                </div>
            ) : activeList.length === 0 ? (
                <div className="card-modern p-10 sm:p-14 text-center flex flex-col items-center justify-center max-w-lg mx-auto">
                    <div
                        className={cn(
                            "h-16 w-16 rounded-3xl flex items-center justify-center mb-4",
                            activeTab === "receivable"
                                ? "bg-indigo-500/12 text-indigo-600 dark:text-indigo-400"
                                : "bg-amber-500/12 text-amber-600 dark:text-amber-400"
                        )}
                    >
                        {activeTab === "receivable" ? (
                            <ArrowUpRight className="h-8 w-8" />
                        ) : (
                            <ArrowDownLeft className="h-8 w-8" />
                        )}
                    </div>
                    <h3 className="text-lg sm:text-xl font-black tracking-tight text-foreground">
                        Sin préstamos{" "}
                        {activeTab === "receivable" ? "por cobrar" : "por pagar"}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 mb-6 max-w-sm">
                        {activeTab === "receivable"
                            ? "Registra los préstamos que has otorgado para controlar cobros y cuotas."
                            : "Registra tus deudas u obligaciones para mantener tus pagos al día."}
                    </p>
                    <Button
                        onClick={() => setCreateLoanModalOpen(true)}
                        className="rounded-full h-11 px-6 font-extrabold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 gap-2"
                    >
                        <Plus className="h-4 w-4 stroke-[2.5]" />
                        {activeTab === "receivable" ? "Registrar Préstamo" : "Registrar Deuda"}
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {activeTab === "receivable"
                        ? filteredReceivables.map((receivable: AccountReceivable) => (
                              <LoanCardReceivable
                                  key={receivable.id}
                                  receivable={receivable}
                                  onRegisterPayment={handleRegisterPayment}
                                  onViewDetails={handleViewDetails}
                              />
                          ))
                        : filteredPayables.map((payable: AccountPayable) => (
                              <LoanCardPayable
                                  key={payable.id}
                                  payable={payable}
                                  onRegisterPayment={handleRegisterPayment}
                                  onViewDetails={handleViewDetails}
                              />
                          ))}
                </div>
            )}

            {/* Modals */}
            <CreateLoanModal
                open={createLoanModalOpen}
                onClose={() => setCreateLoanModalOpen(false)}
                defaultType={activeTab === "receivable" ? "RECEIVABLE" : "PAYABLE"}
            />

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

            <LoanDetailsModal
                open={detailModalOpen}
                onClose={() => {
                    setDetailModalOpen(false)
                    setSelectedDetailRef(null)
                }}
                loan={selectedFullLoan}
            />
        </div>
        </PremiumPreviewGate>
    )
}
