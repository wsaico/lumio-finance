"use client"

import Link from "next/link"
import { Heart } from "lucide-react"

export function AppFooter() {
    return (
        <footer className="w-full border-t bg-background/60 backdrop-blur-xl py-8 px-6 mt-auto relative">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
                {/* Brand & Author Section */}
                <div className="flex flex-col items-center md:items-start gap-2">
                    <p className="text-sm text-muted-foreground font-medium">
                        Sistema creado con <Heart className="h-3.5 w-3.5 text-rose-500 inline fill-rose-500 mx-0.5" /> por{" "}
                        <Link
                            href="https://wsaico.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-foreground font-bold hover:text-primary transition-colors underline decoration-primary/30 underline-offset-4"
                        >
                            wsaico
                        </Link>
                    </p>
                </div>

                {/* Copyright Section */}
                <div className="flex flex-col items-center md:items-end gap-1">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-neutral-400">
                        © 2026 Lumio Finance
                    </p>
                    <p className="text-[10px] font-medium text-muted-foreground/60 leading-none">
                        Todos los derechos reservados
                    </p>
                </div>
            </div>

            {/* Background Decorative Element */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        </footer>
    )
}
