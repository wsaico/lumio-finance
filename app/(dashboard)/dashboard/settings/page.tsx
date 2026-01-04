"use client"

import {
    Tags,
    Coins,
    Calculator,
    Monitor,
    DollarSign,
    PenTool,
    Sparkles,
    Palette,
    Moon,
    Sun,
    Monitor as MonitorIcon,
    Check,
    Type,
    ChevronRight
} from "lucide-react"

import {
    SettingsSection,
    SettingsRow,
    SettingsSelect,
    SettingsSwitch
} from "@/components/settings/settings-components"

import { useSettingsStore } from "@/hooks/use-settings-store"
import { useUser } from "@/hooks/use-user"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { BudgetingMethod } from "@/types/budget-methodology"
import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { createClient } from "@/lib/supabase/client"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { resetUserData } from "@/app/actions/settings/reset-data"
import { toast } from "sonner"
import { Trash2, AlertTriangle } from "lucide-react"

const ACCENT_COLORS = [
    { name: "Lumio Orange", value: "#E8572A" },
    { name: "Vibrant Violet", value: "#8B5CF6" },
    { name: "Sky Blue", value: "#0EA5E9" },
    { name: "Emerald Green", value: "#10B981" },
    { name: "Rose Pink", value: "#F43F5E" },
    { name: "Gold", value: "#F59E0B" },
]

const FONTS = [
    { name: "Geist", description: "Minimalista y técnico" },
    { name: "Inter", description: "Estándar moderno y legible" },
    { name: "Montserrat", description: "Geométrico y elegante" },
    { name: "Outfit", description: "Suave y contemporáneo" },
    { name: "Plus Jakarta Sans", description: "Dinámico y corporativo" },
    { name: "HONOR Sans", description: "Diseño premium de Honor" },
]



