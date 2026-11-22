export const PRIMARY_ADMIN_EMAIL = 'willysaico@gmail.com';
export const DEFAULT_TRIAL_DAYS = 15;

export type PlanCode =
  | 'FREE'
  | 'PREMIUM_MONTHLY'
  | 'PREMIUM_SEMIANNUAL'
  | 'PREMIUM_ANNUAL'
  | 'PREMIUM_LIFETIME';

export type EntitlementStatus = 'PREMIUM_ACTIVE' | 'TRIAL_ACTIVE' | 'FREE_BASIC';

export interface UserEntitlements {
  status: EntitlementStatus;
  isPremium: boolean;
  isTrial: boolean;
  isFree: boolean;
  isAdmin: boolean;
  planCode: PlanCode;
  planName: string;
  trialEndsAt: string | null;
  trialDaysRemaining: number;
  expiresAt: string | null;
  maxAccounts: number;
  canAccessPremiumWrite: boolean;
  canExportReports: boolean;
  canCreateRecurring: boolean;
}

export interface PlanDefinition {
  code: PlanCode;
  name: string;
  billing_cycle: 'FREE' | 'MONTHLY' | 'SEMIANNUAL' | 'ANNUAL' | 'LIFETIME';
  duration_days: number | null;
  price_pen: number;
  price_usd: number;
  badge: string | null;
  description: string;
  features: string[];
  is_active: boolean;
  sort_order: number;
}

export const DEFAULT_PLANS: PlanDefinition[] = [
  {
    code: 'FREE',
    name: 'Plan Básico',
    billing_cycle: 'FREE',
    duration_days: null,
    price_pen: 0,
    price_usd: 0,
    badge: 'Gratis de por vida',
    description: 'Controla tus movimientos diarios con una cuenta principal sin pagar nada.',
    features: [
      '1 cuenta activa',
      'Movimientos ilimitados',
      'Categorías y etiquetas creables',
      'Vista previa modo lector en módulos avanzados',
    ],
    is_active: true,
    sort_order: 1,
  },
  {
    code: 'PREMIUM_MONTHLY',
    name: 'Mensual',
    billing_cycle: 'MONTHLY',
    duration_days: 30,
    price_pen: 10,
    price_usd: 3,
    badge: null,
    description: 'Acceso total mes a mes sin permanencia.',
    features: [
      'Cuentas y tarjetas de crédito ilimitadas',
      'Presupuestos inteligentes y regla 50/30/20',
      'Préstamos por cobrar y pagar con cronograma',
      'Metas de ahorro y suscripciones automáticas',
      'Reportes Excel, PDF, CSV y copias en Google Drive',
    ],
    is_active: true,
    sort_order: 2,
  },
  {
    code: 'PREMIUM_SEMIANNUAL',
    name: '6 Meses',
    billing_cycle: 'SEMIANNUAL',
    duration_days: 180,
    price_pen: 50,
    price_usd: 14,
    badge: '1 mes gratis',
    description: 'Medio año completo con 1 mes de regalo incluido.',
    features: [
      'Todo el sistema desbloqueado durante 6 meses',
      'Pagas S/. 50 en lugar de S/. 60',
      'Incluye escáner de boletas y reportes',
    ],
    is_active: true,
    sort_order: 3,
  },
  {
    code: 'PREMIUM_ANNUAL',
    name: 'Anual',
    billing_cycle: 'ANNUAL',
    duration_days: 365,
    price_pen: 79,
    price_usd: 22,
    badge: 'Más elegido · -34%',
    description: 'El plan favorito para organizar todo tu año por menos de S/. 6.60 al mes.',
    features: [
      'Acceso total durante 12 meses',
      'Ahorras S/. 41 al año',
      'Multi-moneda, Google Drive y reportes ejecutivos',
    ],
    is_active: true,
    sort_order: 4,
  },
  {
    code: 'PREMIUM_LIFETIME',
    name: 'De por vida',
    billing_cycle: 'LIFETIME',
    duration_days: null,
    price_pen: 169,
    price_usd: 47,
    badge: 'Pago único',
    description: 'Un solo pago y Lumio Premium es tuyo para siempre.',
    features: [
      'Acceso ilimitado permanente sin renovaciones',
      'Todas las funciones y mejoras futuras incluidas',
      'Ideal si quieres olvidarte de suscripciones',
    ],
    is_active: true,
    sort_order: 5,
  },
];

