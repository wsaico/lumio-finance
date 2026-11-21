import { createClient } from "@/lib/supabase/server"
import { isPrimaryAdminEmail } from "@/lib/entitlements"
import { getServiceRoleClient } from "@/lib/server/system-settings"

export async function requireAdmin() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { ok: false as const, status: 401, error: "Unauthorized" }
    }

    if (isPrimaryAdminEmail(user.email)) {
        return { ok: true as const, user, supabase, adminClient: getServiceRoleClient() || supabase }
    }

    const adminClient = getServiceRoleClient() || supabase
    const { data: profile } = await adminClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle()

    if (profile?.role === "ADMIN") {
        return { ok: true as const, user, supabase, adminClient }
    }

    return { ok: false as const, status: 403, error: "Acceso exclusivo para administradores" }
}
