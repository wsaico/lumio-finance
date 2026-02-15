"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { User } from "@supabase/supabase-js"
import { useQuery, useQueryClient } from "@tanstack/react-query"

export type UserProfile = {
    id: string
    full_name?: string
    avatar_url?: string
    email?: string
}

const fetcher = async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) return null

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

    return {
        user: session.user,
        profile: {
            ...profile,
            email: session.user.email,
            // Fallback if profile is missing fields but auth has them
            full_name: profile?.full_name || session.user.user_metadata?.full_name || 'Usuario Lumio',
            avatar_url: profile?.avatar_url || session.user.user_metadata?.avatar_url
        } as UserProfile
    }
}

export function useUser() {
    const queryClient = useQueryClient()

    const { data, error, isLoading } = useQuery({
        queryKey: ['user-profile'],
        queryFn: fetcher,
        staleTime: Infinity, // Similar to revalidateOnFocus: false, assuming user data rarely changes
        gcTime: 1000 * 60 * 60, // Keep in cache for 1 hour
        refetchOnWindowFocus: false,
    })

    return {
        user: data?.user ?? null,
        profile: data?.profile ?? null,
        isLoading,
        isError: error,
        mutateProfile: () => queryClient.invalidateQueries({ queryKey: ['user-profile'] })
    }
}
