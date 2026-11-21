import fs from "fs/promises"
import path from "path"
import { createClient as createAdminSupabase, SupabaseClient } from "@supabase/supabase-js"
import { DEFAULT_PLANS, PlanDefinition, DEFAULT_TRIAL_DAYS } from "@/lib/entitlements"

export interface PaymentConfig {
    yape: {
        enabled: boolean
        number: string
        holder: string
        qrUrl: string
    }
    plin: {
        enabled: boolean
        number: string
        holder: string
        qrUrl: string
    }
    card: {
        enabled: boolean
        provider: "CULQI" | "MERCADOPAGO" | "STRIPE"
    }
    paypal: {
        enabled: boolean
        paypalMe: string
    }
}

export interface SystemBrandingSettings {
    id: string
    app_name: string
    tagline: string
    logo_light_url: string
    logo_dark_url: string
    logo_white_url: string
    primary_color: string
    default_currency: string
    trial_days: number
    payment_config: PaymentConfig
    updated_at: string
}

export interface FallbackPaymentOrder {
    id: string
    order_code: string
    user_id: string
    user_email?: string | null
    plan_code: string
    payment_method: "YAPE" | "PLIN" | "CARD" | "PAYPAL"
    amount: number
    currency_code: string
    operation_number?: string | null
    proof_url?: string | null
    status: "PENDING_VERIFICATION" | "APPROVED" | "REJECTED"
    rejection_reason?: string | null
    reviewed_by?: string | null
    reviewed_at?: string | null
    metadata?: Record<string, any>
    created_at: string
}

interface LocalFallbackStore {
    systemSettings: SystemBrandingSettings
    plans: PlanDefinition[]
    orders: FallbackPaymentOrder[]
    userOverrides: Record<
        string,
        {
            plan_code: string
            plan_tier: "FREE" | "PREMIUM"
            status: "ACTIVE" | "EXPIRED" | "CANCELLED"
            expires_at: string | null
            trial_ends_at?: string | null
            role?: "USER" | "ADMIN"
        }
    >
}

export const DEFAULT_SYSTEM_SETTINGS: SystemBrandingSettings = {
    id: "global",
    app_name: "Lumio Finance",
    tagline: "Claridad financiera para tu día a día",
    logo_light_url: "/icons/icon-light.png",
    logo_dark_url: "/icons/icon-dark.png",
    logo_white_url: "/icons/icon-white.png",
    primary_color: "#7C3AED",
    default_currency: "PEN",
    trial_days: DEFAULT_TRIAL_DAYS,
    payment_config: {
        yape: { enabled: true, number: "", holder: "Wilber Saico", qrUrl: "" },
        plin: { enabled: true, number: "", holder: "Wilber Saico", qrUrl: "" },
        card: { enabled: true, provider: "CULQI" },
        paypal: { enabled: true, paypalMe: "" },
    },
    updated_at: new Date().toISOString(),
}

const CACHE_FILE = path.join(process.cwd(), ".lumio-saas-state.json")

let memoryCache: LocalFallbackStore | null = null

export function getServiceRoleClient(): SupabaseClient | null {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    if (!url || !key) return null
    return createAdminSupabase(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
    })
}

async function readLocalStore(): Promise<LocalFallbackStore> {
    if (memoryCache) return memoryCache
    try {
        const raw = await fs.readFile(CACHE_FILE, "utf-8")
        const parsed = JSON.parse(raw)
        memoryCache = {
            systemSettings: { ...DEFAULT_SYSTEM_SETTINGS, ...(parsed.systemSettings || {}) },
            plans: Array.isArray(parsed.plans) && parsed.plans.length > 0 ? parsed.plans : DEFAULT_PLANS,
            orders: Array.isArray(parsed.orders) ? parsed.orders : [],
            userOverrides: parsed.userOverrides || {},
        }
        return memoryCache
    } catch {
        memoryCache = {
            systemSettings: DEFAULT_SYSTEM_SETTINGS,
            plans: DEFAULT_PLANS,
            orders: [],
            userOverrides: {},
        }
        return memoryCache
    }
}

