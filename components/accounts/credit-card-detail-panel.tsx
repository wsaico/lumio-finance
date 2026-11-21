"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
    Copy,
    Check,
    CreditCard as CreditCardIcon,
    Edit,
    Trash,
    Eye,
    Wallet,
    Landmark,
    Banknote,
    TrendingUp,
    ArrowRightLeft,
    SlidersHorizontal,
    TrendingDown,
    Calendar,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ConfirmAlertModal } from "@/components/ui/confirm-alert-modal"
import { AccountFormModal } from "./account-form-modal"
import { EditInitialBalanceModal } from "./edit-initial-balance-modal"
import { cn, formatAccountPillName } from "@/lib/utils"
import { useAccounts } from "@/hooks/useAccounts"
import { useFormat } from "@/hooks/useFormat"
import { useSettingsStore } from "@/hooks/useSettingsStore"
import type { AccountItem } from "./compact-account-card"

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
    CREDIT_CARD: "Tarjeta de Crédito",
    BANK: "Cuenta Bancaria",
    CASH: "Efectivo",
    DIGITAL: "Billetera Digital",
    INVESTMENT: "Inversión",
}

function getDaysUntilDayOfMonth(targetDay: number): number {
    const now = new Date()
    let diff = targetDay - now.getDate()
    if (diff < 0) {
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
        diff += daysInMonth
    }
    return diff
}

interface CreditCardDetailPanelProps {
    card: AccountItem | null
}

