"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import Link from "next/link"
import { motion } from "framer-motion"
import { Loader2, ArrowLeft, Send, CheckCircle2 } from "lucide-react"

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

const forgotSchema = z.object({
    email: z.string().email("Ingresa un correo electrónico válido"),
})

type ForgotFormValues = z.infer<typeof forgotSchema>

export default function ForgotPasswordPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [isSent, setIsSent] = useState(false)
    const supabase = createClient()

    const form = useForm<ForgotFormValues>({
        resolver: zodResolver(forgotSchema),
        defaultValues: {
            email: "",
        },
    })

    const onSubmit = async (values: ForgotFormValues) => {
        setIsLoading(true)
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
                redirectTo: `${window.location.origin}/reset-password`,
            })

            if (error) {
                toast.error("No se pudo enviar el correo", {
                    description: error.message
                })
                return
            }

            setIsSent(true)
            toast.success("Correo enviado", {
                description: "Revisa tu bandeja de entrada para continuar."
            })
        } catch (err: any) {
            toast.error("Ocurrió un error inesperado", {
                description: "Por favor revisa tu conexión e inténtalo nuevamente."
            })
        } finally {
            setIsLoading(false)
        }
    }

    if (isSent) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full bg-card rounded-[2rem] p-8 border border-border/60 shadow-xl shadow-primary/5 text-center space-y-5"
            >
                <div className="h-16 w-16 rounded-3xl bg-primary/10 dark:bg-indigo-950/40 text-primary flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">
                        Enlace enviado 📬
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Te hemos enviado un correo con instrucciones para restablecer tu contraseña. Revisa también tu carpeta de spam.
                    </p>
                </div>
                <Button
                    asChild
                    variant="outline"
                    className="w-full h-12 rounded-2xl text-sm font-semibold mt-2"
                >
                    <Link href="/login">Volver a Iniciar Sesión</Link>
                </Button>
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
                    ¿Olvidaste tu contraseña? 🔐
                </h1>
                <p className="text-sm text-muted-foreground">
                    No te preocupes. Escribe tu correo registrado y te ayudaremos a recuperarla en minutos.
                </p>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-semibold text-foreground/80">
                                    Tu correo electrónico
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="tu@correo.com"
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

                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-semibold text-sm shadow-lg shadow-primary/25 transition-all mt-2 gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Enviando enlace...
                            </>
                        ) : (
                            <>
                                Enviar instrucciones
                                <Send className="h-4 w-4" />
                            </>
                        )}
                    </Button>
                </form>
            </Form>

            <div className="mt-6 text-center">
                <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Volver a iniciar sesión
                </Link>
            </div>
        </motion.div>
    )
}
