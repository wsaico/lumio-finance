"use client"

import Link from "next/link"
import { useSystemBranding } from "@/hooks/useSystemBranding"

export function AppFooter() {
    const branding = useSystemBranding()
    return (
        <footer className="w-full border-t bg-background/60 backdrop-blur-xl py-6 px-6 mt-auto relative">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
                <div className="flex flex-col items-center md:items-start gap-1">
                    <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                        Desarrollado por{" "}
                        <span className="text-foreground font-bold">Wilber Saico</span>
                        {" · "}
                        <Link
                            href="https://esaico.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary font-bold hover:underline underline-offset-4"
                        >
                            esaico.com
                        </Link>
                    </p>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <Link href="/privacidad" className="hover:text-foreground transition-colors">
                        Privacidad
                    </Link>
                    <Link href="/terminos" className="hover:text-foreground transition-colors">
                        Términos
                    </Link>
                    <span className="font-semibold text-foreground/75">
                        © {new Date().getFullYear()} {branding.appName}
                    </span>
                </div>
            </div>
        </footer>
    )
}
