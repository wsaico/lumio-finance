import type { SupabaseClient, User } from "@supabase/supabase-js"
import {
    DEFAULT_TRIAL_DAYS,
    isPrimaryAdminEmail,
    resolveEntitlements,
    type UserEntitlements,
} from "@/lib/entitlements"
import {
    getLocalFallbackStore,
    getServiceRoleClient,
    getSystemBrandingAndPlans,
} from "@/lib/server/system-settings"

export async function getUserEntitlementsServer(
    supabase: SupabaseClient,
    user: User
): Promise<{
    entitlements: UserEntitlements
    profile: Record<string, any> | null
    timezone: string
    countryCode: string
    demoModeActive: boolean
    onboardingCompleted: boolean
}> {
    const adminClient = getServiceRoleClient() || supabase
    const { settings } = await getSystemBrandingAndPlans(adminClient)
    const fallbackStore = await getLocalFallbackStore()

    let profile: Record<string, any> | null = null
    try {
        const { data } = await adminClient
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle()
        if (data) {
            profile = data
        } else {
            // Auto-heal missing public.profiles row so FK constraints on accounts/budgets never fail
            const meta = user.user_metadata || {}
            const isOwner = isPrimaryAdminEmail(user.email)
            const baseSeed: Record<string, any> = {
                id: user.id,
                full_name:
                    meta.full_name ||
                    meta.name ||
                    (user.email ? user.email.split("@")[0] : "Usuario Lumio"),
                avatar_url: meta.avatar_url || null,
                default_currency: meta.currency || "PEN",
                base_currency: meta.currency || "PEN",
            }
            const extendedSeed: Record<string, any> = {
                ...baseSeed,
                country_code: meta.country_code || "PE",
                timezone: meta.timezone || "America/Lima",
                role: isOwner ? "ADMIN" : "USER",
                plan_tier: isOwner ? "PREMIUM" : "FREE",
                trial_started_at: user.created_at || new Date().toISOString(),
            }
            const { data: createdExt, error: extErr } = await adminClient
                .from("profiles")
                .upsert(extendedSeed, { onConflict: "id" })
                .select("*")
                .maybeSingle()
            if (!extErr && createdExt) {
                profile = createdExt
            } else {
                const { data: createdBase } = await adminClient
                    .from("profiles")
                    .upsert(baseSeed, { onConflict: "id" })
                    .select("*")
                    .maybeSingle()
                if (createdBase) profile = createdBase
            }
        }
    } catch {
        profile = null
    }

    let subscription: Record<string, any> | null = null
    try {
        const { data, error } = await adminClient
            .from("user_subscriptions")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle()
        if (!error && data) subscription = data
    } catch {
        subscription = null
    }

    // Apply fallback override if DB migration is pending
    const override = fallbackStore.userOverrides[user.id]
    if (!subscription && override && override.status === "ACTIVE" && override.plan_code !== "FREE") {
        subscription = {
            plan_code: override.plan_code,
            status: override.status,
            expires_at: override.expires_at,
        }
    }

    const meta = user.user_metadata || {}
    const effectiveProfile = {
        ...(profile || {}),
        role:
            isPrimaryAdminEmail(user.email) || override?.role === "ADMIN"
                ? "ADMIN"
                : profile?.role || "USER",
        plan_tier:
            override?.plan_tier ||
            (meta.plan_tier as string | undefined) ||
            profile?.plan_tier ||
            "FREE",
        trial_started_at:
            profile?.trial_started_at ||
            (meta.trial_started_at as string | undefined) ||
            user.created_at,
        trial_ends_at:
            override?.trial_ends_at ||
            profile?.trial_ends_at ||
            (meta.trial_ends_at as string | undefined) ||
            null,
    }

    const entitlements = resolveEntitlements({
        email: user.email,
        userCreatedAt: user.created_at,
        profile: effectiveProfile,
        subscription,
        defaultTrialDays: settings.trial_days || DEFAULT_TRIAL_DAYS,
    })

    const timezone =
        profile?.timezone || (meta.timezone as string | undefined) || "America/Lima"
    const countryCode =
        profile?.country_code || (meta.country_code as string | undefined) || "PE"
    const demoModeActive = Boolean(
        profile?.demo_mode_active ?? meta.demo_mode_active ?? false
    )
    const onboardingCompleted = Boolean(
        profile?.onboarding_completed ??
            meta.onboarding_completed ??
            Boolean(profile?.budgeting_method)
    )

    return {
        entitlements,
        profile: effectiveProfile,
        timezone,
        countryCode,
        demoModeActive,
        onboardingCompleted,
    }
}
