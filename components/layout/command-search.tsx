"use client"

import * as React from "react"
import {
    Calculator,
    CreditCard,
    Settings,
    PlusCircle,
    BarChart3,
    ArrowRightLeft,
    Search,
    User,
    Palette,
    Sparkles,
    LayoutDashboard,
    Banknote,
    Target
} from "lucide-react"
import { useRouter } from "next/navigation"

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "@/components/ui/command"
import { parseSmartQuery, SearchResult } from "@/lib/search-parser"
import { cn } from "@/lib/utils"

export function CommandSearch({ children }: { children?: React.ReactNode }) {
    const [open, setOpen] = React.useState(false)
    const [query, setQuery] = React.useState("")
    const [smartResults, setSmartResults] = React.useState<SearchResult[]>([])
    const router = useRouter()

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }

        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    // Real-time NLP parsing
    React.useEffect(() => {
        if (query.length > 1) {
            const results = parseSmartQuery(query)
            setSmartResults(results)
        } else {
            setSmartResults([])
        }
    }, [query])

    const runCommand = React.useCallback((command: () => void) => {
        setOpen(false)
        command()
    }, [])

    return (
        <>
            {children ? (
                <div onClick={() => setOpen(true)}>{children}</div>
            ) : (
                <button
                    onClick={() => setOpen(true)}
                    className="relative flex h-10 w-full items-center justify-between rounded-xl border border-transparent bg-muted/50 px-3 py-2 text-sm text-muted-foreground hover:bg-muted/80 hover:border-border/50 transition-all md:w-[240px] lg:w-[320px] shadow-sm hover:shadow-md"
                >
                    <div className="flex items-center gap-2.5">
                        <Search className="h-4 w-4" />
                        <span className="hidden sm:inline-flex opacity-70">Buscar funciones...</span>
                        <span className="sm:hidden opacity-70">Buscar...</span>
                    </div>
                    <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex shadow-sm">
                        <span className="text-xs">⌘</span>K
                    </kbd>
                </button>
            )}
            <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
                <CommandInput
                    placeholder="Escribe una función (ej: 'Nuevo Gasto', 'Reportes')..."
                    value={query}
                    onValueChange={setQuery}
                />
                <CommandList className="scrollbar-none">
                    <CommandEmpty>
                        <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                            <Search className="h-8 w-8 mb-2 opacity-20" />
                            <p>No encontré esa función.</p>
                            <p className="text-xs">Prueba con &quot;Gasto&quot;, &quot;Metas&quot; o &quot;Ajustes&quot;</p>
                        </div>
                    </CommandEmpty>

                    {/* --- FUNCIONES DETECTADAS --- */}
                    {smartResults.length > 0 && (
                        <CommandGroup heading="Funciones del Sistema">
                            {smartResults.map((result) => (
                                <CommandItem
                                    key={result.id}
                                    onSelect={() => runCommand(() => router.push(result.url))}
                                    className="group aria-selected:bg-primary/10 aria-selected:text-primary"
                                >
                                    <div className={cn(
                                        "flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 mr-3 text-primary transition-all group-aria-selected:bg-primary group-aria-selected:text-primary-foreground group-aria-selected:scale-110",
                                        result.type === 'ACTION' ? "bg-orange-500/10 text-orange-500 group-aria-selected:bg-orange-500" : ""
                                    )}>
                                        {result.type === 'ACTION' ? <PlusCircle className="h-4 w-4" /> : <LayoutDashboard className="h-4 w-4" />}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-semibold">{result.title}</span>
                                        <span className="text-[10px] text-muted-foreground group-aria-selected:text-primary/70">{result.subtitle}</span>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}

                    {!query && (
                        <CommandGroup heading="Accesos Rápidos">
                            <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/transactions?new=true"))}>
                                <PlusCircle className="mr-2 h-4 w-4 text-primary" />
                                <span>Nueva Transacción</span>
                                <CommandShortcut>N</CommandShortcut>
                            </CommandItem>
                            <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/ai/scanning"))}>
                                <Sparkles className="mr-2 h-4 w-4 text-violet-500" />
                                <span>Escanear con IA</span>
                            </CommandItem>
                        </CommandGroup>
                    )}

                    <CommandSeparator />

                    <CommandGroup heading="Navegación">
                        {[
                            { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
                            { href: "/dashboard/transactions", icon: ArrowRightLeft, label: "Transacciones" },
                            { href: "/dashboard/budgets", icon: Calculator, label: "Presupuestos" },
                            { href: "/dashboard/savings-goals", icon: Target, label: "Metas de Ahorro" },
                            { href: "/dashboard/reports", icon: BarChart3, label: "Informes" },
                        ].filter(item => !query || item.label.toLowerCase().includes(query.toLowerCase())).map((item) => (
                            <CommandItem key={item.href} onSelect={() => runCommand(() => router.push(item.href))}>
                                <item.icon className="mr-2 h-4 w-4" />
                                <span>{item.label}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>

                    <CommandSeparator />

                    <CommandGroup heading="Configuración">
                        {[
                            { href: "/dashboard/settings", icon: Settings, label: "Ajustes Generales" },
                            { href: "/dashboard/settings?tab=appearance", icon: Palette, label: "Tema y Apariencia" },
                            { href: "/dashboard/settings?tab=data", icon: User, label: "Mi Perfil" },
                        ].filter(item => !query || item.label.toLowerCase().includes(query.toLowerCase())).map((item) => (
                            <CommandItem key={item.href} onSelect={() => runCommand(() => router.push(item.href))}>
                                <item.icon className="mr-2 h-4 w-4" />
                                <span>{item.label}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </CommandList>
            </CommandDialog>
        </>
    )
}
