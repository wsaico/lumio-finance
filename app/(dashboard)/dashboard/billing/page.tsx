"use client"

import { useEffect, useState } from "react"
import {
    Check,
    Clock,
    Copy,
    CreditCard,
    Crown,
    Globe,
    Loader2,
    QrCode,
    ShieldCheck,
    Smartphone,
    Upload,
    CheckCircle2,
    XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { useSubscription } from "@/hooks/useSubscription"
import { useSystemBranding } from "@/hooks/useSystemBranding"
import { DEFAULT_PLANS, type PlanDefinition } from "@/lib/entitlements"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type PayMethod = "YAPE" | "PLIN" | "CARD" | "PAYPAL"

async function compressImageToDataUrl(file: File, maxDim = 900): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            const img = new Image()
            img.onload = () => {
                const ratio = Math.min(1, maxDim / Math.max(img.width, img.height))
                const w = Math.round(img.width * ratio)
                const h = Math.round(img.height * ratio)
                const canvas = document.createElement("canvas")
                canvas.width = w
                canvas.height = h
                const ctx = canvas.getContext("2d")
                if (!ctx) {
                    resolve(String(reader.result))
                    return
                }
                ctx.drawImage(img, 0, 0, w, h)
                resolve(canvas.toDataURL("image/jpeg", 0.78))
            }
            img.onerror = reject
            img.src = String(reader.result)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}

