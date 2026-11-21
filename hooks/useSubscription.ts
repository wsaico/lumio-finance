"use client"

import { useUser } from "@/hooks/useUser"
import { resolveEntitlements } from "@/lib/entitlements"

export function useSubscription() {
    const { user, profile, entitlements: resolvedFromHook, isLoading } = useUser()

    const entitlements =
        resolvedFromHook ||
        resolveEntitlements({
            email: user?.email,
            userCreatedAt: user?.created_at,
            profile: profile || undefined,
        })

    return {
        entitlements,
        isLoading,
        isPremium: entitlements.isPremium,
        isTrial: entitlements.isTrial,
        isFree: entitlements.isFree,
        isAdmin: entitlements.isAdmin,
        trialDaysRemaining: entitlements.trialDaysRemaining,
        maxAccounts: entitlements.maxAccounts,
        canAccessPremiumWrite: entitlements.canAccessPremiumWrite,
        canExportReports: entitlements.canExportReports,
        canCreateRecurring: entitlements.canCreateRecurring,
    }
}
