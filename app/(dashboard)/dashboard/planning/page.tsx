import { MonthlyPlanner } from "@/components/planning/monthly-planner"

export default function PlanningPage() {
    return (
        <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto pb-24">
            {/* Header removed to clean UI - Title is now inside MonthlyPlanner */}

            <MonthlyPlanner />
        </div>
    )
}
