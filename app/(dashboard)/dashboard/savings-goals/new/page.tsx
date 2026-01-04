"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, ArrowRight, Check, Target, Plane, Car, Home, GraduationCap, Heart, Sparkles } from "lucide-react"
import { useCreateSavingsGoal } from "@/hooks/use-savings-goals"
import { useAccounts } from "@/hooks/use-accounts"
import { cn } from "@/lib/utils"
import confetti from "canvas-confetti"

const GOAL_TEMPLATES = [
    {
        id: 'emergency',
        name: 'Fondo de Emergencia',
        icon: Target,
        color: '#ef4444',
        type: 'EMERGENCY',
        priority: 'HIGH',
        description: 'Ahorro para imprevistos y emergencias',
        suggestedAmount: 10000,
        suggestedMonths: 12
    },
    {
        id: 'travel',
        name: 'Vacaciones',
        icon: Plane,
        color: '#3b82f6',
        type: 'TRAVEL',
        priority: 'MEDIUM',
        description: 'Viaje soñado',
        suggestedAmount: 8000,
        suggestedMonths: 8
    },
    {
        id: 'car',
        name: 'Auto',
        icon: Car,
        color: '#8b5cf6',
        type: 'PURCHASE',
        priority: 'MEDIUM',
        description: 'Compra de vehículo',
        suggestedAmount: 30000,
        suggestedMonths: 24
    },
    {
        id: 'house',
        name: 'Casa (Inicial)',
        icon: Home,
        color: '#10b981',
        type: 'PURCHASE',
        priority: 'HIGH',
        description: 'Cuota inicial para vivienda',
        suggestedAmount: 80000,
        suggestedMonths: 36
    },
    {
        id: 'education',
        name: 'Educación',
        icon: GraduationCap,
        color: '#f59e0b',
        type: 'INVESTMENT',
        priority: 'HIGH',
        description: 'Estudios o capacitación',
        suggestedAmount: 15000,
        suggestedMonths: 18
    },
    {
        id: 'custom',
        name: 'Personalizada',
        icon: Heart,
        color: '#ec4899',
        type: 'OTHER',
        priority: 'MEDIUM',
        description: 'Meta personalizada',
        suggestedAmount: 5000,
        suggestedMonths: 6
    }
]