export default function SettingsPage() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const store = useSettingsStore()
    const { theme, setTheme } = useTheme()
    const { profile, mutateProfile } = useUser() // SWR Hook with Mutation

    // Get tab from URL or default to 'appearance'
    const currentTab = searchParams.get('tab') || 'appearance'

    const setTab = (value: string) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('tab', value)
        // Update URL without full reload
        router.push(`${pathname}?${params.toString()}`, { scroll: false })
    }

    const [mounted, setMounted] = useState(false)
    const [budgetMethod, setBudgetMethod] = useState<BudgetingMethod | null>(null)
    const [loadingMethod, setLoadingMethod] = useState(false)

    useEffect(() => {
        setMounted(true)
        fetch('/api/user/preferences')
            .then(res => res.json())
            .then(data => setBudgetMethod(data.budgeting_method))
            .catch(err => console.error(err))
    }, [])

    // ... (method checks)

    if (!mounted) return null

    return (
        <div className="container mx-auto max-w-4xl py-10 px-4 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">

            <Tabs value={currentTab} onValueChange={setTab} className="space-y-8">
                <TabsList className="bg-muted/50 p-1 border border-border/50 w-full md:w-fit justify-start h-auto flex-wrap gap-1">
                    <TabsTrigger value="appearance" className="gap-2 px-4 py-2">
                        <Palette className="h-4 w-4" />
                        <span className="text-xs uppercase font-bold tracking-tight">Apariencia</span>
                    </TabsTrigger>
                    <TabsTrigger value="regional" className="gap-2 px-4 py-2">
                        <Coins className="h-4 w-4" />
                        <span className="text-xs uppercase font-bold tracking-tight">Regional</span>
                    </TabsTrigger>
                    <TabsTrigger value="strategy" className="gap-2 px-4 py-2">
                        <Calculator className="h-4 w-4" />
                        <span className="text-xs uppercase font-bold tracking-tight">Estrategia</span>
                    </TabsTrigger>
                    <TabsTrigger value="data" className="gap-2 px-4 py-2">
                        <Tags className="h-4 w-4" />
                        <span className="text-xs uppercase font-bold tracking-tight">Datos</span>
                    </TabsTrigger>
                    <TabsTrigger value="ai" className="gap-2 px-4 py-2">
                        <Sparkles className="h-4 w-4" />
                        <span className="text-xs uppercase font-bold tracking-tight">IA</span>
                    </TabsTrigger>
                </TabsList>

                {/* --- APARIENCIA --- */}
                <TabsContent value="appearance" className="space-y-8 outline-none animate-in fade-in slide-in-from-left-2 duration-300">
                    <SettingsSection title="Personalización del Sistema">
                        <div className="grid gap-6 md:grid-cols-2 mt-2">
                            {/* Selector de Tema */}
                            <Card className="p-5 bg-card/40 backdrop-blur-sm border-border/50 space-y-4">
                                <div className="space-y-1">
                                    <h4 className="text-sm font-bold">Tema Principal</h4>
                                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Modo claro, oscuro o automático</p>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'light', icon: Sun, label: 'Claro' },
                                        { id: 'dark', icon: Moon, label: 'Oscuro' },
                                        { id: 'system', icon: MonitorIcon, label: 'Auto' },
                                    ].map((mode) => (
                                        <button
                                            key={mode.id}
                                            onClick={() => setTheme(mode.id)}
                                            className={cn(
                                                "flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all border",
                                                theme === mode.id
                                                    ? "border-primary bg-primary/10 text-primary shadow-sm"
                                                    : "border-transparent bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:border-border/50"
                                            )}
                                        >
                                            <mode.icon className="h-4 w-4" />
                                            <span className="text-[9px] font-bold uppercase">{mode.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </Card>

                            {/* Color de Realce */}
                            <Card className="p-5 bg-card/40 backdrop-blur-sm border-border/50 space-y-4">
                                <div className="space-y-1">
                                    <h4 className="text-sm font-bold">Color de Realce</h4>
                                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Identidad visual de botones y realces</p>
                                </div>
                                <div className="flex flex-wrap gap-2.5 pt-1">
                                    {ACCENT_COLORS.map((color) => (
                                        <button
                                            key={color.value}
                                            onClick={() => store.setAccentColor(color.value)}
                                            className={cn(
                                                "h-8 w-8 rounded-full transition-all flex items-center justify-center relative",
                                                "hover:scale-110 active:scale-95 shadow-sm border border-black/5",
                                                store.accentColor === color.value ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                                            )}
                                            style={{ backgroundColor: color.value }}
                                            title={color.name}
                                        >
                                            {store.accentColor === color.value && (
                                                <Check className="h-4 w-4 text-white" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </Card>

                            {/* Tipografía */}
                            <Card className="p-5 bg-card/40 backdrop-blur-sm border-border/50 space-y-4 md:col-span-2">
                                <div className="space-y-1">
                                    <h4 className="text-sm font-bold flex items-center gap-2">
                                        <Type className="h-4 w-4 text-primary" />
                                        Tipografía del Sistema
                                    </h4>
                                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Personaliza la fuente de texto de toda la plataforma</p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                                    {FONTS.map((font) => (
                                        <button
                                            key={font.name}
                                            onClick={() => store.setFontFamily(font.name)}
                                            className={cn(
                                                "flex flex-col items-start gap-1 p-4 rounded-xl transition-all border text-left group",
                                                store.fontFamily === font.name
                                                    ? "border-primary bg-primary/10 shadow-sm"
                                                    : "border-transparent bg-muted/20 hover:bg-muted/40 hover:border-border/50"
                                            )}
                                        >
                                            <div className="flex items-center justify-between w-full">
                                                <span className={cn(
                                                    "text-sm font-bold",
                                                    store.fontFamily === font.name ? "text-primary" : "text-foreground"
                                                )} style={{ fontFamily: `var(--font-${font.name.toLowerCase().replace(/\s+/g, '-')})` }}>
                                                    {font.name}
                                                </span>
                                                {store.fontFamily === font.name && (
                                                    <Check className="h-4 w-4 text-primary" />
                                                )}
                                            </div>
                                            <span className="text-[10px] text-muted-foreground font-medium line-clamp-1 group-hover:text-muted-foreground/80 transition-colors">
                                                {font.description}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </Card>
                        </div>
                    </SettingsSection>
                </TabsContent>

                {/* --- REGIONAL --- */}
                <TabsContent value="regional" className="space-y-6 outline-none animate-in fade-in slide-in-from-left-2 duration-300">
                    <SettingsSection title="Configuración Regional">
                        <SettingsRow
                            icon={Coins}
                            title="Tasas de Cambio"
                            description="Monitorea y actualiza los valores de conversión."
                            onClick={() => router.push('/dashboard/settings/exchange-rates')}
                        />
                        <SettingsRow
                            icon={DollarSign}
                            title="Divisa Principal"
                            description="Base monetaria para reportes consolidados."
                            action={
                                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                                    <span className="text-xs font-black">{store.currencyCode}</span>
                                </div>
                            }
                            onClick={() => router.push('/dashboard/settings/currency')}
                        />
                        <SettingsRow
                            icon={PenTool}
                            title="Formato Numérico"
                            description="Estilo de visualización para montos de dinero."
                            action={
                                <SettingsSelect
                                    value={store.numberFormat}
                                    onValueChange={(v: any) => store.setNumberFormat(v)}
                                    options={[
                                        { label: "S/. 1,234.56", value: "S/. 1,234.56" },
                                        { label: "S/. 1.234,56", value: "S/. 1.234,56" },
                                        { label: "1,234.56 S/.", value: "1,234.56 S/." },
                                    ]}
                                />
                            }
                        />
                    </SettingsSection>
                </TabsContent>

                {/* --- ESTRATEGIA --- */}
                <TabsContent value="strategy" className="space-y-6 outline-none animate-in fade-in slide-in-from-left-2 duration-300">
                    <SettingsSection title="Estrategia Financiera">

                        <SettingsRow
                            icon={Monitor}
                            title="Lógica de Presupuestos"
                            description={store.budgetTotalType === 'remaining' ? 'Priorizar saldo restante' : 'Priorizar gasto acumulado'}
                            action={
                                <SettingsSelect
                                    value={store.budgetTotalType}
                                    onValueChange={(v: any) => store.setBudgetTotalType(v)}
                                    options={[
                                        { label: "Saldo Restante", value: "remaining" },
                                        { label: "Total Gastado", value: "spent" },
                                    ]}
                                />
                            }
                        />
                    </SettingsSection>
                </TabsContent>

                {/* --- DATOS --- */}
                <TabsContent value="data" className="space-y-6 outline-none animate-in fade-in slide-in-from-left-2 duration-300">
                    <SettingsSection title="Perfil de Usuario">
                        <div className="flex flex-col md:flex-row gap-6 items-center md:items-start bg-card/40 p-6 rounded-2xl border border-border/50">
                            <div className="relative group">
                                <div className="h-24 w-24 rounded-full overflow-hidden border-4 border-background shadow-xl ring-2 ring-primary/20">
                                    {/* Real Avatar */}
                                    <Avatar className="h-full w-full">
                                        {/* Assuming store.user or similar exists, but we can fetch on client or use context. 
                                            For now, relying on basic img or local state if store isn't sync'd instantly */}
                                        <img
                                            src={profile?.avatar_url || "/placeholder-avatar.jpg"}
                                            onError={(e) => e.currentTarget.src = `https://ui-avatars.com/api/?name=Usuario&background=random`}
                                            alt="Avatar"
                                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                    </Avatar>
                                </div>
                                <label
                                    htmlFor="settings-avatar-upload"
                                    className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full shadow-lg hover:scale-110 transition-transform cursor-pointer flex items-center justify-center"
                                >
                                    {loadingMethod ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <PenTool className="h-4 w-4" />}
                                </label>
                                <input
                                    id="settings-avatar-upload"
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    disabled={loadingMethod}
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0]
                                        if (!file) return

                                        // 1. Upload Logic via Proxy API
                                        try {
                                            setLoadingMethod(true)

                                            const formData = new FormData()
                                            formData.append('file', file)

                                            const response = await fetch('/api/user/avatar', {
                                                method: 'POST',
                                                body: formData
                                            })

                                            const result = await response.json()

                                            if (!response.ok) {
                                                throw new Error(result.error || "Error al subir imagen")
                                            }

                                            toast.success("Foto de perfil actualizada", {
                                                description: "Los cambios se reflejarán en breve."
                                            })

                                            // Force refresh global state (Sidebar + this page)
                                            await mutateProfile()

                                            // Optional: router.refresh() if server components need it
                                            router.refresh()

                                        } catch (error: any) {
                                            toast.error("Error al subir imagen", {
                                                description: error.message
                                            })
                                        } finally {
                                            setLoadingMethod(false)
                                        }
                                    }}
                                />
                            </div>

                            <div className="space-y-4 flex-1 w-full text-center md:text-left">
                                <div>
                                    <h3 className="text-lg font-bold">Tu Foto de Perfil</h3>
                                    <p className="text-sm text-muted-foreground">Esta imagen se mostrará en tu barra lateral y en los comentarios.</p>
                                </div>
                                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                                    <label
                                        htmlFor="settings-avatar-upload"
                                        className="cursor-pointer px-4 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
                                    >
                                        <PenTool className="h-4 w-4" />
                                        Subir nueva imagen
                                    </label>
                                    <button
                                        className="px-4 py-2 bg-muted text-muted-foreground text-sm font-bold rounded-xl hover:bg-muted/80 transition-colors"
                                        onClick={() => toast.success("Avatar eliminado (simulado)")}
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        </div>

                        <SettingsRow
                            icon={Tags}
                            title="Nombre de Visualización"
                            description="Cómo te ven los demás usuarios."
                            action={
                                <div className="font-medium text-sm bg-muted/50 px-3 py-1.5 rounded-lg border border-border/50">
                                    {store.user?.full_name || 'Usuario'}
                                </div>
                            }
                            onClick={() => { }}
                        />
                    </SettingsSection>

                    <SettingsSection title="Gestión de Datos">
                        <SettingsRow
                            icon={Tags}
                            title="Administrar Categorías"
                            description="Configura tus etiquetas de ingresos y gastos."
                            onClick={() => router.push('/dashboard/settings/categories')}
                        />
                        <SettingsRow
                            icon={Monitor}
                            title="Modulos del Sistema"
                            description="Personaliza la visibilidad de herramientas."
                            onClick={() => router.push('/dashboard/settings/home')}
                        />
                    </SettingsSection>

                    <SettingsSection title="Zona de Peligro">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <div className="w-full">
                                    <SettingsRow
                                        icon={Trash2}
                                        title="Restablecer Datos"
                                        description="Elimina todas las transacciones, cuentas y presupuestos. Irreversible."
                                        variant="danger"
                                        action={
                                            <div className="px-3 py-1 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-bold">
                                                REQUIERE CONFIRMACIÓN
                                            </div>
                                        }
                                        onClick={() => { }} // Trigger controlled by AlertDialog
                                    />
                                </div>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="border-red-500/20">
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-red-500 flex items-center gap-2">
                                        <AlertTriangle className="h-5 w-5" />
                                        ¿Estás absolutamente seguro?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription className="space-y-3" asChild>
                                        <div>
                                            <p>
                                                Esta acción <strong>no se puede deshacer</strong>.
                                                Eliminará permanentemente:
                                            </p>
                                            <ul className="list-disc pl-5 space-y-1 text-xs">
                                                <li>Todas tus cuentas y saldos.</li>
                                                <li>Todas las transacciones históricas.</li>
                                                <li>Todos los presupuestos y metas de ahorro.</li>
                                                <li>Toda la configuración de análisis.</li>
                                            </ul>
                                            <p className="font-bold text-foreground">
                                                Tu configuración de perfil y categorías personalizadas SE MANTENDRÁN.
                                            </p>
                                        </div>
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={async (e) => {
                                            e.preventDefault() // Prevent auto-close to show loading state if needed, though here we just fire

                                            // Optional: Add simple loading state here if desired, but for now direct call
                                            const res = await resetUserData()
                                            if (res.success) {
                                                toast("Datos Eliminados", {
                                                    description: "Tu sistema ha sido reiniciado correctamente.",
                                                })
                                                window.location.href = '/dashboard' // Force hard reload/redirect
                                            } else {
                                                toast("Error", {
                                                    description: "No se pudieron eliminar los datos. Inténtalo de nuevo.",
                                                    action: { label: "Reintentar", onClick: () => resetUserData() }
                                                })
                                            }
                                        }}
                                        className="bg-red-500 hover:bg-red-600 text-white focus:ring-red-500"
                                    >
                                        Sí, eliminar todo
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </SettingsSection>
                </TabsContent>

                {/* --- IA --- */}
                <TabsContent value="ai" className="space-y-6 outline-none animate-in fade-in slide-in-from-left-2 duration-300">
                    <SettingsSection title="Inteligencia Artificial">
                        <SettingsRow
                            icon={Sparkles}
                            title="Análisis con Gemini"
                            description="Escaneo inteligente de recibos mediante visión IA."
                            action={
                                <SettingsSwitch
                                    checked={store.enableAIReceiptScanning}
                                    onCheckedChange={store.setEnableAIReceiptScanning}
                                />
                            }
                        />
                    </SettingsSection>
                </TabsContent>
            </Tabs>

            <div className="pt-20 text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
                    Lumio Finance &middot; Professional Suite v1.0.0
                </p>
            </div>
        </div>
    )
}
