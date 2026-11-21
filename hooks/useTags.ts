"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export interface UserTag {
    id: string
    name: string
    color: string
    is_demo?: boolean
    created_at?: string
}

export function useTags() {
    const queryClient = useQueryClient()

    const query = useQuery<UserTag[]>({
        queryKey: ["user-tags"],
        queryFn: async () => {
            const res = await fetch("/api/tags")
            if (!res.ok) return []
            return res.json()
        },
        staleTime: 60 * 1000,
    })

    const createTag = useMutation({
        mutationFn: async (payload: { name: string; color?: string }) => {
            const res = await fetch("/api/tags", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.error || "No se pudo crear la etiqueta")
            }
            return res.json() as Promise<UserTag>
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["user-tags"] })
            toast.success("Etiqueta creada")
        },
        onError: (err: any) => {
            toast.error(err?.message || "No se pudo crear la etiqueta")
        },
    })

    const updateTag = useMutation({
        mutationFn: async (payload: { id: string; name?: string; color?: string }) => {
            const res = await fetch("/api/tags", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })
            if (!res.ok) throw new Error("No se pudo actualizar la etiqueta")
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["user-tags"] })
            toast.success("Etiqueta actualizada")
        },
    })

    const deleteTag = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/tags?id=${encodeURIComponent(id)}`, {
                method: "DELETE",
            })
            if (!res.ok) throw new Error("No se pudo eliminar la etiqueta")
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["user-tags"] })
            toast.success("Etiqueta eliminada")
        },
    })

    return {
        tags: query.data || [],
        isLoading: query.isLoading,
        createTag,
        updateTag,
        deleteTag,
    }
}