export function isPrimaryAdminEmail(email?: string | null): boolean {
  return Boolean(email && email.trim().toLowerCase() === PRIMARY_ADMIN_EMAIL);
}

export function resolveEntitlements(params: {
  email?: string | null;
  userCreatedAt?: string | null;
  profile?: {
    role?: string | null;
    plan_tier?: string | null;
    trial_started_at?: string | null;
    trial_ends_at?: string | null;
  } | null;
  subscription?: {
    plan_code?: string | null;
    status?: string | null;
    expires_at?: string | null;
  } | null;
  defaultTrialDays?: number;
}): UserEntitlements {
  const isAdmin = isPrimaryAdminEmail(params.email) || params.profile?.role === 'ADMIN';
  const sub = params.subscription;
  const subActive =
    sub &&
    sub.status === 'ACTIVE' &&
    sub.plan_code !== 'FREE' &&
    (!sub.expires_at || new Date(sub.expires_at).getTime() > Date.now());

  if (isAdmin || subActive || params.profile?.plan_tier === 'PREMIUM') {
    const planCode = (sub?.plan_code as PlanCode) || 'PREMIUM_LIFETIME';
    const planMeta = DEFAULT_PLANS.find((p) => p.code === planCode);
    return {
      status: 'PREMIUM_ACTIVE',
      isPremium: true,
      isTrial: false,
      isFree: false,
      isAdmin,
      planCode,
      planName: isAdmin && !subActive ? 'Admin · Acceso Total' : planMeta?.name || 'Premium',
      trialEndsAt: params.profile?.trial_ends_at || null,
      trialDaysRemaining: 0,
      expiresAt: sub?.expires_at || null,
      maxAccounts: Number.MAX_SAFE_INTEGER,
      canAccessPremiumWrite: true,
      canExportReports: true,
      canCreateRecurring: true,
    };
  }

  const trialDays = params.defaultTrialDays || DEFAULT_TRIAL_DAYS;
  const fallbackStart = params.userCreatedAt ? new Date(params.userCreatedAt) : new Date();
  const trialEndsDate = params.profile?.trial_ends_at
    ? new Date(params.profile.trial_ends_at)
    : new Date(fallbackStart.getTime() + trialDays * 24 * 60 * 60 * 1000);

  const msLeft = trialEndsDate.getTime() - Date.now();
  const trialDaysRemaining = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));

  if (msLeft > 0) {
    return {
      status: 'TRIAL_ACTIVE',
      isPremium: true,
      isTrial: true,
      isFree: false,
      isAdmin: false,
      planCode: 'FREE',
      planName: `Prueba gratuita (${trialDaysRemaining} ${trialDaysRemaining === 1 ? 'día' : 'días'})`,
      trialEndsAt: trialEndsDate.toISOString(),
      trialDaysRemaining,
      expiresAt: trialEndsDate.toISOString(),
      maxAccounts: Number.MAX_SAFE_INTEGER,
      canAccessPremiumWrite: true,
      canExportReports: true,
      canCreateRecurring: true,
    };
  }

  return {
    status: 'FREE_BASIC',
    isPremium: false,
    isTrial: false,
    isFree: true,
    isAdmin: false,
    planCode: 'FREE',
    planName: 'Plan Básico (Gratis)',
    trialEndsAt: trialEndsDate.toISOString(),
    trialDaysRemaining: 0,
    expiresAt: null,
    maxAccounts: 1,
    canAccessPremiumWrite: false,
    canExportReports: false,
    canCreateRecurring: false,
  };
}