async function writeLocalStore(next: LocalFallbackStore): Promise<void> {
    memoryCache = next
    try {
        await fs.writeFile(CACHE_FILE, JSON.stringify(next, null, 2), "utf-8")
    } catch {
        // Safe ignore on read-only serverless filesystems
    }
}

export async function getSystemBrandingAndPlans(supabase?: SupabaseClient): Promise<{
    settings: SystemBrandingSettings
    plans: PlanDefinition[]
}> {
    const local = await readLocalStore()
    const client = getServiceRoleClient() || supabase

    let settings = local.systemSettings
    let plans = local.plans

    if (client) {
        try {
            const { data: sysRow, error: sysErr } = await client
                .from("system_settings")
                .select("*")
                .eq("id", "global")
                .maybeSingle()

            if (!sysErr && sysRow) {
                settings = {
                    ...DEFAULT_SYSTEM_SETTINGS,
                    ...sysRow,
                    payment_config: {
                        ...DEFAULT_SYSTEM_SETTINGS.payment_config,
                        ...(sysRow.payment_config || {}),
                    },
                }
            }
        } catch {
            // Table may not exist yet; use local fallback seamlessly
        }

        try {
            const { data: planRows, error: planErr } = await client
                .from("subscription_plans")
                .select("*")
                .order("sort_order", { ascending: true })

            if (!planErr && Array.isArray(planRows) && planRows.length > 0) {
                plans = planRows.map((p: any) => ({
                    code: p.code,
                    name: p.name,
                    billing_cycle: p.billing_cycle,
                    duration_days: p.duration_days,
                    price_pen: Number(p.price_pen ?? 0),
                    price_usd: Number(p.price_usd ?? 0),
                    badge: p.badge ?? null,
                    description: p.description ?? "",
                    features: Array.isArray(p.features) ? p.features : [],
                    is_active: p.is_active !== false,
                    sort_order: Number(p.sort_order ?? 0),
                }))
            }
        } catch {
            // Fallback to local/default plans
        }
    }

    return { settings, plans }
}

export async function saveSystemSettings(
    partial: Partial<SystemBrandingSettings>,
    supabase?: SupabaseClient
): Promise<SystemBrandingSettings> {
    const local = await readLocalStore()
    const merged: SystemBrandingSettings = {
        ...local.systemSettings,
        ...partial,
        payment_config: {
            ...local.systemSettings.payment_config,
            ...(partial.payment_config || {}),
        },
        updated_at: new Date().toISOString(),
    }

    local.systemSettings = merged
    await writeLocalStore(local)

    const client = getServiceRoleClient() || supabase
    if (client) {
        try {
            await client.from("system_settings").upsert(merged, { onConflict: "id" })
        } catch {
            // Silently preserved in fallback store
        }
    }

    return merged
}

export async function saveSubscriptionPlans(
    plans: PlanDefinition[],
    supabase?: SupabaseClient
): Promise<PlanDefinition[]> {
    const local = await readLocalStore()
    local.plans = plans
    await writeLocalStore(local)

    const client = getServiceRoleClient() || supabase
    if (client) {
        try {
            for (const p of plans) {
                await client
                    .from("subscription_plans")
                    .upsert(
                        {
                            code: p.code,
                            name: p.name,
                            billing_cycle: p.billing_cycle,
                            duration_days: p.duration_days,
                            price_pen: p.price_pen,
                            price_usd: p.price_usd,
                            badge: p.badge,
                            description: p.description,
                            features: p.features,
                            is_active: p.is_active,
                            sort_order: p.sort_order,
                            updated_at: new Date().toISOString(),
                        },
                        { onConflict: "code" }
                    )
            }
        } catch {
            // Fallback preserved
        }
    }

    return plans
}

export async function getLocalFallbackStore() {
    return readLocalStore()
}

export async function updateLocalFallbackStore(updater: (store: LocalFallbackStore) => LocalFallbackStore) {
    const current = await readLocalStore()
    const next = updater(current)
    await writeLocalStore(next)
    return next
}
