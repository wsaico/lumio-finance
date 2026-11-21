"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
    CreditCard,
    Banknote,
    Landmark,
    Wallet,
    TrendingUp,
    MoreHorizontal,
    Edit,
    Trash,
    Eye,
    SlidersHorizontal,
    Wifi,
} from "lucide-react"
import { cn, formatAccountPillName } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmAlertModal } from "@/components/ui/confirm-alert-modal"
import { AccountFormModal } from "./account-form-modal"
import { EditInitialBalanceModal } from "./edit-initial-balance-modal"
import { useAccounts } from "@/hooks/useAccounts"
import { useFormat } from "@/hooks/useFormat"
import { useSettingsStore } from "@/hooks/useSettingsStore"

export interface AccountItem {
    id: string
    name: string
    accountType: string
    currentBalance: any
    initialBalance?: any
    creditLimit?: any
    usedBalance?: any
    lastFourDigits?: string
    cardNetwork?: string
    expiryDate?: Date | string
    closingDay?: string | number
    paymentDueDay?: string | number
    bankName?: string
    accountNumber?: string
    isActive: boolean
    currencyCode: string
    color?: string
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
    CREDIT_CARD: "Tarjeta de Crédito",
    BANK: "Cuenta Bancaria",
    CASH: "Efectivo",
    DIGITAL: "Billetera Digital",
    INVESTMENT: "Inversión",
}

interface CompactAccountCardProps {
    account: AccountItem
    isSelected?: boolean
    onClick?: () => void
}

