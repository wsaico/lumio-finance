"use client"

import { motion } from "framer-motion"

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="dark flex min-h-screen w-full bg-slate-950 selection:bg-primary/30 text-slate-100">
            {/* Visual Side Panel - Desktop Only */}
            <div className="hidden lg:flex lg:w-3/5 relative overflow-hidden bg-slate-900 border-r border-white/5">
                {/* Dual Gradient Overlay using System Colors */}
                <div className="absolute inset-0 bg-gradient-to-tr from-[oklch(var(--income))]/20 via-background/40 to-primary/10 z-10" />
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-[20s] hover:scale-105"
                    style={{ backgroundImage: 'url("/login-bg.png")' }}
                />

                {/* Branding Overlay */}
                <div className="absolute inset-0 flex flex-col justify-end p-16 z-20 backdrop-brightness-75">
                    <div className="max-w-xl space-y-8">
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-4"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-primary/20 backdrop-blur-2xl border border-primary/30 flex items-center justify-center shadow-2xl shadow-primary/20">
                                <span className="text-3xl font-black text-primary">L</span>
                            </div>
                            <h2 className="text-5xl font-black tracking-tighter text-white">
                                Lumio <span className="text-[oklch(var(--income))]">Finance</span>
                            </h2>
                        </motion.div>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-2xl font-medium text-slate-200 leading-relaxed text-balance"
                        >
                            La inteligencia financiera que mereces, diseñada con la precisión y el lujo de la banca de élite.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="flex items-center gap-6 pt-6"
                        >
                            <div className="flex -space-x-4">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className="w-12 h-12 rounded-full border-4 border-background bg-muted shadow-xl" />
                                ))}
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-sm font-black text-white">Únete a la élite financiera</p>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">+5,000 Usuarios Activos</p>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Auth Form Container */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
                <div className="absolute inset-0 lg:hidden overflow-hidden">
                    <div
                        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30 blur-xl"
                        style={{ backgroundImage: 'url("/login-bg.png")' }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
                </div>

                <div className="w-full max-w-md relative z-10">
                    <div className="mb-12 lg:hidden flex justify-center">
                        <div className="w-16 h-16 rounded-2xl bg-primary/20 backdrop-blur-2xl border border-primary/30 flex items-center justify-center">
                            <span className="text-3xl font-black text-primary">L</span>
                        </div>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    )
}