export function CreditCardDetailPanel({ card }: CreditCardDetailPanelProps) {
    const router = useRouter()
    const { deleteAccount } = useAccounts()
    const { formatMoney } = useFormat()
    const { isBalanceVisible } = useSettingsStore()

    const [copied, setCopied] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showEditBalance, setShowEditBalance] = useState(false)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)

    if (!card) {
        return (
            <Card className="p-8 h-full min-h-[360px] flex flex-col items-center justify-center bg-card rounded-3xl border border-dashed border-border/80">
                <div className="text-center max-w-[240px] space-y-3">
                    <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <Wallet className="h-7 w-7" />
                    </div>
                    <h3 className="text-base font-extrabold text-foreground">Detalles de la cuenta</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Selecciona una cuenta para revisar su resumen, movimientos o realizar ajustes.
                    </p>
                </div>
            </Card>
        )
    }

    const isCreditCard = card.accountType === "CREDIT_CARD"
    const creditLimit = Math.max(0, Number(card.creditLimit || 0))
    const usedBalance = Math.abs(Number(card.usedBalance || 0))
    const availableBalance = isCreditCard
        ? Math.max(0, creditLimit - usedBalance)
        : Number(card.currentBalance || 0)
    const initialBalance = Number(card.initialBalance || 0)
    const netVariation = availableBalance - initialBalance
    const usagePercent =
        isCreditCard && creditLimit > 0 ? Math.min(100, (usedBalance / creditLimit) * 100) : 0

    const displayName = formatAccountPillName(card.name, card.currencyCode).replace(
        new RegExp(`\\s*\\(${card.currencyCode}\\)\\s*$`, "i"),
        ""
    )

    const money = (val: number) =>
        isBalanceVisible ? formatMoney(val, card.currencyCode) : "••••••"

    const closingDayNum = Number(card.closingDay)
    const dueDayNum = Number(card.paymentDueDay)
    const hasValidClosing = Number.isFinite(closingDayNum) && closingDayNum >= 1 && closingDayNum <= 31
    const hasValidDue = Number.isFinite(dueDayNum) && dueDayNum >= 1 && dueDayNum <= 31

    const TypeIcon =
        card.accountType === "CREDIT_CARD"
            ? CreditCardIcon
            : card.accountType === "BANK"
              ? Landmark
              : card.accountType === "CASH"
                ? Banknote
                : card.accountType === "INVESTMENT"
                  ? TrendingUp
                  : Wallet

    const handleCopy = (val: string) => {
        navigator.clipboard.writeText(val)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleDelete = async () => {
        try {
            setDeleteError(null)
            await deleteAccount.mutateAsync(card.id)
            setShowDeleteDialog(false)
        } catch (error: any) {
            setDeleteError(error.message || "Error al eliminar la cuenta")
        }
    }

    return (
        <>
            <Card className="p-5 sm:p-6 space-y-5 rounded-3xl border-border/70 bg-card shadow-sm lg:sticky lg:top-24">
                {/* HEADER */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <TypeIcon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-base font-extrabold text-foreground truncate">
                                {displayName}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                {ACCOUNT_TYPE_LABELS[card.accountType] || card.accountType} · {card.currencyCode}
                            </p>
                        </div>
                    </div>
                    <Badge
                        variant="outline"
                        className={cn(
                            "rounded-full text-[10px] font-bold shrink-0",
                            card.isActive
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : "bg-muted text-muted-foreground"
                        )}
                    >
                        {card.isActive ? "Activa" : "Inactiva"}
                    </Badge>
                </div>

                {/* FINANCIAL SUMMARY — STRICTLY COHERENT BY ACCOUNT TYPE */}
                {isCreditCard ? (
                    <div className="space-y-4 p-4 rounded-2xl bg-muted/40 border border-border/60">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                Resumen de Crédito
                            </span>
                            <Badge variant="outline" className="text-[10px] font-black uppercase rounded-full">
                                {card.cardNetwork || "VISA"}
                            </Badge>
                        </div>

                        <div className="space-y-2.5 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Línea total</span>
                                <span className="font-bold tabular-nums">{money(creditLimit)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-rose-600 dark:text-rose-400 font-medium">
                                    Deuda actual
                                </span>
                                <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                                    {money(usedBalance)}
                                </span>
                            </div>
                            <div className="h-px bg-border/60" />
                            <div className="flex justify-between items-baseline pt-0.5">
                                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                    Disponible
                                </span>
                                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                                    {money(availableBalance)}
                                </span>
                            </div>
                        </div>

                        {creditLimit > 0 && (
                            <div className="space-y-1.5 pt-1">
                                <div className="flex justify-between text-[11px] font-semibold text-muted-foreground tabular-nums">
                                    <span>Uso de línea</span>
                                    <span>{usagePercent.toFixed(1)}%</span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                                    <div
                                        className={cn(
                                            "h-full rounded-full transition-all",
                                            usagePercent >= 80
                                                ? "bg-rose-500"
                                                : usagePercent >= 50
                                                  ? "bg-amber-500"
                                                  : "bg-primary"
                                        )}
                                        style={{ width: `${usagePercent}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3 p-4 rounded-2xl bg-muted/40 border border-border/60">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                            Resumen de Saldo
                        </span>
                        <div>
                            <p className="text-3xl font-black tracking-tight tabular-nums text-foreground">
                                {money(availableBalance)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center justify-between">
                                <span>Saldo inicial: {money(initialBalance)}</span>
                                <span
                                    className={cn(
                                        "font-bold tabular-nums",
                                        netVariation >= 0
                                            ? "text-emerald-600 dark:text-emerald-400"
                                            : "text-rose-600 dark:text-rose-400"
                                    )}
                                >
                                    {netVariation >= 0 ? "+" : ""}
                                    {money(netVariation)}
                                </span>
                            </p>
                        </div>
                    </div>
                )}

                {/* CREDIT CARD BILLING CYCLE (ONLY IF CONFIGURED — NO NaN!) */}
                {isCreditCard && (hasValidClosing || hasValidDue) && (
                    <div className="grid grid-cols-2 gap-3">
                        {hasValidClosing && (
                            <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-3 w-3" /> Cierre
                                </p>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-extrabold">Día {closingDayNum}</span>
                                    <span className="text-[11px] font-bold text-primary">
                                        en {getDaysUntilDayOfMonth(closingDayNum)}d
                                    </span>
                                </div>
                            </div>
                        )}
                        {hasValidDue && (
                            <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-3 w-3" /> Límite Pago
                                </p>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-extrabold">Día {dueDayNum}</span>
                                    <span
                                        className={cn(
                                            "text-[11px] font-bold",
                                            getDaysUntilDayOfMonth(dueDayNum) <= 5
                                                ? "text-rose-500"
                                                : "text-muted-foreground"
                                        )}
                                    >
                                        en {getDaysUntilDayOfMonth(dueDayNum)}d
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* EXTRA METADATA (ONLY NON-EMPTY FIELDS) */}
                {(card.lastFourDigits || card.bankName || card.accountNumber) && (
                    <div className="space-y-2.5 text-xs pt-1">
                        {card.bankName && (
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Entidad</span>
                                <span className="font-bold text-foreground">{card.bankName}</span>
                            </div>
                        )}
                        {card.lastFourDigits && (
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Terminación</span>
                                <button
                                    type="button"
                                    onClick={() => handleCopy(card.lastFourDigits!)}
                                    className="inline-flex items-center gap-1.5 font-mono font-bold text-foreground hover:text-primary transition-colors"
                                >
                                    •••• {card.lastFourDigits}
                                    {copied ? (
                                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                                    ) : (
                                        <Copy className="h-3.5 w-3.5 opacity-60" />
                                    )}
                                </button>
                            </div>
                        )}
                        {card.accountNumber && (
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">N.º Cuenta</span>
                                <button
                                    type="button"
                                    onClick={() => handleCopy(card.accountNumber!)}
                                    className="inline-flex items-center gap-1.5 font-mono font-bold text-foreground hover:text-primary transition-colors"
                                >
                                    {card.accountNumber}
                                    {copied ? (
                                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                                    ) : (
                                        <Copy className="h-3.5 w-3.5 opacity-60" />
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* QUICK ACTIONS */}
                <div className="space-y-2 pt-2 border-t border-border/60">
                    <div className="grid grid-cols-2 gap-2">
                        <Link href={`/dashboard/transactions/new?type=EXPENSE&accountId=${card.id}`}>
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full rounded-2xl h-10 text-xs font-bold gap-1.5 border-rose-500/25 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                            >
                                <TrendingDown className="h-3.5 w-3.5" />
                                Gasto
                            </Button>
                        </Link>
                        <Link
                            href={
                                isCreditCard
                                    ? `/dashboard/transactions/new?type=TRANSFER&toAccountId=${card.id}`
                                    : `/dashboard/transactions/new?type=INCOME&accountId=${card.id}`
                            }
                        >
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full rounded-2xl h-10 text-xs font-bold gap-1.5 border-primary/25 text-primary hover:bg-primary/10"
                            >
                                <ArrowRightLeft className="h-3.5 w-3.5" />
                                {isCreditCard ? "Pagar TC" : "Ingreso"}
                            </Button>
                        </Link>
                    </div>

                    <Button
                        variant="default"
                        size="sm"
                        className="w-full rounded-2xl h-10 text-xs font-bold bg-primary text-primary-foreground gap-2"
                        onClick={() => router.push(`/dashboard/accounts/${card.id}`)}
                    >
                        <Eye className="h-4 w-4" />
                        Ver historial de movimientos
                    </Button>

                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="rounded-2xl h-9 text-xs font-bold gap-1.5"
                            onClick={() => setShowEditModal(true)}
                        >
                            <Edit className="h-3.5 w-3.5" />
                            Editar
                        </Button>
                        {!isCreditCard ? (
                            <Button
                                variant="outline"
                                size="sm"
                                className="rounded-2xl h-9 text-xs font-bold gap-1.5"
                                onClick={() => setShowEditBalance(true)}
                            >
                                <SlidersHorizontal className="h-3.5 w-3.5" />
                                Ajustar saldo
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                className="rounded-2xl h-9 text-xs font-bold gap-1.5 text-destructive hover:bg-destructive/10 border-destructive/20"
                                onClick={() => setShowDeleteDialog(true)}
                            >
                                <Trash className="h-3.5 w-3.5" />
                                Eliminar
                            </Button>
                        )}
                    </div>

                    {!isCreditCard && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full rounded-2xl h-9 text-xs font-bold text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                            onClick={() => setShowDeleteDialog(true)}
                        >
                            <Trash className="h-3.5 w-3.5" />
                            Eliminar cuenta
                        </Button>
                    )}
                </div>
            </Card>

            {/* Modals */}
            <AccountFormModal
                account={card as any}
                open={showEditModal}
                onOpenChange={setShowEditModal}
            />

            {!isCreditCard && (
                <EditInitialBalanceModal
                    account={{
                        id: card.id,
                        name: card.name,
                        initialBalance,
                        currentBalance: availableBalance,
                        currencyCode: card.currencyCode,
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
