import { ExpertFinancialDashboard } from "@/components/reports/financial-expert-dashboard"

export default function ReportsPage() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    Inteligencia Financiera
                </h2>
                <p className="text-muted-foreground text-sm font-medium">
                    Análisis experto de tus hábitos, flujos y salud patrimonial.
                </p>
            </div>

            <ExpertFinancialDashboard />
        </div>
    )
}
