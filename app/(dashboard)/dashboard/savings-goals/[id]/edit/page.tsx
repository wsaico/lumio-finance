"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Save } from "lucide-react"
import { useSavingsGoal, useUpdateSavingsGoal } from "@/hooks/useSavingsGoals"
import { useAccounts } from "@/hooks/useAccounts"

export default function EditGoalPage() {
    const params = useParams()
    const router = useRouter()
    const goalId = params.id as string

    const { data: goalData, isLoading } = useSavingsGoal(goalId)
    const { mutate: updateGoal, isPending } = useUpdateSavingsGoal()
    const { accounts } = useAccounts()

    const goal = goalData

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        priority: 'MEDIUM' as const,
        targetAmount: 0,
        targetDate: '',
        primaryAccountId: null as string | null
    })

    // Initialize form when goal loads
    useEffect(() => {
        if (goal) {
            setFormData({
                name: goal.name || '',
                description: goal.description || '',
                priority: goal.priority || 'MEDIUM',
                targetAmount: Number(goal.target_amount) || 0,
                targetDate: goal.target_date || '',
                primaryAccountId: goal.primary_account_id || null
            })
        }
    }, [goal])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        updateGoal({
            id: goalId,
            ...formData
        }, {
            onSuccess: () => {
                router.push(`/dashboard/savings-goals/${goalId}`)
            }
        })
    }

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
        )
    }

    if (!goal) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">Meta no encontrada</p>
                <Button onClick={() => router.back()} className="mt-4">
                    Volver
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.back()}
                    className="rounded-full"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold">Editar Meta</h1>
                    <p className="text-muted-foreground">Actualiza los detalles de tu meta de ahorro</p>
                </div>
            </div>

            {/* Form */}
            <Card className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nombre de la Meta *</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Ej: Viaje a Europa"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Descripción</Label>
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
                                step="0.01"
                                value={formData.targetAmount || ''}
                                onChange={(e) => setFormData({ ...formData, targetAmount: parseFloat(e.target.value) || 0 })}
                                placeholder="10000"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="targetDate">Fecha Objetivo *</Label>
                            <Input
                                id="targetDate"
                                type="date"
                                value={formData.targetDate}
                                onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                                required
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

                    <div className="space-y-2">
                        <Label htmlFor="account">Cuenta Vinculada</Label>
                        <Select
                            value={formData.primaryAccountId || 'none'}
                            onValueChange={(value) => setFormData({ ...formData, primaryAccountId: value === 'none' ? null : value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Sin vincular" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Sin vincular</SelectItem>
                                {accounts?.map((account: any) => (
                                    <SelectItem key={account.id} value={account.id}>
                                        {account.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex gap-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.back()}
                            className="flex-1"
                            disabled={isPending}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isPending || !formData.name || !formData.targetAmount || !formData.targetDate}
                            className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                        >
                            {isPending ? (
                                'Guardando...'
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Guardar Cambios
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    )
}
