"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Eye, EyeOff, Loader2, KeyRound, CheckCircle2 } from "lucide-react"

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
import { toast } from "sonner"

const resetSchema = z.object({
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
    confirmPassword: z.string().min(6, "Confirma tu contraseña"),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
})

type ResetFormValues = z.infer<typeof resetSchema>

export default function ResetPasswordPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const supabase = createClient()

    const form = useForm<ResetFormValues>({
        resolver: zodResolver(resetSchema),
        defaultValues: {
            password: "",
            confirmPassword: "",
        },
    })

    const onSubmit = async (values: ResetFormValues) => {
        setIsLoading(true)
        try {
            const { error } = await supabase.auth.updateUser({
                password: values.password,
            })

            if (error) {
                toast.error("No se pudo actualizar la contraseña", {
                    description: error.message
                })
                return
            }

            setIsSuccess(true)
            toast.success("¡Contraseña actualizada!", {
                description: "Ya puedes ingresar con tu nueva clave."
            })
            setTimeout(() => {
                router.push("/dashboard")
            }, 1500)
        } catch (err: any) {
            toast.error("Ocurrió un error inesperado", {
                description: "Por favor intenta nuevamente."
            })
        } finally {
            setIsLoading(false)
        }
    }

    if (isSuccess) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full bg-card rounded-[2rem] p-8 border border-border/60 shadow-xl shadow-primary/5 text-center space-y-5"
            >
                <div className="h-16 w-16 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">
                        ¡Contraseña lista! ✨
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Tu nueva clave fue guardada. Te estamos redirigiendo a tu espacio de finanzas...
                    </p>
                </div>
            </motion.div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="w-full bg-card rounded-[2rem] p-6 sm:p-8 border border-border/60 shadow-xl shadow-primary/5"
        >
            <div className="space-y-1.5 mb-6 text-center sm:text-left">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    Crea tu nueva contraseña 🔑
                </h1>
                <p className="text-sm text-muted-foreground">
                    Elige una clave segura para proteger el acceso a tus finanzas.
                </p>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-semibold text-foreground/80">
                                    Nueva contraseña (mínimo 6 caracteres)
                                </FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input
                                            placeholder="••••••••"
                                            type={showPassword ? "text" : "password"}
                                            autoComplete="new-password"
                                            className="h-11 rounded-2xl bg-muted/30 border-border/70 pr-10 focus-visible:ring-primary"
                                            {...field}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
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

                    <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-semibold text-foreground/80">
                                    Confirma tu nueva contraseña
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="••••••••"
                                        type={showPassword ? "text" : "password"}
                                        autoComplete="new-password"
                                        className="h-11 rounded-2xl bg-muted/30 border-border/70 focus-visible:ring-primary"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage className="text-xs" />
                            </FormItem>
                        )}
                    />

                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-semibold text-sm shadow-lg shadow-primary/25 transition-all mt-2 gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Guardando clave...
                            </>
                        ) : (
                            <>
                                Guardar nueva contraseña
                                <KeyRound className="h-4 w-4" />
                            </>
                        )}
                    </Button>
                </form>
            </Form>
        </motion.div>
    )
}
