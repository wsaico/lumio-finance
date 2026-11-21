export const dynamic = "force-dynamic"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserEntitlementsServer } from "@/lib/server/entitlements"
import DashboardLayoutClient from "./layout-client"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect("/login")
    }

    const { onboardingCompleted } = await getUserEntitlementsServer(supabase, user)

    return (
        <DashboardLayoutClient shouldShowWizard={!onboardingCompleted}>
            {children}
        </DashboardLayoutClient>
    )
}
