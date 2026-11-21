import React from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getSystemBrandingAndPlans } from "@/lib/server/system-settings"

export default async function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { settings } = await getSystemBrandingAndPlans(supabase)

    const brandColor = settings.primary_color || "#7C3AED"
    const appName = settings.app_name || "Lumio Finance"
    const shortBrand = appName.split(" ")[0] || "Lumio"

    return (
        <div
            className="min-h-screen w-full bg-[#F5F6FA] dark:bg-[#0F1015] flex flex-col justify-between p-4 md:p-8 relative overflow-hidden"
            style={{ "--brand": brandColor } as React.CSSProperties}
        >
            <div className="fixed -top-48 -left-48 w-[420px] h-[420px] rounded-full bg-primary/10 blur-[140px] pointer-events-none" />
            <div className="fixed -bottom-48 -right-48 w-[420px] h-[420px] rounded-full bg-primary/10 blur-[140px] pointer-events-none" />

            <header className="w-full max-w-5xl mx-auto flex items-center justify-between py-2 z-10">
                <Link href="/" className="flex items-center gap-2.5 group">
                    <img
                        src={settings.logo_light_url || "/icons/icon-light.png"}
                        alt={appName}
                        className="h-9 w-9 rounded-2xl object-cover shadow-sm ring-1 ring-border/60 dark:hidden group-hover:scale-105 transition-transform"
                    />
                    <img
                        src={settings.logo_dark_url || "/icons/icon-dark.png"}
                        alt={appName}
                        className="h-9 w-9 rounded-2xl object-cover shadow-sm ring-1 ring-white/15 hidden dark:block group-hover:scale-105 transition-transform"
                    />
                    <span className="font-black text-lg tracking-tight text-foreground">
                        {shortBrand}
                    </span>
                </Link>

                <Link
                    href="/"
                    className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                    Volver al inicio
                </Link>
            </header>

            <main className="w-full max-w-[420px] mx-auto my-auto z-10 py-6">
                {children}
            </main>

            <footer className="w-full max-w-5xl mx-auto text-center py-4 text-xs text-muted-foreground z-10">
                <p>
                    © {new Date().getFullYear()} {appName}
                </p>
            </footer>
        </div>
    )
}
