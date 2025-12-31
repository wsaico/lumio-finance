
"use client";

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Check, ArrowRight, Sparkles, Coins, DollarSign, ListFilter, Target } from "lucide-react"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"

import { BudgetingMethod } from "@/types/budget-methodology"

// Mockup types for categories (in real app, fetch from API)
interface SimpleCategory {
    id: string
    name: string
    budgetRule: 'NEED' | 'WANT' | 'SAVINGS'
}

export function BudgetMethodologyWizard({ shouldShow = false }: { shouldShow?: boolean }) {
    const [open, setOpen] = useState(false)
    const [step, setStep] = useState<'SELECTION' | 'INCOME' | 'CATEGORY_REVIEW' | 'GOAL_CREATION'>('SELECTION')
    const [selectedMethod, setSelectedMethod] = useState<BudgetingMethod | null>(null)
    const [loading, setLoading] = useState(false)
    const [selectedGoalType, setSelectedGoalType] = useState<'EMERGENCY' | 'INVESTMENT' | null>(null)
    const [monthlyIncome, setMonthlyIncome] = useState<string>("")
    const [targetAmount, setTargetAmount] = useState<string>("1000")

    // Categories state for the review step
    const [categories, setCategories] = useState<SimpleCategory[]>([])
    const router = useRouter()

    useEffect(() => {
        const hasSeenLocal = localStorage.getItem('lumio_onboarding_seen')
        if (shouldShow && !hasSeenLocal) {
            setOpen(true)
            // Fetch categories when opening to be ready
            fetchCategories()
        }
    }, [shouldShow])

    // Fetch user categories to configure
    const fetchCategories = async () => {
        try {
            const res = await fetch('/api/categories?type=EXPENSE')
            if (res.ok) {
                const data = await res.json()
                // Map from the 'expense' property of the structured response
                const expenseCategories = data.expense || []
                setCategories(expenseCategories.map((c: any) => ({
                    id: c.id,
                    name: c.name,
                    budgetRule: c.budget_rule || c.budgetRule || 'WANT'
                })))
            }
        } catch (error) {
            console.error("Failed to fetch categories", error)
        }
    }

    const handleNext = async () => {
        if (!selectedMethod) return

        if (selectedMethod === '50_30_20') {
            if (step === 'SELECTION') {
                setStep('INCOME')
            } else if (step === 'INCOME') {
                // Auto-calculate suggested savings goal based on 20% of income
                const income = parseFloat(monthlyIncome) || 0
                if (income > 0) {
                    setTargetAmount(String(Math.round(income * 0.2)))
                }
                setStep('CATEGORY_REVIEW')
            } else if (step === 'CATEGORY_REVIEW') {
                // Save category rules to backend
                await saveCategoryRules()
                setStep('GOAL_CREATION')
            }
        } else {
            // Traditional skips configuration for now
            saveAndClose()
        }
    }

    const saveCategoryRules = async () => {
        setLoading(true)
        try {
            // We'll update them one by one or batch if API supported it.
            // For now, let's assume we iterate. In production, use a batch endpoint.
            const updates = categories.map(cat =>
                fetch(`/api/categories?id=${cat.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ budgetRule: cat.budgetRule })
                })
            )
            await Promise.all(updates)
        } catch (error) {
            console.error("Error saving categories", error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreateGoal = async () => {
        if (!selectedGoalType) return

        try {
            setLoading(true)

            // 1. Create the Goal
            const finalAmount = parseFloat(targetAmount) || 1000

            const goalData = selectedGoalType === 'EMERGENCY'
                ? {
                    name: "Fondo de Libertad (Emergencia)",
                    target_amount: finalAmount,
                    goal_type: "EMERGENCY",
                    description: "Mi primer fondo de seguridad creado con la regla 50/30/20.",
                    target_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString()
                }
                : {
                    name: "Primera Inversión",
                    target_amount: finalAmount,
                    goal_type: "INVESTMENT",
                    description: "Capital semilla para construir patrimonio.",
                    target_date: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString()
                }

            await fetch('/api/savings-goals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(goalData)
            })

            // 2. Save Preferences & Close
            await saveAndClose()

        } catch (error) {
            console.error("Failed to create quick goal", error)
            setLoading(false)
        }
    }

    async function saveAndClose() {
        try {
            setLoading(true)
            const res = await fetch('/api/user/preferences', {
                method: 'PATCH',
                body: JSON.stringify({ budgeting_method: selectedMethod })
            })

            if (!res.ok) throw new Error('Failed to save')

            localStorage.setItem('lumio_onboarding_seen', 'true')
            setOpen(false)
            router.refresh()
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    // Helper to toggle category rule
    const toggleCategoryRule = (id: string) => {
        setCategories(prev => prev.map(c => {
            if (c.id === id) {
                return { ...c, budgetRule: c.budgetRule === 'NEED' ? 'WANT' : 'NEED' }
            }
            return c
        }))
    }

    if (loading && !open) return null

    return (
        <Dialog open={open} onOpenChange={(val) => { if (!val && selectedMethod) setOpen(false) }}>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden gap-0 border-none shadow-2xl">
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 pb-8 border-b border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle className="text-2xl flex items-center gap-2 text-white">
                            <Sparkles className="w-5 h-5 text-amber-400 fill-amber-400" />
                            {step === 'SELECTION' && 'Bienvenido a Lumio'}
                            {step === 'INCOME' && 'Tus Ingresos'}
                            {step === 'CATEGORY_REVIEW' && 'Clasifica tus Gastos'}
                            {step === 'GOAL_CREATION' && 'Tu Primera Meta'}
                        </DialogTitle>
                        <DialogDescription className="text-slate-300 text-base mt-2">
                            {step === 'SELECTION' && 'Elige el sistema financiero que mejor se adapte a ti.'}
                            {step === 'INCOME' && 'Para darte los mejores consejos, necesitamos una base.'}
                            {step === 'CATEGORY_REVIEW' && 'Define qué es indispensable para ti y qué es un gusto.'}
                            {step === 'GOAL_CREATION' && 'Ponle nombre a ese 20% de tus ingresos.'}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Stepper Dots */}
                    {selectedMethod === '50_30_20' && (
                        <div className="flex items-center gap-2 mt-6 justify-center">
                            <div className={cn("h-1.5 rounded-full transition-all duration-300", step === 'SELECTION' ? "w-8 bg-amber-400" : "w-1.5 bg-white/20")} />
                            <div className={cn("h-1.5 rounded-full transition-all duration-300", step === 'INCOME' ? "w-8 bg-amber-400" : "w-1.5 bg-white/20")} />
                            <div className={cn("h-1.5 rounded-full transition-all duration-300", step === 'CATEGORY_REVIEW' ? "w-8 bg-amber-400" : "w-1.5 bg-white/20")} />
                            <div className={cn("h-1.5 rounded-full transition-all duration-300", step === 'GOAL_CREATION' ? "w-8 bg-amber-400" : "w-1.5 bg-white/20")} />
                        </div>
                    )}
                </div>

                <div className="p-6 bg-background min-h-[400px]">
                    {step === 'SELECTION' && (
                        <div className="grid gap-6">
                            {/* OPTION 1: 50/30/20 */}
                            <Card
                                className={cn(
                                    "relative cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md border-2",
                                    selectedMethod === '50_30_20' ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"
                                )}
                                onClick={() => setSelectedMethod('50_30_20')}
                            >
                                {selectedMethod === '50_30_20' && (
                                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                                        <Check className="w-4 h-4" />
                                    </div>
                                )}
                                <div className="absolute -top-3 left-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                                    Recomendado
                                </div>

                                <CardContent className="p-4 pt-5">
                                    <h3 className="font-bold text-lg flex items-center gap-2 mb-2">
                                        Regla 50/30/20
                                    </h3>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        El sistema probado para equilibrar tu vida financiera sin sacrificar lo que amas.
                                    </p>
                                    <div className="flex flex-wrap gap-2 text-xs font-medium">
                                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100">50% Necesidades</Badge>
                                        <Badge variant="secondary" className="bg-purple-100 text-purple-700 hover:bg-purple-100">30% Deseos</Badge>
                                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">20% Futuro</Badge>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* OPTION 2: TRADITIONAL */}
                            <Card
                                className={cn(
                                    "relative cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md border-2",
                                    selectedMethod === 'TRADITIONAL' ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"
                                )}
                                onClick={() => setSelectedMethod('TRADITIONAL')}
                            >
                                {selectedMethod === 'TRADITIONAL' && (
                                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                                        <Check className="w-4 h-4" />
                                    </div>
                                )}
                                <CardContent className="p-4">
                                    <h3 className="font-bold text-lg flex items-center gap-2 mb-2">
                                        <Coins className="w-4 h-4 text-muted-foreground" />
                                        Estilo Libre
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        Tú defines las reglas. Crea presupuestos individuales según necesites.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {step === 'INCOME' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="text-center space-y-4">
                                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                                    <DollarSign className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-bold">¿Cuál es tu ingreso mensual estimado?</h3>
                                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                                    Usaremos esto para calcular tus montos ideales (no te preocupes, puedes ajustarlo luego).
                                </p>
                            </div>

                            <div className="max-w-xs mx-auto">
                                <Label htmlFor="income" className="sr-only">Ingreso Mensual</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">S/</span>
                                    <Input
                                        id="income"
                                        type="number"
                                        placeholder="0.00"
                                        className="pl-9 h-14 text-lg font-bold"
                                        value={monthlyIncome}
                                        onChange={(e) => setMonthlyIncome(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="bg-muted/30 p-4 rounded-lg text-xs text-center text-muted-foreground">
                                Solo tú puedes ver esta información.
                            </div>
                        </div>
                    )}

                    {step === 'CATEGORY_REVIEW' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col h-full">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-lg font-bold">Clasificación de Gastos</h3>
                                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                    {categories.length} Categorías
                                </span>
                            </div>

                            <p className="text-sm text-muted-foreground mb-4">
                                Revisa si nuestras sugerencias son correctas. ¿Es una necesidad o un deseo?
                            </p>

                            <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-2 max-h-[300px] custom-scrollbar">
                                {categories.map(cat => (
                                    <div key={cat.id} className="flex items-center justify-between p-3 rounded-xl border bg-card hover:bg-muted/20 transition-colors">
                                        <span className="font-medium text-sm">{cat.name}</span>
                                        <div className="flex items-center bg-muted p-1 rounded-lg">
                                            <button
                                                onClick={() => cat.budgetRule !== 'NEED' && toggleCategoryRule(cat.id)}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-md text-xs font-bold transition-all",
                                                    cat.budgetRule === 'NEED'
                                                        ? "bg-white shadow-sm text-blue-600"
                                                        : "text-muted-foreground hover:text-foreground"
                                                )}
                                            >
                                                Necesidad
                                            </button>
                                            <button
                                                onClick={() => cat.budgetRule !== 'WANT' && toggleCategoryRule(cat.id)}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-md text-xs font-bold transition-all",
                                                    cat.budgetRule !== 'NEED'
                                                        ? "bg-white shadow-sm text-purple-600"
                                                        : "text-muted-foreground hover:text-foreground"
                                                )}
                                            >
                                                Deseo
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 'GOAL_CREATION' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="text-center">
                                <h3 className="text-xl font-bold mb-2">¡Último paso!</h3>
                                <p className="text-sm text-muted-foreground">
                                    La magia del 50/30/20 es que siempre te pagas a ti mismo primero.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Card
                                    className={cn(
                                        "cursor-pointer transition-all text-center p-4 border-2 bg-muted/30 relative hover:shadow-md",
                                        selectedGoalType === 'EMERGENCY' ? "border-emerald-500 bg-emerald-500/5" : "border-transparent hover:border-emerald-500/30"
                                    )}
                                    onClick={() => setSelectedGoalType('EMERGENCY')}
                                >
                                    {selectedGoalType === 'EMERGENCY' && <div className="absolute top-2 right-2 text-emerald-500"><Check className="w-4 h-4" /></div>}
                                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">🛡️</div>
                                    <h4 className="font-bold text-sm mb-1">Fondo de Seguridad</h4>
                                    <p className="text-xs text-muted-foreground">Imprevistos y emergencias</p>
                                </Card>

                                <Card
                                    className={cn(
                                        "cursor-pointer transition-all text-center p-4 border-2 bg-muted/30 relative hover:shadow-md",
                                        selectedGoalType === 'INVESTMENT' ? "border-purple-500 bg-purple-500/5" : "border-transparent hover:border-purple-500/30"
                                    )}
                                    onClick={() => setSelectedGoalType('INVESTMENT')}
                                >
                                    {selectedGoalType === 'INVESTMENT' && <div className="absolute top-2 right-2 text-purple-500"><Check className="w-4 h-4" /></div>}
                                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">📈</div>
                                    <h4 className="font-bold text-sm mb-1">Inversión / Libertad</h4>
                                    <p className="text-xs text-muted-foreground">Crecimiento de patrimonio</p>
                                </Card>
                            </div>

                            {selectedGoalType && (
                                <div className="bg-slate-50 dark:bg-zinc-900 p-4 rounded-xl space-y-3 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-xs font-bold text-muted-foreground uppercase">Meta Sugerida (20%)</Label>
                                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                                            Recomendado
                                        </span>
                                    </div>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500">S/</span>
                                        <Input
                                            type="number"
                                            value={targetAmount}
                                            onChange={(e) => setTargetAmount(e.target.value)}
                                            className="pl-8 font-bold"
                                        />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">
                                        Basado en tu ingreso de S/ {monthlyIncome || '0'}, deberías ahorrar esto mensualmente.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="p-6 bg-muted/10 border-t">
                    {(step === 'INCOME' || step === 'CATEGORY_REVIEW' || step === 'GOAL_CREATION') && (
                        <Button variant="ghost" onClick={() => {
                            if (step === 'INCOME') setStep('SELECTION')
                            if (step === 'CATEGORY_REVIEW') setStep('INCOME')
                            if (step === 'GOAL_CREATION') setStep('CATEGORY_REVIEW')
                        }}>
                            Atrás
                        </Button>
                    )}

                    <Button
                        size="lg"
                        disabled={!selectedMethod || loading || (step === 'INCOME' && !monthlyIncome)}
                        onClick={
                            step === 'SELECTION'
                                ? handleNext
                                : step === 'INCOME'
                                    ? handleNext
                                    : step === 'CATEGORY_REVIEW'
                                        ? handleNext
                                        : step === 'GOAL_CREATION'
                                            ? handleCreateGoal
                                            : saveAndClose
                        }
                        className={cn(
                            "w-full md:w-auto font-bold rounded-xl",
                            step === 'GOAL_CREATION' && !selectedGoalType ? 'hidden' : ''
                        )}
                    >
                        {loading
                            ? <span className="flex items-center gap-2">Configurando...</span>
                            : step === 'GOAL_CREATION'
                                ? 'Finalizar y Crear Meta'
                                : 'Continuar'
                        }
                        {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
