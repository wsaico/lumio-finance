
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
import { Loader2, User, Mail, Lock, Sparkles, ArrowRight, ShieldCheck } from "lucide-react"

const formSchema = z.object({
    fullName: z.string().min(2, {
        message: "El nombre debe tener al menos 2 caracteres.",
    }),
    email: z.string().email({
        message: "Por favor ingrese un correo válido.",
    }),
    password: z.string().min(6, {
        message: "La contraseña debe tener al menos 6 caracteres.",
    }),
})

export default function RegisterPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const supabase = createClient()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            fullName: "",
            email: "",
            password: "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true)
        try {
            const { error } = await supabase.auth.signUp({
                email: values.email,
                password: values.password,
                options: {
                    data: {
                        full_name: values.fullName,
                    },
                },
            })

            if (error) {
                toast.error("Error al registrarse", {
                    description: error.message,
                })
                return
            }

            toast.success("Cuenta creada", {
                description: "Revisa tu correo para confirmar la cuenta.",
            })

            router.push("/login")
        } catch (error) {
            toast.error("Error inesperado", {
                description: "Ocurrió un error al intentar registrarse.",
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="w-full"
        >
            <div className="relative group">
                {/* System Glow */}
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-[oklch(var(--income))]/10 to-primary/20 rounded-3xl blur-3xl opacity-30 group-hover:opacity-50 transition duration-1000" />

                <div className="relative bg-card/60 backdrop-blur-3xl border border-white/5 rounded-3xl p-8 shadow-2xl overflow-hidden shadow-primary/5">
                    {/* Top Accent Line */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-[oklch(var(--income))] to-primary/50 opacity-50" />

                    <div className="mb-8 text-center sm:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black tracking-[0.2em] uppercase mb-4">
                            <ShieldCheck className="w-3 h-3" /> Membresía Élite
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tighter leading-none mb-2">
                            Crea tu cuenta en <span className="text-primary italic">Lumio</span>
                        </h1>
                        <p className="text-muted-foreground text-sm font-medium leading-relaxed">
                            Únete al estándar más alto en gestión financiera personal.
                        </p>
                    </div>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                            <FormField
                                control={form.control}
                                name="fullName"
                                render={({ field }) => (
                                    <FormItem className="space-y-1.5">
                                        <FormLabel className="text-muted-foreground text-[10px] font-black uppercase tracking-widest ml-1 opacity-70">Nombre Completo</FormLabel>
                                        <FormControl>
                                            <div className="relative group/input">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-focus-within/input:text-primary transition-colors" />
                                                <Input
                                                    placeholder="John Doe"
                                                    {...field}
                                                    className="bg-background/40 border-white/5 pl-11 h-11 focus:ring-primary/20 focus:border-primary/40 transition-all rounded-xl placeholder:text-muted-foreground/30 font-medium"
                                                />
                                            </div>
                                        </FormControl>
                                        <FormMessage className="text-[10px] font-bold text-destructive" />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem className="space-y-1.5">
                                        <FormLabel className="text-muted-foreground text-[10px] font-black uppercase tracking-widest ml-1 opacity-70">Identificación Email</FormLabel>
                                        <FormControl>
                                            <div className="relative group/input">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-focus-within/input:text-primary transition-colors" />
                                                <Input
                                                    placeholder="tu@email.com"
                                                    {...field}
                                                    className="bg-background/40 border-white/5 pl-11 h-11 focus:ring-primary/20 focus:border-primary/40 transition-all rounded-xl placeholder:text-muted-foreground/30 font-medium"
                                                />
                                            </div>
                                        </FormControl>
                                        <FormMessage className="text-[10px] font-bold text-destructive" />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem className="space-y-1.5">
                                        <FormLabel className="text-muted-foreground text-[10px] font-black uppercase tracking-widest ml-1 opacity-70">Clave de Acceso</FormLabel>
                                        <FormControl>
                                            <div className="relative group/input">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-focus-within/input:text-primary transition-colors" />
                                                <Input
                                                    type="password"
                                                    placeholder="••••••••"
                                                    {...field}
                                                    className="bg-background/40 border-white/5 pl-11 h-11 focus:ring-primary/20 focus:border-primary/40 transition-all rounded-xl placeholder:text-muted-foreground/30 font-medium"
                                                />
                                            </div>
                                        </FormControl>
                                        <FormMessage className="text-[10px] font-bold text-destructive" />
                                    </FormItem>
                                )}
                            />

                            <Button
                                className="w-full h-11 bg-primary hover:bg-primary-light text-primary-foreground font-black rounded-xl shadow-xl shadow-primary/20 transition-all active:scale-[0.98] group relative overflow-hidden"
                                type="submit"
                                disabled={isLoading}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                {isLoading ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <div className="flex items-center justify-center gap-2 tracking-tight">
                                        REGISTRAR CUENTA <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                )}
                            </Button>
                        </form>
                    </Form>

                    <div className="mt-8 text-center space-y-4">
                        <p className="text-xs font-semibold text-muted-foreground/60">
                            ¿Ya tienes una identidad en Lumio?{" "}
                            <Link href="/login" className="text-primary hover:text-primary-light font-black underline-offset-4 hover:underline transition-all">
                                Inicia sesión aquí
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            {/* Footer Credits */}
            <div className="mt-8 flex flex-col items-center gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/30">
                    Lumio Finance · Security Protocol v2.5
                </p>
            </div>
        </motion.div>
    )
}
