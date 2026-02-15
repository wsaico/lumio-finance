"use client"

import { useQuery } from "@tanstack/react-query"
import { getDashboardData } from "@/app/actions/analysis/get-kpis"
import { DashboardData } from "@/types/analytics"

export function useDashboardData() {
    return useQuery<DashboardData>({
        queryKey: ['dashboard-analytics'],
        queryFn: async () => {
            return await getDashboardData()
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: false
    })
}