export default function NewSavingsGoalPage() {
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        goalType: 'OTHER' as const,
        priority: 'MEDIUM' as const,
        targetAmount: 0,
        targetDate: '',
        primaryAccountId: null as string | null,
        icon: 'target',
        color: '#f97316'
    })

    const { mutate: createGoal, isPending } = useCreateSavingsGoal()
    const { accounts } = useAccounts()

    const handleTemplateSelect = (templateId: string) => {
        const template = GOAL_TEMPLATES.find(t => t.id === templateId)
        if (!template) return

        setSelectedTemplate(templateId)

        // Calculate target date
        const targetDate = new Date()
        targetDate.setMonth(targetDate.getMonth() + template.suggestedMonths)

        setFormData({
            name: template.name,
            description: template.description,
            goalType: template.type,
            priority: template.priority,
            targetAmount: template.suggestedAmount,
            targetDate: targetDate.toISOString().split('T')[0],
            primaryAccountId: null,
            icon: template.id,
            color: template.color
        })

        setStep(2)
    }

    const handleSubmit = () => {
        createGoal(formData, {
            onSuccess: (data) => {
                // Confetti celebration
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                })

                setTimeout(() => {
                    router.push(`/dashboard/savings-goals/${data.goal.id}`)
                }, 1500)
            }
        })
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-zinc-950 dark:to-zinc-900">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-lg border-b border-border/40 px-4 py-3 flex items-center gap-3">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => step === 1 ? router.back() : setStep(step - 1)}
                    className="rounded-full w-10 h-10"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-lg font-bold">Nueva Meta de Ahorro</h1>
                    <p className="text-xs text-muted-foreground">
                        Paso {step} de 3
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto p-6 md:p-12">
                {/* Step 1: Template Selection */}
                {step === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="text-center mb-8">
                            <h2 className="text-4xl font-black mb-3">¿Qué quieres lograr?</h2>
                            <p className="text-lg text-muted-foreground">
                                Elige una plantilla o crea una meta personalizada
                            </p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {GOAL_TEMPLATES.map((template) => {
                                const Icon = template.icon
                                return (
                                    <Card
                                        key={template.id}
                                        className={cn(
                                            "p-6 cursor-pointer transition-all hover:shadow-lg hover:scale-105",
                                            selectedTemplate === template.id && "ring-2 ring-orange-500"
                                        )}
                                        onClick={() => handleTemplateSelect(template.id)}
                                    >
                                        <div
                                            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 mx-auto"
                                            style={{ backgroundColor: `${template.color}20` }}
                                        >
                                            <Icon className="w-8 h-8" style={{ color: template.color }} />
                                        </div>
                                        <h3 className="font-bold text-center mb-2">{template.name}</h3>
                                        <p className="text-sm text-muted-foreground text-center mb-3">
                                            {template.description}
                                        </p>
                                        <div className="text-xs text-center text-muted-foreground">
                                            Sugerido: S/ {template.suggestedAmount.toLocaleString()} en {template.suggestedMonths} meses
                                        </div>
                                    </Card>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Step 2: Details */}
                {step === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="text-center mb-8">
                            <h2 className="text-4xl font-black mb-3">Detalles de tu Meta</h2>
                            <p className="text-lg text-muted-foreground">
                                Personaliza tu objetivo de ahorro
                            </p>
                        </div>

                        <Card className="p-6 space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nombre de la Meta *</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ej: Viaje a Europa"
                                    className="text-lg"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Descripción (opcional)</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="¿Qué te motiva a ahorrar para esto?"
                                    rows={3}
                                />
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="targetAmount">Monto Objetivo (S/) *</Label>
                                    <Input
                                        id="targetAmount"
                                        type="number"
                                        value={formData.targetAmount || ''}
                                        onChange={(e) => setFormData({ ...formData, targetAmount: parseFloat(e.target.value) || 0 })}
                                        placeholder="10000"
                                        className="text-lg font-mono"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="targetDate">Fecha Objetivo *</Label>
                                    <Input
                                        id="targetDate"
                                        type="date"
                                        value={formData.targetDate}
                                        onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="priority">Prioridad</Label>
                                <Select
                                    value={formData.priority}
                                    onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="HIGH">Alta</SelectItem>
                                        <SelectItem value="MEDIUM">Media</SelectItem>
                                        <SelectItem value="LOW">Baja</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex gap-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setStep(1)}
                                    className="flex-1"
                                >
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Atrás
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => setStep(3)}
                                    disabled={!formData.name || !formData.targetAmount || !formData.targetDate}
                                    className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                                >
                                    Continuar
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </Card>
                    </div>
                )}

                {/* Step 3: Account & Review */}
                {step === 3 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="text-center mb-8">
                            <h2 className="text-4xl font-black mb-3">Vincular Cuenta</h2>
                            <p className="text-lg text-muted-foreground">
                                Opcional: Vincula una cuenta de ahorros
                            </p>
                        </div>

                        <Card className="p-6 space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="account">Cuenta de Ahorros (opcional)</Label>
                                <Select
                                    value={formData.primaryAccountId || 'none'}
                                    onValueChange={(value) => setFormData({ ...formData, primaryAccountId: value === 'none' ? null : value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sin vincular" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Sin vincular</SelectItem>
                                        {accounts.map((account: any) => (
                                            <SelectItem key={account.id} value={account.id}>
                                                {account.name} - S/ {Number(account.currentBalance).toFixed(2)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Puedes vincular una cuenta para rastrear el dinero físico
                                </p>
                            </div>

                            {/* Review */}
                            <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                                <h3 className="font-bold">Resumen de tu Meta</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Nombre:</span>
                                        <span className="font-medium">{formData.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Monto:</span>
                                        <span className="font-medium">S/ {formData.targetAmount.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Fecha:</span>
                                        <span className="font-medium">{new Date(formData.targetDate).toLocaleDateString('es-PE')}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Prioridad:</span>
                                        <span className="font-medium">
                                            {formData.priority === 'HIGH' ? 'Alta' : formData.priority === 'MEDIUM' ? 'Media' : 'Baja'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setStep(2)}
                                    className="flex-1"
                                >
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Atrás
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={isPending}
                                    className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                                >
                                    {isPending ? (
                                        <>Creando...</>
                                    ) : (
                                        <>
                                            <Check className="mr-2 h-4 w-4" />
                                            Crear Meta
                                        </>
                                    )}
                                </Button>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    )
}
