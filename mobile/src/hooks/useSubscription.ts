import { useUser } from './useUser';

export function useSubscription() {
  const { entitlements, profile, isLoading, mutateProfile } = useUser();

  return {
    entitlements,
    profile,
    isLoading,
    isPremium: entitlements?.isPremium ?? false,
    isTrial: entitlements?.isTrial ?? false,
    isFree: entitlements?.isFree ?? true,
    isAdmin: entitlements?.isAdmin ?? false,
    canWritePremium: entitlements?.canAccessPremiumWrite ?? false,
    canExportReports: entitlements?.canExportReports ?? false,
    canCreateRecurring: entitlements?.canCreateRecurring ?? false,
    trialDaysRemaining: entitlements?.trialDaysRemaining ?? 0,
    trialEndsAt: entitlements?.trialEndsAt ?? null,
    refresh: mutateProfile,
  };
}
