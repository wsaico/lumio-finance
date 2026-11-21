import { MonthlyPlanner } from "@/components/planning/monthly-planner"
import { PremiumPreviewGate } from "@/components/billing/premium-preview-gate"

export default function PlanningPage() {
    return (
        <PremiumPreviewGate moduleName="Planificación y Suscripciones">
            <MonthlyPlanner />
        </PremiumPreviewGate>
    )
}
