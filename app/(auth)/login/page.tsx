
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"

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
import { Loader2, Mail, Lock, Chrome, ArrowRight, Sparkles } from "lucide-react"

const formSchema = z.object({
    email: z.string().email({
        message: "Por favor ingrese un correo válido.",
    }),
    password: z.string().min(6, {
        message: "La contraseña debe tener al menos 6 caracteres.",
    }),
})

export default function LoginPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [isGoogleLoading, setIsGoogleLoading] = useState(false)
    const supabase = createClient()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true)
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: values.email,
                password: values.password,
            })

            if (error) {
                toast.error("Error al iniciar sesión", {
                    description: error.message,
                })
                return
            }

            toast.success("Bienvenido de nuevo", {
                description: "Sincronizando tus finanzas...",
            })

            router.push("/dashboard")
            router.refresh()
        } catch (error) {
            toast.error("Error inesperado", {
                description: "Ocurrió un error al intentar iniciar sesión.",
            })
        } finally {
            setIsLoading(false)
        }
    }

    async function handleGoogleLogin() {
        setIsGoogleLoading(true)
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                }
            })

            if (error) throw error
        } catch (error: any) {
            toast.error("Error de Google Auth", {
                description: error.message,
            })
            setIsGoogleLoading(false)
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full"
        >
            <div className="relative group">
                {/* Glow Decorations */}
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-violet-500/20 rounded-3xl blur-2xl opacity-50 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />

                <div className="relative bg-card/60 backdrop-blur-3xl border border-white/5 rounded-3xl p-8 shadow-2xl overflow-hidden shadow-primary/5">
                    {/* Top Accent Line */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-[oklch(var(--income))] to-primary/50 opacity-50" />

                    <div className="mb-10 text-center sm:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[oklch(var(--income))]/10 border border-[oklch(var(--income))]/20 text-[oklch(var(--income))] text-[10px] font-black tracking-[0.2em] uppercase mb-4">
                            <Sparkles className="w-3 h-3" /> Protocolo Seguro
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tighter leading-none mb-3">
                            Bienvenido a <span className="text-primary italic">Lumio</span>
                        </h1>
                        <p className="text-muted-foreground text-sm font-medium leading-relaxed">
                            Accede a tu centro de mando financiero con el estándar de la élite.
                        </p>
                    </div>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <FormLabel className="text-slate-300 text-[10px] font-black uppercase tracking-widest ml-1">Identificación Email</FormLabel>
                                        <FormControl>
                                            <div className="relative group/input">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within/input:text-primary transition-colors" />
                                                <Input
                                                    placeholder="tu@email.com"
                                                    {...field}
                                                    className="bg-slate-950/60 border-white/10 pl-11 h-12 text-slate-100 focus:ring-primary/20 focus:border-primary/40 transition-all rounded-xl placeholder:text-slate-600 font-medium"
                                                />
                                            </div>
                                        </FormControl>
                                        <FormMessage className="text-[10px] font-bold text-red-400" />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <div className="flex items-center justify-between ml-1">
                                            <FormLabel className="text-slate-300 text-[10px] font-black uppercase tracking-widest">Clave de Acceso</FormLabel>
                                            <Link href="/forgot-password" title="Recuperar acceso" className="text-[10px] font-black text-primary hover:text-primary-light uppercase tracking-tighter transition-colors">
                                                ¿Olvidaste?
                                            </Link>
                                        </div>
                                        <FormControl>
                                            <div className="relative group/input">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within/input:text-primary transition-colors" />
                                                <Input
                                                    type="password"
                                                    placeholder="••••••••"
                                                    {...field}
                                                    className="bg-slate-950/60 border-white/10 pl-11 h-12 text-slate-100 focus:ring-primary/20 focus:border-primary/40 transition-all rounded-xl placeholder:text-slate-600 font-medium"
                                                />
                                            </div>
                                        </FormControl>
                                        <FormMessage className="text-[10px] font-bold text-red-400" />
                                    </FormItem>
                                )}
                            />

                            <Button
                                className="w-full h-12 bg-primary hover:bg-primary-light text-primary-foreground font-black rounded-xl shadow-xl shadow-primary/20 transition-all active:scale-[0.98] group relative overflow-hidden"
                                type="submit"
                                disabled={isLoading || isGoogleLoading}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                {isLoading ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <div className="flex items-center justify-center gap-2 tracking-tight">
                                        DESBLOQUEAR CUENTA <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                )}
                            </Button>
                        </form>
                    </Form>

                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-white/5" />
                        </div>
                        <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em] font-black">
                            <span className="bg-[#1a2233] px-4 text-slate-500">O continúa con</span>
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        onClick={handleGoogleLogin}
                        className="w-full h-12 border-white/5 bg-background/20 hover:bg-white/5 text-slate-200 font-bold rounded-xl transition-all flex items-center justify-center gap-3 active:scale-[0.98] shadow-sm"
                        disabled={isLoading || isGoogleLoading}
                    >
                        {isGoogleLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <>
                                <Chrome className="h-5 w-5 text-primary" />
                                Acceder con Google Account
                            </>
                        )}
                    </Button>

                    <p className="text-center text-xs font-medium text-slate-500">
                        ¿Nuevo en la plataforma?{" "}
                        <Link href="/register" className="text-emerald-500 hover:text-emerald-400 font-black transition-colors">
                            Crea una cuenta premium
                        </Link>
                    </p>
                </div>
            </div>

            {/* Footer Credits */}
            <p className="mt-8 text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">
                Lumio Finance · Security Protocol v2.4
            </p>
        </motion.div>
    )
}
