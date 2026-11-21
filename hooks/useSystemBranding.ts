"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import type { PlanDefinition } from "@/lib/entitlements"
import type { PaymentConfig } from "@/lib/server/system-settings"

export interface SystemBranding {
    appName: string
    tagline: string
    logoLightUrl: string
    logoDarkUrl: string
    logoWhiteUrl: string
    primaryColor: string
    defaultCurrency: string
    trialDays: number
    paymentConfig?: PaymentConfig
    plans: PlanDefinition[]
}

const DEFAULT_BRANDING: SystemBranding = {
    appName: "Lumio Finance",
    tagline: "Claridad financiera para tu día a día",
    logoLightUrl: "/icons/icon-light.png",
    logoDarkUrl: "/icons/icon-dark.png",
    logoWhiteUrl: "/icons/icon-white.png",
    primaryColor: "#7C3AED",
    defaultCurrency: "PEN",
    trialDays: 15,
    plans: [],
}

export function useSystemBranding() {
    const { data } = useQuery<SystemBranding>({
        queryKey: ["system-branding"],
        queryFn: async () => {
            const res = await fetch("/api/system/branding")
            if (!res.ok) return DEFAULT_BRANDING
            return res.json()
        },
        staleTime: 60 * 1000,
    })

    return data || DEFAULT_BRANDING
}
