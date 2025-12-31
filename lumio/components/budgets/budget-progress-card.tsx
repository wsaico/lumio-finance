
"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ShoppingCart, Car, Film, AlertTriangle } from "lucide-react"

// Mock icon map
const iconMap: any = { 'shopping-cart': ShoppingCart, 'car': Car, 'film': Film }

interface BudgetProgressCardProps {
    item: {
        name: string
        budgeted: number
        actual: number
        color: string
        icon: string
    }
}

export function BudgetProgressCard({ item }: BudgetProgressCardProps) {
    const percentage = Math.min((item.actual / item.budgeted) * 100, 100)
    const isOverBudget = item.actual > item.budgeted
    const Icon = iconMap[item.icon] || ShoppingCart

    return (
        <Card className={`border-l-4 ${isOverBudget ? 'border-l-destructive' : 'border-l-primary'}`}>
            <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-muted rounded-full">
                            <Icon className="h-4 w-4 opacity-70" />
                        </div>
                        <span className="font-medium">{item.name}</span>
                    </div>
                    <div className="text-right">
                        <p className="font-bold">
                            ${item.actual} <span className="text-muted-foreground font-normal text-xs">/ ${item.budgeted}</span>
                        </p>
                    </div>
                </div>

                <div className="space-y-1">
                    <Progress value={percentage} className="h-2" indicatorColor={item.color} />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>{percentage.toFixed(0)}% Utilizado</span>
                        {isOverBudget && <span className="text-destructive font-bold flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Sobregiro</span>}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