export function CompactAccountCard({ account, isSelected, onClick }: CompactAccountCardProps) {
    const router = useRouter()
    const { deleteAccount } = useAccounts()
    const { formatMoney } = useFormat()
    const { isBalanceVisible } = useSettingsStore()

    const [showEditModal, setShowEditModal] = useState(false)
    const [showEditBalance, setShowEditBalance] = useState(false)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)

    const isCreditCard = account.accountType === "CREDIT_CARD"
    const creditLimit = Math.max(0, Number(account.creditLimit || 0))
    const usedBalance = Math.abs(Number(account.usedBalance || 0))
    const availableBalance = isCreditCard
        ? Math.max(0, creditLimit - usedBalance)
        : Number(account.currentBalance || 0)

    const usagePercent =
        isCreditCard && creditLimit > 0 ? Math.min(100, (usedBalance / creditLimit) * 100) : 0

    const displayName = formatAccountPillName(account.name, account.currencyCode).replace(
        new RegExp(`\\s*\\(${account.currencyCode}\\)\\s*$`, "i"),
        ""
    )

    const money = (val: number) =>
        isBalanceVisible ? formatMoney(val, account.currencyCode) : "••••••"

    const getCardStyle = (): React.CSSProperties => {
        if (!account.isActive) {
            return { background: "linear-gradient(135deg, #64748b 0%, #334155 100%)" }
        }
        if (isCreditCard) {
            const net = account.cardNetwork?.toUpperCase() || "VISA"
            if (net === "MASTERCARD")
                return { background: "linear-gradient(135deg, #1e293b 0%, #0f172a 55%, #334155 100%)" }
            if (net === "AMEX")
                return { background: "linear-gradient(135deg, #0284c7 0%, #0369a1 55%, #075985 100%)" }
            return { background: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 55%, #4c1d95 100%)" }
        }
        switch (account.accountType) {
            case "BANK":
                return { background: "linear-gradient(135deg, #6d4df6 0%, #4f46e5 60%, #4338ca 100%)" }
            case "CASH":
                return { background: "linear-gradient(135deg, #10b981 0%, #059669 60%, #047857 100%)" }
            case "DIGITAL":
                return { background: "linear-gradient(135deg, #06b6d4 0%, #0891b2 60%, #0e7490 100%)" }
            case "INVESTMENT":
                return { background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 60%, #1d4ed8 100%)" }
            default:
                return { background: "linear-gradient(135deg, #475569 0%, #1e293b 100%)" }
        }
    }

    const Icon =
        account.accountType === "CREDIT_CARD"
            ? CreditCard
            : account.accountType === "CASH"
              ? Banknote
              : account.accountType === "BANK"
                ? Landmark
                : account.accountType === "INVESTMENT"
                  ? TrendingUp
                  : Wallet

    const handleDelete = async () => {
        try {
            setDeleteError(null)
            await deleteAccount.mutateAsync(account.id)
            setShowDeleteDialog(false)
        } catch (error: any) {
            setDeleteError(error.message || "Error al eliminar la cuenta")
        }
    }

    return (
        <>
            <div
                onClick={onClick}
                className={cn(
                    "group relative rounded-[1.75rem] p-5 text-white cursor-pointer transition-all duration-300 overflow-hidden select-none shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.99]",
                    isSelected
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-primary/25"
                        : "opacity-95 hover:opacity-100"
                )}
                style={getCardStyle()}
            >
                {/* Decorative mesh highlights (offline-safe pure CSS) */}
                <div className="pointer-events-none absolute -top-16 -right-16 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
                <div className="pointer-events-none absolute -bottom-20 -left-12 h-40 w-40 rounded-full bg-black/20 blur-2xl" />

                <div className="relative z-10 flex flex-col justify-between gap-5 min-h-[164px]">
                    {/* TOP ROW: Type / Network + Currency + Menu */}
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-9 w-9 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0">
                                <Icon className="h-4.5 w-4.5 text-white" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-extrabold tracking-tight leading-tight truncate">
                                    {displayName}
                                </p>
                                <p className="text-[11px] font-medium text-white/75 truncate">
                                    {isCreditCard
                                        ? `${account.cardNetwork?.toUpperCase() || "VISA"}${
                                              account.lastFourDigits
                                                  ? ` · •••• ${account.lastFourDigits}`
                                                  : ""
                                          }`
                                        : account.bankName ||
                                          ACCOUNT_TYPE_LABELS[account.accountType] ||
                                          account.accountType}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                            <span className="px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-md text-[10px] font-black tracking-wider">
                                {account.currencyCode}
                            </span>
                            {isCreditCard && <Wifi className="h-3.5 w-3.5 text-white/60 rotate-90" />}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label="Opciones de cuenta"
                                        className="h-8 w-8 rounded-full text-white/80 hover:text-white hover:bg-white/15"
                                    >
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-2xl p-1.5 w-48">
                                    <DropdownMenuItem
                                        className="rounded-xl text-xs font-semibold cursor-pointer"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            router.push(`/dashboard/accounts/${account.id}`)
                                        }}
                                    >
                                        <Eye className="h-4 w-4 mr-2" />
                                        Ver movimientos
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        className="rounded-xl text-xs font-semibold cursor-pointer"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setShowEditModal(true)
                                        }}
                                    >
                                        <Edit className="h-4 w-4 mr-2" />
                                        Editar cuenta
                                    </DropdownMenuItem>
                                    {!isCreditCard && (
                                        <DropdownMenuItem
                                            className="rounded-xl text-xs font-semibold cursor-pointer"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setShowEditBalance(true)
                                            }}
                                        >
                                            <SlidersHorizontal className="h-4 w-4 mr-2" />
                                            Ajustar saldo
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        className="rounded-xl text-xs font-semibold text-destructive focus:text-destructive cursor-pointer"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setShowDeleteDialog(true)
                                        }}
                                    >
                                        <Trash className="h-4 w-4 mr-2" />
                                        Eliminar
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    {/* MIDDLE: MAIN BALANCE */}
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                            {isCreditCard ? "Crédito disponible" : "Saldo actual"}
                        </p>
                        <p className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums leading-tight mt-0.5">
                            {money(availableBalance)}
                        </p>
                    </div>

                    {/* FOOTER: Credit Card Utilization Bar OR Liquid Account Footer */}
                    {isCreditCard ? (
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] font-semibold text-white/85 tabular-nums">
                                <span>Deuda: {money(usedBalance)}</span>
                                <span>Línea: {money(creditLimit)}</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-white/20 overflow-hidden">
                                <div
                                    className={cn(
                                        "h-full rounded-full transition-all duration-500",
                                        usagePercent >= 80
                                            ? "bg-rose-300"
                                            : usagePercent >= 50
                                              ? "bg-amber-300"
                                              : "bg-emerald-300"
                                    )}
                                    style={{ width: `${usagePercent}%` }}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between text-[11px] font-semibold text-white/75 pt-1 border-t border-white/15">
                            <span>{ACCOUNT_TYPE_LABELS[account.accountType] || "Cuenta"}</span>
                            <span className="inline-flex items-center gap-1.5">
                                <span
                                    className={cn(
                                        "h-1.5 w-1.5 rounded-full",
                                        account.isActive ? "bg-emerald-300" : "bg-amber-300"
                                    )}
                                />
                                {account.isActive ? "Activa" : "Inactiva"}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <AccountFormModal
                account={account as any}
                open={showEditModal}
                onOpenChange={setShowEditModal}
            />

            {!isCreditCard && (
                <EditInitialBalanceModal
                    account={{
                        id: account.id,
                        name: account.name,
                        initialBalance: Number(account.initialBalance || 0),
                        currentBalance: Number(account.currentBalance || 0),
                        currencyCode: account.currencyCode,
                    }}
                    open={showEditBalance}
                    onOpenChange={setShowEditBalance}
                />
            )}

            <ConfirmAlertModal
                open={showDeleteDialog}
                onOpenChange={(open) => {
                    setShowDeleteDialog(open)
                    if (!open) setDeleteError(null)
                }}
                variant="danger"
                title="¿Eliminar cuenta?"
                description={
                    <>
                        Esta acción no se puede deshacer. Se eliminará permanentemente &ldquo;{displayName}&rdquo;.
                    </>
                }
                confirmLabel="Eliminar"
                autoCloseOnConfirm={false}
                errorMessage={deleteError}
                onConfirm={handleDelete}
            />
        </>
    )
}
