
"use client"

import { useSavingsGoals } from "@/hooks/useSavingsGoals"
import { SavingsGoalCard } from "@/components/savings/savings-goal-card"
import { Button } from "@/components/ui/button"
import { Plus, Loader2 } from "lucide-react"
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/fade-in"

export default function SavingsGoalsPage() {
    const { data: goals, isLoading } = useSavingsGoals()

    return (
        <FadeIn className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Metas de Ahorro</h2>
                    <p className="text-muted-foreground">
                        Visualiza tus objetivos y persigue tus sueños.
                    </p>
                </div>
                <Button className="gap-2">
                    <Plus className="h-4 w-4" /> Nueva Meta
                </Button>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
            ) : (
                <StaggerContainer className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {goals?.map((goal: any) => (
                        <StaggerItem key={goal.id}>
                            <SavingsGoalCard goal={goal} />
                        </StaggerItem>
                    ))}
                    {!goals?.length && (
                        <div className="col-span-full text-center p-8 border rounded-xl border-dashed">
                            <p className="text-muted-foreground">No tienes metas activas. ¡Crea una para empezar!</p>
                        </div>
                    )}
                </StaggerContainer>
            )}
        </FadeIn>
    )
}
