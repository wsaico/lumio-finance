"use client"

import { DashboardGrid } from "@/components/dashboard/dashboard-grid"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Save, RotateCcw } from "lucide-react"

export default function DashboardDemoPage() {
    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Dashboard Interactivo</h1>
                    <p className="text-muted-foreground">Prueba el sistema de widgets drag-and-drop</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                        <RotateCcw className="w-4 h-4 mr-2" /> Restaurar
                    </Button>
                    <Button size="sm">
                        <Save className="w-4 h-4 mr-2" /> Guardar
                    </Button>
                </div>
            </div>

            <DashboardGrid />
        </div>
    )
}
