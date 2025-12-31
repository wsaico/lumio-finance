
"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Archive, ShoppingCart, User, Home, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

// Map of common icons to components
// In a real app we might load all lucide icons or use a dynamic icon component
const iconMap: Record<string, any> = {
    "archive": Archive,
    "shopping-cart": ShoppingCart,
    "user": User,
    "home": Home,
    // Add more default mappings
}

interface CategoryCardProps {
    category: {
        id: string
        name: string
        icon: string
        color: string
        type: 'EXPENSE' | 'INCOME'
    }
}

export function CategoryCard({ category }: CategoryCardProps) {
    // Fallback icon
    const Icon = iconMap[category.icon] || AlertCircle

    return (
        <Card className="overflow-hidden hover:shadow-md transition-all group">
            <CardContent className="p-4 flex items-center gap-4">
                <div
                    className="p-3 rounded-xl transition-transform group-hover:scale-110"
                    style={{
                        backgroundColor: `${category.color}20`, // 20% opacity background
                        color: category.color
                    }}
                >
                    <Icon className="h-6 w-6" />
                </div>
                <div>
                    <h3 className="font-semibold text-sm">{category.name}</h3>
                    <p className="text-xs text-muted-foreground capitalize">
                        {category.type === 'EXPENSE' ? 'Gasto' : 'Ingreso'}
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
