"use client"

export const dynamic = 'force-dynamic'

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import Link from "next/link"
import Image from "next/image"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Loader2, ArrowRight } from "lucide-react"

const formSchema = z.object({
    email: z.string().email({
        message: "Introduce un correo electrónico válido.",
    }),
    password: z.string().min(6, {
        message: "La contraseña debe tener al menos 6 caracteres.",
    }),
    remember: z.boolean().default(false).optional(),
})

// Carousel Data
const slides = [
    {
        id: 1,
        image: "https://images.unsplash.com/photo-1614028674026-a65e31bfd27c?q=80&w=2670&auto=format&fit=crop",
        title: "Domina tus Finanzas",
        description: "Control total sobre tus ingresos, gastos y metas financieras en una sola plataforma."
    },
    {
        id: 2,
        image: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=2670&auto=format&fit=crop",
        title: "Análisis Inteligente",
        description: "Visualiza tendencias y recibe insights personalizados para optimizar tu patrimonio."
    },
    {
        id: 3,
        image: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=2670&auto=format&fit=crop",
        title: "Seguridad Bancaria",
        description: "Tus datos están protegidos con los más altos entándares de encriptación y privacidad."
    }
]

export default function LoginPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [isGoogleLoading, setIsGoogleLoading] = useState(false)
    const [currentSlide, setCurrentSlide] = useState(0)
    const supabase = createClient()

    // Auto-advance carousel
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length)
        }, 5000)
        return () => clearInterval(timer)
    }, [])

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            password: "",
            remember: false,
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
                    description: "Usuario o contraseña incorrectos.",
                })
                return
            }

            toast.success("Bienvenido", {
                description: "Accediendo a tu cuenta...",
            })

            router.push("/dashboard")
            router.refresh()
        } catch (error) {
            toast.error("Error", {
                description: "Algo salió mal. Por favor intenta de nuevo.",
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
            toast.error("Error de Google", {
                description: error.message,
            })
            setIsGoogleLoading(false)
        }
    }

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background">

            {/* LEFT SIDE: Visual Carousel (50% Width on Desktop) */}
            <div className="hidden lg:flex w-1/2 relative flex-col bg-black text-white overflow-hidden border-r border-white/5">

                {/* Background Image Layer */}
                <div className="absolute inset-0 z-0">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentSlide}
                            initial={{ opacity: 0, scale: 1.1 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1.5 }}
                            className="absolute inset-0"
                        >
                            <Image
                                src={slides[currentSlide].image}
                                alt="Authentication background"
                                fill
                                className="object-cover"
                                priority
                            />
                            {/* Gradient Overlay for Text Readability */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Content Layer */}
                <div className="relative z-10 flex flex-col h-full p-12 justify-between">
                    {/* Logo */}
                    <div className="flex items-center gap-3 text-lg font-bold tracking-tight">
                        <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center shadow-lg">
                            <div className="w-4 h-4 bg-black rounded-sm" />
                        </div>
                        <span>Lumio Finance</span>
                    </div>

                    {/* Text Slider */}
                    <div className="max-w-md">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentSlide}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.5 }}
                                className="space-y-4"
                            >
                                <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight leading-none mb-4">
                                    {slides[currentSlide].title}
                                </h1>
                                <p className="text-lg text-white/80 leading-relaxed font-medium">
                                    {slides[currentSlide].description}
                                </p>
                            </motion.div>
                        </AnimatePresence>

                        {/* Dots Indicator */}
                        <div className="mt-8 flex gap-2">
                            {slides.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentSlide(index)}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${currentSlide === index ? 'w-8 bg-white' : 'w-2 bg-white/30 hover:bg-white/50'
                                        }`}
                                    aria-label={`Go to slide ${index + 1}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT SIDE: Login Form (50% Width on Desktop, 100% on Mobile) */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background relative z-20">
                <div className="w-full max-w-[400px] space-y-8 animate-in fade-in slide-in-from-right-8 duration-700">

                    {/* Header */}
                    <div className="flex flex-col space-y-2 text-center">
                        {/* Mobile Only Logo */}
                        <div className="lg:hidden flex justify-center mb-6">
                            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                                <div className="w-5 h-5 bg-primary-foreground rounded-sm" />
                            </div>
                        </div>

                        <h1 className="text-3xl font-bold tracking-tight">
                            Bienvenido
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Ingresa a tu cuenta para continuar
                        </p>
                    </div>

                    {/* Form */}
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="space-y-1">
                                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest pl-1">Email</p>
                                            <FormControl>
                                                <div className="relative group">
                                                    <Input
                                                        placeholder="nombre@ejemplo.com"
                                                        {...field}
                                                        className="h-12 bg-muted/30 border-input transition-all hover:bg-muted/50 focus:bg-background focus:border-primary px-4 rounded-xl text-base"
                                                    />
                                                </div>
                                            </FormControl>
                                        </div>
                                        <FormMessage className="text-xs font-medium text-destructive ml-1" />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="space-y-1">
                                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest pl-1">Contraseña</p>
                                            <FormControl>
                                                <div className="relative group">
                                                    <Input
                                                        type="password"
                                                        placeholder="••••••••"
                                                        {...field}
                                                        className="h-12 bg-muted/30 border-input transition-all hover:bg-muted/50 focus:bg-background focus:border-primary px-4 rounded-xl text-base"
                                                    />
                                                </div>
                                            </FormControl>
                                        </div>
                                        <FormMessage className="text-xs font-medium text-destructive ml-1" />
                                    </FormItem>
                                )}
                            />

                            <div className="flex items-center justify-between pt-2">
                                <FormField
                                    control={form.control}
                                    name="remember"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                    className="rounded-[4px] data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                                />
                                            </FormControl>
                                            <div className="leading-none">
                                                <label
                                                    htmlFor="remember"
                                                    className="text-sm font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
                                                >
                                                    Recordarme
                                                </label>
                                            </div>
                                        </FormItem>
                                    )}
                                />

                                <Link
                                    href="/forgot-password"
                                    className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors hover:underline underline-offset-4"
                                >
                                    ¿Olvidaste tu contraseña?
                                </Link>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-12 rounded-full font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-[0.98] transition-all text-base mt-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                                disabled={isLoading || isGoogleLoading}
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                    <span className="flex items-center justify-center gap-2">
                                        Iniciar Sesión <ArrowRight className="w-4 h-4 ml-1" />
                                    </span>
                                )}
                            </Button>
                        </form>
                    </Form>

                    <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-muted" />
                        </div>
                        <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
                            <span className="bg-background px-3 text-muted-foreground">
                                O continúa con
                            </span>
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        type="button"
                        disabled={isLoading || isGoogleLoading}
                        onClick={handleGoogleLogin}
                        className="w-full h-12 rounded-full border-input bg-background hover:bg-muted/50 transition-all font-semibold text-foreground active:scale-[0.98] flex items-center justify-center gap-3"
                    >
                        {isGoogleLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <svg className="h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                            </svg>
                        )}
                        Continuar con Google
                    </Button>

                    <p className="px-8 text-center text-sm text-muted-foreground">
                        ¿No tienes una cuenta?{" "}
                        <Link
                            href="/register"
                            className="text-primary font-bold hover:text-primary/80 transition-colors hover:underline underline-offset-4"
                        >
                            Crear cuenta
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
