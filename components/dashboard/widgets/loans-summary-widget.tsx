"use client"

import { useFormat } from "@/hooks/useFormat"
import { motion } from "framer-motion"
import { HandCoins, ArrowUpRight, ArrowDownLeft } from "lucide-react"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { useSettingsStore } from "@/hooks/useSettingsStore"

export function LoansSummaryWidget() {
    const { formatMoney } = useFormat()
    const { isBalanceVisible } = useSettingsStore()
    const [loanData, setLoanData] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function fetchLoans() {
            try {
                const res = await fetch('/api/loans')
                if (res.ok) {
                    const data = await res.json()
                    const totalReceivable = data.filter((l: any) => l.type === 'receivable')
                        .reduce((sum: number, l: any) => sum + (Number(l.amount) || 0), 0)
                    const totalPayable = data.filter((l: any) => l.type === 'payable')
                        .reduce((sum: number, l: any) => sum + (Number(l.amount) || 0), 0)

                    setLoanData({ totalReceivable, totalPayable })
                }
            } catch (err) {
                console.error("Error fetching loans:", err)
            } finally {
                setIsLoading(false)
            }
        }
        fetchLoans()
    }, [])

    if (isLoading) return null

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="h-full"
        >
            <Card className="widget-surface bg-white dark:bg-zinc-900 border-none h-full flex flex-col overflow-hidden relative shadow-2xl">
                {/* Header Section */}
                <div className="flex items-start justify-between p-6 pb-2">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-[#00D1FF]/10 border border-[#00D1FF]/20">
                            <HandCoins className="w-5 h-5 text-[#00D1FF]" />
                        </div>
                        <div>
                            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Préstamos y Deudas</h3>
                            <p className="text-[9px] font-bold text-zinc-500 opacity-60">Balance de créditos</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 p-6 flex flex-col justify-center gap-4">
                    {/* Item 1: Por Cobrar */}
                    <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 transition-all group-hover:scale-110">
                                <ArrowUpRight className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">A Favor</p>
                                <p className="text-[9px] font-bold text-blue-500/60 uppercase">Préstamos</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <h4 className="text-2xl font-black text-zinc-900 dark:text-white tabular-nums tracking-tight">
                                {isBalanceVisible ? formatMoney(loanData?.totalReceivable || 0) : '******'}
                            </h4>
                        </div>
                    </div>

                    {/* Simple Separator */}
                    <div className="h-px w-full bg-zinc-100 dark:bg-white/5" />

                    {/* Item 2: Por Pagar */}
                    <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 transition-all group-hover:scale-110">
                                <ArrowDownLeft className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">En Contra</p>
                                <p className="text-[9px] font-bold text-rose-500/60 uppercase">Deudas</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <h4 className="text-2xl font-black text-zinc-900 dark:text-white/90 tabular-nums tracking-tight">
                                {isBalanceVisible ? formatMoney(loanData?.totalPayable || 0) : '******'}
                            </h4>
                        </div>
                    </div>
                </div>
            </Card>
        </motion.div>
    )
}
