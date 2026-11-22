import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';
import { DEFAULT_PLANS, type PlanDefinition } from '@/lib/entitlements';

export interface SystemBranding {
  appName: string;
  tagline: string;
  logoLightUrl?: string | null;
  logoDarkUrl?: string | null;
  logoWhiteUrl?: string | null;
  primaryColor: string;
  defaultCurrency: string;
  trialDays: number;
  paymentConfig: {
    yape: { enabled: boolean; number: string; holder: string; qrUrl?: string };
    plin: { enabled: boolean; number: string; holder: string; qrUrl?: string };
    card: { enabled: boolean; provider?: string; link?: string };
    paypal: { enabled: boolean; paypalMe?: string; email?: string };
  };
  plans: PlanDefinition[];
}

const DEFAULT_BRANDING: SystemBranding = {
  appName: 'Lumio Finance',
  tagline: 'Finanzas personales inteligentes',
  primaryColor: '#5B35D5',
  defaultCurrency: 'PEN',
  trialDays: 15,
  paymentConfig: {
    yape: { enabled: true, number: '', holder: 'Wilber Saico', qrUrl: '' },
    plin: { enabled: true, number: '', holder: 'Wilber Saico', qrUrl: '' },
    card: { enabled: true, provider: 'CULQI' },
    paypal: { enabled: true, paypalMe: '' },
  },
  plans: DEFAULT_PLANS,
};

export function useSystemBranding() {
  const { data } = useQuery<SystemBranding>({
    queryKey: ['system-branding'],
    queryFn: () => apiGet<SystemBranding>('/api/system/branding', true),
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  return data || DEFAULT_BRANDING;
}
