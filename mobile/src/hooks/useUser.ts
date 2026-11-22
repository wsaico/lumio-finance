import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { apiGet } from '@/lib/api-client';
import {
  isPrimaryAdminEmail,
  resolveEntitlements,
  type UserEntitlements,
} from '@/lib/entitlements';

export type UserProfile = {
  id: string;
  full_name?: string;
  avatar_url?: string;
  email?: string;
  role?: 'USER' | 'ADMIN';
  isAdmin?: boolean;
  country_code?: string;
  timezone?: string;
  base_currency?: string;
  budgeting_method?: string;
  onboarding_completed?: boolean;
  demo_mode_active?: boolean;
  plan_tier?: 'FREE' | 'PREMIUM';
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
};

async function fetchUserProfile() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .maybeSingle();

  const meta = session.user.user_metadata || {};
  const isAdmin = isPrimaryAdminEmail(session.user.email) || profile?.role === 'ADMIN';

  let subscription: any = null;
  try {
    subscription = await apiGet('/api/subscription');
  } catch {
    subscription = null;
  }

  const fullProfile: UserProfile = {
    ...profile,
    id: session.user.id,
    email: session.user.email,
    full_name: profile?.full_name || meta.full_name || meta.name || 'Usuario Lumio',
    avatar_url: profile?.avatar_url || meta.avatar_url,
    role: isAdmin ? 'ADMIN' : 'USER',
    isAdmin,
    country_code: profile?.country_code || meta.country_code || 'PE',
    timezone: profile?.timezone || meta.timezone || 'America/Lima',
    base_currency: profile?.base_currency || meta.currency || 'PEN',
    budgeting_method: profile?.budgeting_method || meta.budgeting_method,
    onboarding_completed: Boolean(
      profile?.onboarding_completed ??
        meta.onboarding_completed ??
        Boolean(profile?.budgeting_method)
    ),
    demo_mode_active: Boolean(
      subscription?.demoModeActive ??
        profile?.demo_mode_active ??
        meta.demo_mode_active ??
        false
    ),
    plan_tier: profile?.plan_tier || meta.plan_tier || 'FREE',
    trial_started_at:
      profile?.trial_started_at || meta.trial_started_at || session.user.created_at,
    trial_ends_at:
      subscription?.entitlements?.trialEndsAt ||
      profile?.trial_ends_at ||
      meta.trial_ends_at ||
      null,
  };

  const entitlements: UserEntitlements =
    subscription?.entitlements ||
    resolveEntitlements({
      email: session.user.email,
      userCreatedAt: session.user.created_at,
      profile: fullProfile,
    });

  return {
    user: session.user,
    profile: fullProfile,
    entitlements,
  };
}

export function useUser() {
  const queryClient = useQueryClient();

  const { data, error, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: fetchUserProfile,
    staleTime: 60 * 1000,
    gcTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
  });

  return {
    user: data?.user ?? null,
    profile: data?.profile ?? null,
    entitlements: data?.entitlements ?? null,
    isLoading,
    isError: error,
    mutateProfile: () => queryClient.invalidateQueries({ queryKey: ['user-profile'] }),
  };
}
