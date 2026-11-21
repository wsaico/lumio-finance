"use client"

import { useState, useRef, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
    Eye,
    EyeOff,
    Loader2,
    ArrowRight,
    ArrowLeft,
    MailCheck,
    RefreshCw,
    ShieldCheck,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import { detectBrowserRegion } from "@/lib/regions"
import { showAppToast } from "@/components/ui/app-alert-toast"
import { cn } from "@/lib/utils"

const registerSchema = z.object({
    fullName: z.string().min(2, "Ingresa tu nombre"),
    email: z.string().email("Ingresa un correo válido"),
    password: z.string().min(6, "Mínimo 6 caracteres"),
})

type RegisterFormValues = z.infer<typeof registerSchema>

const DEFAULT_OTP_LENGTH =
    Number(process.env.NEXT_PUBLIC_OTP_LENGTH) === 8 ? 8 : 6

export default function RegisterPage() {
    const router = useRouter()
    const supabase = createClient()

    const [step, setStep] = useState<"form" | "otp">("form")
    const [otpLength, setOtpLength] = useState<6 | 8>(DEFAULT_OTP_LENGTH)
    const [isLoading, setIsLoading] = useState(false)
    const [isVerifying, setIsVerifying] = useState(false)
    const [isResending, setIsResending] = useState(false)
    const [isGoogleLoading, setIsGoogleLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    // Saved registration payload waiting for email OTP verification (6 or 8 digits)
    const [pendingData, setPendingData] = useState<{
        fullName: string
        email: string
        password: string
        countryCode: string
        currency: string
        timezone: string
    } | null>(null)

    const [otpDigits, setOtpDigits] = useState<string[]>(
        Array(DEFAULT_OTP_LENGTH).fill("")
    )
    const [cooldown, setCooldown] = useState<number>(0)
    const inputRefs = useRef<(HTMLInputElement | null)[]>([])

    const form = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
        defaultValues: { fullName: "", email: "", password: "" },
    })

    // Countdown timer for resending OTP code
    useEffect(() => {
        if (cooldown <= 0) return
        const timer = setInterval(() => {
            setCooldown((prev) => Math.max(0, prev - 1))
        }, 1000)
        return () => clearInterval(timer)
    }, [cooldown])

    // Auto-focus first OTP box on step switch
    useEffect(() => {
        if (step === "otp") {
            setTimeout(() => {
                inputRefs.current[0]?.focus()
            }, 80)
        }
    }, [step])

    const sendVerificationCode = async (
        payload: {
            fullName: string
            email: string
            password: string
            countryCode: string
            currency: string
            timezone: string
        },
        isResend = false
    ) => {
        // 1. Server-side anti-spam & duplicate email check
        const checkRes = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "check",
                email: payload.email,
                isResend,
            }),
        })
        const checkJson = await checkRes.json().catch(() => ({}))
        if (!checkRes.ok) {
            throw new Error(checkJson?.error || "No se pudo validar el correo.")
        }

        // 2. Trigger Supabase OTP email (never creates an unverified session!)
        const { error: otpError } = await supabase.auth.signInWithOtp({
            email: payload.email,
            options: {
                shouldCreateUser: true,
                data: {
                    full_name: payload.fullName,
                    country_code: payload.countryCode,
                    currency: payload.currency,
                    timezone: payload.timezone,
                    pending_verification: true,
                },
            },
        })

        if (otpError) {
            throw new Error(
                otpError.message.includes("rate limit")
                    ? "Has solicitado demasiados códigos seguidos. Espera 1 minuto e inténtalo de nuevo."
                    : otpError.message
            )
        }
    }

    const onSubmit = async (values: RegisterFormValues) => {
        setIsLoading(true)
        try {
            const region = detectBrowserRegion()
            const payload = {
                fullName: values.fullName.trim(),
                email: values.email.trim().toLowerCase(),
                password: values.password,
                countryCode: region.code,
                currency: region.currencyCode,
                timezone: region.timezone,
            }

            await sendVerificationCode(payload, false)

            setPendingData(payload)
            setOtpDigits(Array(otpLength).fill(""))
            setCooldown(60)
            setStep("otp")

            showAppToast.info({
                title: "Código enviado a tu correo",
                description: `Revisa tu bandeja de entrada (${payload.email}) e ingresa tu código de verificación.`,
            })
        } catch (err: any) {
            showAppToast.error({
                title: "No se pudo enviar el código",
                description: err?.message || "Verifica tu correo e inténtalo nuevamente.",
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleResendCode = async () => {
        if (!pendingData || cooldown > 0 || isResending) return
        setIsResending(true)
        try {
            await sendVerificationCode(pendingData, true)
            setOtpDigits(Array(otpLength).fill(""))
            setCooldown(60)
            inputRefs.current[0]?.focus()
            showAppToast.success({
                title: "Nuevo código enviado",
                description: `Enviamos un nuevo código de verificación a ${pendingData.email}.`,
            })
        } catch (err: any) {
            showAppToast.error({
                title: "No se pudo reenviar el código",
                description: err?.message || "Espera unos segundos antes de intentar otra vez.",
            })
        } finally {
            setIsResending(false)
        }
    }

    const handleVerifyOtp = async (codeOverride?: string) => {
        if (!pendingData || isVerifying) return
        const code = (codeOverride ?? otpDigits.join("")).trim()
        const requiredLen = codeOverride ? codeOverride.length : otpLength
        if (code.length < requiredLen || (code.length !== 6 && code.length !== 8)) {
            showAppToast.warning({
                title: "Código incompleto",
                description: `Ingresa los ${otpLength} dígitos del código que enviamos a tu correo.`,
            })
            return
        }

        setIsVerifying(true)
        try {
            // Try verifying as 'email' OTP first, with fallback to 'signup' and 'magiclink'
            let verified = false
            let lastError: any = null

            for (const otpType of ["email", "signup", "magiclink"] as const) {
                const { data, error } = await supabase.auth.verifyOtp({
                    email: pendingData.email,
                    token: code,
                    type: otpType,
                })
                if (!error && data?.session) {
                    verified = true
                    break
                }
                lastError = error
            }

            if (!verified) {
                throw new Error(
                    lastError?.message?.includes("expired") ||
                        lastError?.message?.includes("invalid")
                        ? "El código ingresado es incorrecto o ha expirado."
                        : lastError?.message || "Código de verificación inválido."
                )
            }

            // Finalize registration: save password + create profile row on server
            const completeRes = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "complete",
                    fullName: pendingData.fullName,
                    password: pendingData.password,
                    countryCode: pendingData.countryCode,
                    currency: pendingData.currency,
                    timezone: pendingData.timezone,
                }),
            })
            const completeJson = await completeRes.json().catch(() => ({}))
            if (!completeRes.ok) {
                throw new Error(completeJson?.error || "No se pudo activar la cuenta.")
            }

            // Refresh session with the newly set password
            await supabase.auth.signInWithPassword({
                email: pendingData.email,
                password: pendingData.password,
            })

            showAppToast.success({
                title: "Correo verificado con éxito",
                description: "Bienvenido a Lumio Finance. Tus 15 días de prueba están activos.",
            })

            router.push("/dashboard")
            router.refresh()
        } catch (err: any) {
            showAppToast.error({
                title: "No se pudo verificar el código",
                description: err?.message || "Revisa el código e inténtalo nuevamente.",
            })
        } finally {
            setIsVerifying(false)
        }
    }

    const handleDigitChange = (index: number, rawVal: string) => {
        const cleaned = rawVal.replace(/\D/g, "")
        if (!cleaned) {
            const next = [...otpDigits]
            next[index] = ""
            setOtpDigits(next)
            return
        }

        // Handle multi-digit input or autofill (auto-adapts between 6 and 8 digits)
        if (cleaned.length > 1) {
            const targetLen: 6 | 8 =
                cleaned.length >= 8 ? 8 : cleaned.length === 6 ? 6 : otpLength
            if (targetLen !== otpLength) {
                setOtpLength(targetLen)
            }
            const chars = cleaned.slice(0, targetLen).split("")
            const next = Array(targetLen).fill("")
            chars.forEach((ch, idx) => {
                const pos = cleaned.length >= 6 ? idx : index + idx
                if (pos < targetLen) {
                    next[pos] = ch
                }
            })
            setOtpDigits(next)
            const focusIdx = Math.min(targetLen - 1, chars.length)
            setTimeout(() => inputRefs.current[focusIdx]?.focus(), 20)
            if (next.every((d) => d.length === 1)) {
                handleVerifyOtp(next.join(""))
            }
            return
        }

        const next = [...otpDigits]
        next[index] = cleaned
        setOtpDigits(next)

        if (index < otpLength - 1) {
            inputRefs.current[index + 1]?.focus()
        } else if (next.every((d) => d.length === 1)) {
            handleVerifyOtp(next.join(""))
        }
    }

    const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace") {
            if (otpDigits[index]) {
                const next = [...otpDigits]
                next[index] = ""
                setOtpDigits(next)
            } else if (index > 0) {
                const next = [...otpDigits]
                next[index - 1] = ""
                setOtpDigits(next)
                inputRefs.current[index - 1]?.focus()
            }
            e.preventDefault()
        } else if (e.key === "ArrowLeft" && index > 0) {
            inputRefs.current[index - 1]?.focus()
        } else if (e.key === "ArrowRight" && index < otpLength - 1) {
            inputRefs.current[index + 1]?.focus()
        } else if (e.key === "Enter") {
            e.preventDefault()
            handleVerifyOtp()
        }
    }

    const handlePasteOtp = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault()
        const pasted = e.clipboardData.getData("text").trim()
        // Extract 8 or 6 consecutive digits even if user pasted a line of text from the email
        const match8 = pasted.match(/\b(\d{8})\b/)
        const match6 = pasted.match(/\b(\d{6})\b/)
        const rawDigits = pasted.replace(/\D/g, "")

        let targetLen: 6 | 8 = otpLength
        let digits = ""
        if (match8) {
            targetLen = 8
            digits = match8[1]
        } else if (match6) {
            targetLen = 6
            digits = match6[1]
        } else if (rawDigits.length >= 8) {
            targetLen = 8
            digits = rawDigits.slice(0, 8)
        } else {
            digits = rawDigits.slice(0, otpLength)
        }
        if (!digits) return

        if (targetLen !== otpLength) {
            setOtpLength(targetLen)
        }
        const next = Array(targetLen).fill("")
        digits.split("").forEach((ch, i) => {
            next[i] = ch
        })
        setOtpDigits(next)
        const focusIdx = Math.min(targetLen - 1, digits.length)
        setTimeout(() => inputRefs.current[focusIdx]?.focus(), 20)

        if (digits.length === targetLen) {
            handleVerifyOtp(digits)
        }
    }

    const handleGoogleLogin = async () => {
        setIsGoogleLoading(true)
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            })
            if (error) throw error
        } catch (err: any) {
            showAppToast.error({
                title: "Error al conectar con Google",
                description: err?.message || "Inténtalo nuevamente.",
            })
            setIsGoogleLoading(false)
        }
    }

    // =========================================================================
    // STEP 2: 6-DIGIT EMAIL OTP VERIFICATION SCREEN
    // =========================================================================
    if (step === "otp" && pendingData) {
        return (
            <motion.div
                key="otp-verification"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="w-full bg-card rounded-[2rem] p-6 sm:p-8 border border-border/70 shadow-xl shadow-black/5 space-y-6"
            >
                <div className="flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => setStep("form")}
                        disabled={isVerifying}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Cambiar correo
                    </button>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Verificación anti-spam
                    </span>
                </div>

                <div className="text-center space-y-2">
                    <div className="h-13 w-13 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                        <MailCheck className="h-6 w-6" />
                    </div>
                    <h2 className="text-2xl font-black tracking-tight text-foreground">
                        Ingresa tu código
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        Enviamos un código de {otpLength} dígitos a{" "}
                        <strong className="text-foreground font-bold">{pendingData.email}</strong>
                    </p>
                </div>

                {/* Adaptive 6 or 8-Digit OTP Input Boxes */}
                <div className="space-y-3">
                    <div className="flex items-center justify-center gap-2 sm:gap-2.5">
                        {otpDigits.map((digit, idx) => (
                            <input
                                key={`${otpLength}-${idx}`}
                                ref={(el) => {
                                    inputRefs.current[idx] = el
                                }}
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={6}
                                value={digit}
                                disabled={isVerifying}
                                onChange={(e) => handleDigitChange(idx, e.target.value)}
                                onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                                onPaste={handlePasteOtp}
                                aria-label={`Dígito ${idx + 1}`}
                                className={cn(
                                    "h-12 w-11 sm:h-14 sm:w-12 rounded-2xl border-2 bg-muted/35 text-center text-lg sm:text-xl font-black text-foreground tabular-nums transition-all focus:outline-none focus:border-primary focus:bg-card focus:ring-4 focus:ring-primary/15",
                                    digit ? "border-primary/70 bg-card" : "border-border/70"
                                )}
                            />
                        ))}
                    </div>
                </div>

                <Button
                    type="button"
                    onClick={() => handleVerifyOtp()}
                    disabled={isVerifying || otpDigits.join("").length < otpLength}
                    className="w-full h-11 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20 transition-all gap-2 cursor-pointer"
                >
                    {isVerifying ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Verificando código...
                        </>
                    ) : (
                        <>
                            Verificar y activar cuenta
                            <ArrowRight className="h-4 w-4" />
                        </>
                    )}
                </Button>

                <div className="text-center space-y-2 pt-1">
                    <p className="text-xs text-muted-foreground">
                        ¿No recibiste el correo? Revisa también tu carpeta de Spam o Promociones.
                    </p>
                    <button
                        type="button"
                        onClick={handleResendCode}
                        disabled={cooldown > 0 || isResending}
                        className={cn(
                            "inline-flex items-center gap-1.5 text-xs font-bold transition-colors",
                            cooldown > 0
                                ? "text-muted-foreground/60 cursor-not-allowed"
                                : "text-primary hover:underline cursor-pointer"
                        )}
                    >
                        <RefreshCw className={cn("h-3.5 w-3.5", isResending && "animate-spin")} />
                        {cooldown > 0
                            ? `Reenviar código en ${cooldown}s`
                            : "Reenviar código de verificación"}
                    </button>
                </div>
            </motion.div>
        )
    }

    // =========================================================================
    // STEP 1: REGISTRATION FORM
    // =========================================================================
    return (
        <motion.div
            key="register-form"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full bg-card rounded-[2rem] p-6 sm:p-8 border border-border/70 shadow-xl shadow-black/5"
        >
            <div className="mb-6">
                <h1 className="text-2xl font-black tracking-tight text-foreground">
                    Crear cuenta
                </h1>
                <p className="text-xs text-muted-foreground mt-1">
                    Incluye 15 días de prueba completa sin tarjeta. Verificaremos tu correo con un código de seguridad.
                </p>
            </div>

            <Button
                type="button"
                variant="outline"
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading || isLoading}
                className="w-full h-11 rounded-2xl gap-3 text-sm font-semibold border-border/80 hover:bg-muted/50 transition-all mb-5 cursor-pointer"
            >
                {isGoogleLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                        <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                    </svg>
                )}
                Registrarme con Google
            </Button>

            <div className="relative mb-5">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/60" />
                </div>
                <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
                    <span className="bg-card px-3 text-muted-foreground font-semibold">
                        o con tu correo
                    </span>
                </div>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-semibold text-foreground/80">
                                    Nombre
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="Tu nombre"
                                        className="h-11 rounded-2xl bg-muted/30 border-border/70 focus-visible:ring-primary"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage className="text-xs" />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-semibold text-foreground/80">
                                    Correo electrónico
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="nombre@correo.com"
                                        type="email"
                                        autoComplete="email"
                                        className="h-11 rounded-2xl bg-muted/30 border-border/70 focus-visible:ring-primary"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage className="text-xs" />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-semibold text-foreground/80">
                                    Contraseña
                                </FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input
                                            placeholder="Mínimo 6 caracteres"
                                            type={showPassword ? "text" : "password"}
                                            autoComplete="new-password"
                                            className="h-11 rounded-2xl bg-muted/30 border-border/70 pr-10 focus-visible:ring-primary"
                                            {...field}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer"
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>
                                </FormControl>
                                <FormMessage className="text-xs" />
                            </FormItem>
                        )}
                    />

                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-11 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20 transition-all mt-2 gap-2 cursor-pointer"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Enviando código...
                            </>
                        ) : (
                            <>
                                Enviar código de verificación
                                <ArrowRight className="h-4 w-4" />
                            </>
                        )}
                    </Button>
                </form>
            </Form>

            <div className="mt-6 text-center text-xs text-muted-foreground space-y-2">
                <p>
                    ¿Ya tienes cuenta?{" "}
                    <Link href="/login" className="text-primary font-bold hover:underline">
                        Iniciar sesión
                    </Link>
                </p>
                <p className="text-[11px] text-muted-foreground/75">
                    Al registrarte aceptas los{" "}
                    <Link href="/terminos" className="underline hover:text-foreground">
                        términos
                    </Link>{" "}
                    y la{" "}
                    <Link href="/privacidad" className="underline hover:text-foreground">
                        política de privacidad
                    </Link>
                    .
                </p>
            </div>
        </motion.div>
    )
}
