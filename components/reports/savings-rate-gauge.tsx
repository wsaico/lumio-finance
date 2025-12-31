"use client"

import { cn } from "@/lib/utils"

interface SavingsRateGaugeProps {
    value: number
    className?: string
}

export function SavingsRateGauge({ value, className }: SavingsRateGaugeProps) {
    const radius = 80
    const circumference = 2 * Math.PI * radius
    const progress = Math.min(100, Math.max(0, value))
    const offset = circumference - (progress / 100) * circumference

    // Expert grading based on savings rate
    const getGrade = (rate: number) => {
        if (rate >= 20) return { label: 'Excelente', color: 'text-emerald-500', glow: 'shadow-emerald-500/20' }
        if (rate >= 10) return { label: 'Bueno', color: 'text-blue-500', glow: 'shadow-blue-500/20' }
        if (rate > 0) return { label: 'Mejorable', color: 'text-amber-500', glow: 'shadow-amber-500/20' }
        return { label: 'Crítico', color: 'text-rose-500', glow: 'shadow-rose-500/20' }
    }

    const grade = getGrade(value)

    return (
        <div className={cn("relative flex items-center justify-center p-4", className)}>
            <svg className="transform -rotate-90 w-48 h-48 drop-shadow-xl" viewBox="0 0 200 200">
                {/* Background Ring */}
                <circle
                    cx="100"
                    cy="100"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="transparent"
                    className="text-muted/10"
                />
                {/* Progress Ring */}
                <circle
                    cx="100"
                    cy="100"
                    r={radius}
                    stroke="url(#gauge-gradient)"
                    strokeWidth="12"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-1000 ease-out"
                />

                {/* Gradients */}
                <defs>
                    <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={value >= 10 ? "#10b981" : "#f43f5e"} />
                        <stop offset="100%" stopColor={value >= 20 ? "#059669" : "#3b82f6"} />
                    </linearGradient>
                </defs>
            </svg>

            {/* Content Overlay */}
            <div className="absolute flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-700">
                <span className="text-4xl font-black tracking-tighter tabular-nums">
                    {Math.round(value)}%
                </span>
                <span className={cn("text-[10px] font-bold uppercase tracking-widest mt-1", grade.color)}>
                    {grade.label}
                </span>
                <span className="text-[9px] text-muted-foreground mt-2 font-medium">TASA DE AHORRO</span>
            </div>

            {/* Legend/Info */}
            <div className="absolute -bottom-2 flex gap-4 text-[9px] font-bold text-muted-foreground/60">
                <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Meta 20%
                </div>
            </div>
        </div>
    )
}