export default function BillingPage() {
    const { entitlements, isTrial, isPremium, isFree, trialDaysRemaining } = useSubscription()
    const branding = useSystemBranding()
    const plans: PlanDefinition[] = (branding.plans?.length ? branding.plans : DEFAULT_PLANS).filter(
        (p) => p.is_active !== false
    )
    const freePlan = plans.find((p) => p.code === "FREE") || DEFAULT_PLANS[0]
    const premiumPlans = plans.filter((p) => p.code !== "FREE")

    const [currency, setCurrency] = useState<"PEN" | "USD">("PEN")
    const [selectedPlan, setSelectedPlan] = useState<PlanDefinition | null>(null)
    const [payMethod, setPayMethod] = useState<PayMethod>("YAPE")
    const [operationNumber, setOperationNumber] = useState("")
    const [proofDataUrl, setProofDataUrl] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [orders, setOrders] = useState<any[]>([])
    const [loadingOrders, setLoadingOrders] = useState(true)

    const loadOrders = async () => {
        try {
            const res = await fetch("/api/payments/orders")
            if (res.ok) {
                const data = await res.json()
                setOrders(Array.isArray(data) ? data : [])
            }
        } finally {
            setLoadingOrders(false)
        }
    }

    useEffect(() => {
        loadOrders()
    }, [])

    const payConfig = branding.paymentConfig || {
        yape: { enabled: true, number: "", holder: "Wilber Saico", qrUrl: "" },
        plin: { enabled: true, number: "", holder: "Wilber Saico", qrUrl: "" },
        card: { enabled: true, provider: "CULQI" },
        paypal: { enabled: true, paypalMe: "" },
    }

    const handleSubmitOrder = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedPlan) return
        if (!operationNumber.trim()) {
            toast.error("Ingresa tu número de operación o referencia")
            return
        }

        setSubmitting(true)
        try {
            const res = await fetch("/api/payments/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    planCode: selectedPlan.code,
                    paymentMethod: payMethod,
                    currencyCode: currency,
                    operationNumber: operationNumber.trim(),
                    proofUrl: proofDataUrl,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "No se pudo registrar la orden")

            toast.success(`Orden ${data.order_code} registrada`, {
                description: "Verificaremos tu pago y activaremos tu plan en breve.",
            })
            setSelectedPlan(null)
            setOperationNumber("")
            setProofDataUrl(null)
            await loadOrders()
        } catch (err: any) {
            toast.error(err?.message || "No se pudo enviar el comprobante")
        } finally {
            setSubmitting(false)
        }
    }

    const currSymbol = currency === "USD" ? "$" : "S/."

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-24 animate-in fade-in duration-300">
            {/* Current Status Banner */}
            <div className="rounded-3xl bg-card border border-border/70 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider">
                        <Crown className="h-3.5 w-3.5" />
                        {isTrial
                            ? `Prueba gratuita activa · ${trialDaysRemaining} días restantes`
                            : isPremium
                              ? entitlements.planName
                              : "Plan Básico · Gratis de por vida"}
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                        Planes y Suscripción
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                        {isFree
                            ? "Estás en el Plan Básico gratuito. Activa Premium cuando quieras para desbloquear todo el sistema."
                            : isTrial
                              ? "Disfrutas acceso total sin costo durante 15 días. Elige un plan si quieres mantener todo desbloqueado."
                              : "Tu cuenta tiene acceso completo a todos los módulos del sistema."}
                    </p>
                </div>

                {/* Currency Switcher */}
                <div className="inline-flex p-1 rounded-2xl bg-muted border border-border/60 shrink-0 self-start sm:self-auto">
                    {(["PEN", "USD"] as const).map((cur) => (
                        <button
                            key={cur}
                            type="button"
                            onClick={() => setCurrency(cur)}
                            className={cn(
                                "px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all",
                                currency === cur
                                    ? "bg-card text-foreground shadow-xs"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {cur === "PEN" ? "Soles (S/.)" : "Dólares ($)"}
                        </button>
                    ))}
                </div>
            </div>

            {/* Pricing Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {premiumPlans.map((plan) => {
                    const price = currency === "USD" ? plan.price_usd : plan.price_pen
                    const isPopular = plan.code === "PREMIUM_ANNUAL"
                    const isLifetime = plan.code === "PREMIUM_LIFETIME"

                    return (
                        <div
                            key={plan.code}
                            className={cn(
                                "rounded-3xl bg-card border p-5 flex flex-col justify-between gap-5 relative transition-all hover:shadow-lg",
                                isPopular
                                    ? "border-primary ring-2 ring-primary/20 shadow-md"
                                    : "border-border/70"
                            )}
                        >
                            {plan.badge && (
                                <span
                                    className={cn(
                                        "self-start px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider",
                                        isPopular
                                            ? "bg-primary text-primary-foreground"
                                            : isLifetime
                                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                              : "bg-primary/10 text-primary"
                                    )}
                                >
                                    {plan.badge}
                                </span>
                            )}

                            <div className="space-y-3">
                                <div>
                                    <h3 className="text-lg font-black text-foreground">{plan.name}</h3>
                                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                                        {plan.description}
                                    </p>
                                </div>

                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-black text-foreground tabular-nums">
                                        {currSymbol} {price}
                                    </span>
                                    <span className="text-xs font-semibold text-muted-foreground">
                                        {plan.billing_cycle === "MONTHLY"
                                            ? "/ mes"
                                            : plan.billing_cycle === "SEMIANNUAL"
                                              ? "/ 6 meses"
                                              : plan.billing_cycle === "ANNUAL"
                                                ? "/ año"
                                                : "único pago"}
                                    </span>
                                </div>

                                <ul className="space-y-2 pt-2 border-t border-border/50">
                                    {(plan.features || []).map((feat) => (
                                        <li key={feat} className="flex items-start gap-2 text-xs text-foreground/85">
                                            <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                            <span>{feat}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <Button
                                type="button"
                                onClick={() => setSelectedPlan(plan)}
                                variant={isPopular ? "default" : "outline"}
                                className="w-full h-11 rounded-2xl font-extrabold text-xs"
                            >
                                Elegir {plan.name}
                            </Button>
                        </div>
                    )
                })}
            </div>

            {/* Free Plan Summary */}
            <div className="rounded-3xl bg-muted/35 border border-border/60 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="font-black text-base text-foreground">{freePlan.name}</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-card border border-border text-[10px] font-bold text-foreground">
                            Gratis de por vida · {currSymbol} 0
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {freePlan.features.join(" · ")}
                    </p>
                </div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4" />
                    Sin expiración ni cobros ocultos
                </span>
            </div>

            {/* Orders History */}
            <div className="rounded-3xl bg-card border border-border/70 p-6 space-y-4">
                <h2 className="text-base font-black text-foreground">Historial de pagos</h2>
                {loadingOrders ? (
                    <div className="py-6 flex justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                ) : orders.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                        Aún no tienes órdenes de pago registradas.
                    </p>
                ) : (
                    <div className="divide-y divide-border/50">
                        {orders.map((ord) => (
                            <div
                                key={ord.id}
                                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                            >
                                <div className="space-y-0.5">
                                    <p className="font-bold text-foreground">
                                        {ord.order_code} · {ord.payment_method} · Op. {ord.operation_number}
                                    </p>
                                    <p className="text-muted-foreground">
                                        {new Date(ord.created_at).toLocaleString("es-PE")} ·{" "}
                                        {ord.currency_code} {Number(ord.amount).toFixed(2)}
                                    </p>
                                </div>
                                <span
                                    className={cn(
                                        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[11px] self-start sm:self-auto",
                                        ord.status === "APPROVED"
                                            ? "bg-emerald-500/12 text-emerald-600"
                                            : ord.status === "REJECTED"
                                              ? "bg-rose-500/12 text-rose-600"
                                              : "bg-amber-500/12 text-amber-600"
                                    )}
                                >
                                    {ord.status === "APPROVED" ? (
                                        <>
                                            <CheckCircle2 className="h-3.5 w-3.5" /> Aprobado
                                        </>
                                    ) : ord.status === "REJECTED" ? (
                                        <>
                                            <XCircle className="h-3.5 w-3.5" /> Rechazado
                                        </>
                                    ) : (
                                        <>
                                            <Clock className="h-3.5 w-3.5" /> En verificación
                                        </>
                                    )}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Checkout Modal */}
            <Dialog open={Boolean(selectedPlan)} onOpenChange={(o) => !o && setSelectedPlan(null)}>
                <DialogContent className="sm:max-w-lg rounded-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="font-black text-xl">
                            Activar Plan {selectedPlan?.name}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Total a pagar:{" "}
                            <strong className="text-foreground">
                                {currSymbol}{" "}
                                {currency === "USD"
                                    ? selectedPlan?.price_usd
                                    : selectedPlan?.price_pen}
                            </strong>{" "}
                            · Conexión cifrada y activación segura.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Payment Method Selector */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                            { id: "YAPE" as const, label: "Yape", icon: Smartphone, enabled: payConfig.yape.enabled },
                            { id: "PLIN" as const, label: "Plin", icon: QrCode, enabled: payConfig.plin.enabled },
                            { id: "CARD" as const, label: "Visa / MC", icon: CreditCard, enabled: payConfig.card.enabled },
                            { id: "PAYPAL" as const, label: "PayPal", icon: Globe, enabled: payConfig.paypal.enabled },
                        ]
                            .filter((m) => m.enabled)
                            .map((m) => (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => setPayMethod(m.id)}
                                    className={cn(
                                        "p-3 rounded-2xl border flex flex-col items-center gap-1.5 text-xs font-bold transition-all",
                                        payMethod === m.id
                                            ? "border-primary bg-primary/10 text-primary shadow-xs"
                                            : "border-border/70 bg-card text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <m.icon className="h-4 w-4" />
                                    <span>{m.label}</span>
                                </button>
                            ))}
                    </div>

                    <form onSubmit={handleSubmitOrder} className="space-y-4">
                        {(payMethod === "YAPE" || payMethod === "PLIN") && (
                            <div className="rounded-2xl bg-muted/40 border border-border/60 p-4 space-y-3 text-xs">
                                {(() => {
                                    const info = payMethod === "YAPE" ? payConfig.yape : payConfig.plin
                                    return (
                                        <>
                                            <div className="flex flex-col sm:flex-row items-center gap-4">
                                                {info.qrUrl ? (
                                                    <img
                                                        src={info.qrUrl}
                                                        alt={`QR ${payMethod}`}
                                                        className="h-32 w-32 rounded-2xl object-contain bg-white p-1.5 border border-border"
                                                    />
                                                ) : (
                                                    <div className="h-28 w-28 rounded-2xl bg-card border border-dashed border-border flex flex-col items-center justify-center text-muted-foreground text-center p-2">
                                                        <QrCode className="h-7 w-7 mb-1 opacity-60" />
                                                        <span className="text-[10px]">QR {payMethod}</span>
                                                    </div>
                                                )}
                                                <div className="space-y-1.5 text-center sm:text-left flex-1">
                                                    <p className="font-extrabold text-sm text-foreground">
                                                        Paga con {payMethod}
                                                    </p>
                                                    <p className="text-muted-foreground">
                                                        Titular: <strong className="text-foreground">{info.holder || "Wilber Saico"}</strong>
                                                    </p>
                                                    {info.number && (
                                                        <div className="flex items-center justify-center sm:justify-start gap-2">
                                                            <span className="font-mono font-black text-sm text-primary">
                                                                {info.number}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(info.number)
                                                                    toast.success("Número copiado")
                                                                }}
                                                                className="p-1 rounded-lg bg-card border border-border hover:bg-muted"
                                                            >
                                                                <Copy className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )
                                })()}
                            </div>
                        )}

                        {payMethod === "CARD" && (
                            <div className="rounded-2xl bg-muted/40 border border-border/60 p-4 space-y-2 text-xs">
                                <p className="font-bold text-foreground flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                                    Pago protegido vía Culqi / Visa / Mastercard
                                </p>
                                <p className="text-muted-foreground leading-relaxed">
                                    Nunca almacenamos datos de tarjeta en nuestros servidores. Realiza el pago y registra el código de transacción para activación verificada.
                                </p>
                            </div>
                        )}

                        {payMethod === "PAYPAL" && (
                            <div className="rounded-2xl bg-muted/40 border border-border/60 p-4 space-y-2 text-xs">
                                <p className="font-bold text-foreground">Pago internacional con PayPal</p>
                                {payConfig.paypal.paypalMe ? (
                                    <a
                                        href={payConfig.paypal.paypalMe}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 font-extrabold text-primary hover:underline"
                                    >
                                        Abrir enlace oficial de PayPal
                                    </a>
                                ) : (
                                    <p className="text-muted-foreground">
                                        Ingresa el ID de transacción PayPal generado tras tu pago para activar tu acceso.
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold">
                                Número de operación / Referencia de pago
                            </Label>
                            <Input
                                value={operationNumber}
                                onChange={(e) => setOperationNumber(e.target.value)}
                                placeholder="Ej. 09481234"
                                className="h-11 rounded-2xl"
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold">Comprobante (opcional)</Label>
                            <label className="flex items-center justify-between p-3 rounded-2xl border border-dashed border-border/80 bg-muted/20 hover:bg-muted/40 cursor-pointer text-xs">
                                <span className="flex items-center gap-2 text-muted-foreground font-semibold">
                                    <Upload className="h-4 w-4 text-primary" />
                                    {proofDataUrl ? "Comprobante listo para enviar" : "Adjuntar captura de pantalla"}
                                </span>
                                {proofDataUrl && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0]
                                        if (!file) return
                                        const dataUrl = await compressImageToDataUrl(file)
                                        setProofDataUrl(dataUrl)
                                    }}
                                />
                            </label>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setSelectedPlan(null)}
                                className="rounded-xl"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={submitting}
                                className="rounded-xl font-extrabold px-5"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                                        Enviando...
                                    </>
                                ) : (
                                    "Confirmar y enviar pago"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
