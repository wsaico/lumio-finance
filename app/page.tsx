import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { getSystemBrandingAndPlans } from "@/lib/server/system-settings"
import { LandingPage } from "@/components/landing/landing-page"

export async function generateMetadata(): Promise<Metadata> {
    const { settings } = await getSystemBrandingAndPlans()
    const appName = settings.app_name || "Lumio Finance"
    const title = `${appName} — Control de Finanzas Personales, Tarjetas, Presupuestos y Metas`
    const description =
        "Organiza cuentas, tarjetas de crédito, presupuestos, préstamos y metas de ahorro en un solo lugar. Empieza con 15 días Premium gratis y conserva el Plan Básico gratis de por vida."

    return {
        title,
        description,
        alternates: { canonical: "/" },
        openGraph: {
            title,
            description,
            type: "website",
            locale: "es_PE",
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
        },
    }
}

export default async function HomePage() {
    const supabase = await createClient()
    const [{ settings, plans }, { data: sessionData }] = await Promise.all([
        getSystemBrandingAndPlans(supabase),
        supabase.auth.getUser(),
    ])

    const isAuthenticated = Boolean(sessionData?.user)

    const softwareJsonLd = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: settings.app_name || "Lumio Finance",
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web, Android, iOS",
        url: process.env.NEXT_PUBLIC_SITE_URL || "https://lumio.esaico.com",
        author: {
            "@type": "Person",
            name: "Wilber Saico",
            url: "https://esaico.com",
        },
        offers: {
            "@type": "AggregateOffer",
            lowPrice: "0",
            highPrice: "169",
            priceCurrency: "PEN",
            offerCount: plans.length,
        },
    }

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
            />
            <LandingPage
                settings={settings}
                plans={plans}
                isAuthenticated={isAuthenticated}
            />
        </>
    )
}
