export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import * as z from "zod"

const tagSchema = z.object({
    name: z.string().trim().min(1, "El nombre es obligatorio").max(40),
    color: z.string().min(4).max(20).default("#7C3AED"),
})

export interface UserTagItem {
    id: string
    name: string
    color: string
    is_demo?: boolean
    created_at?: string
}

async function readFallbackTags(supabase: any, user: any): Promise<UserTagItem[]> {
    const metaTags = Array.isArray(user.user_metadata?.custom_tags)
        ? (user.user_metadata.custom_tags as UserTagItem[])
        : []

    const map = new Map<string, UserTagItem>()
    for (const t of metaTags) {
        if (t?.name) {
            map.set(t.name.toLowerCase(), {
                id: t.id || `tag_${t.name.toLowerCase()}`,
                name: t.name,
                color: t.color || "#7C3AED",
                is_demo: Boolean(t.is_demo),
                created_at: t.created_at,
            })
        }
    }

    const { data: txRows } = await supabase
        .from("transactions")
        .select("tags")
        .eq("user_id", user.id)
        .limit(300)

    if (Array.isArray(txRows)) {
        for (const r of txRows) {
            if (Array.isArray(r.tags)) {
                for (const tagName of r.tags) {
                    const clean = String(tagName || "").trim()
                    if (clean && !map.has(clean.toLowerCase())) {
                        map.set(clean.toLowerCase(), {
                            id: `txtag_${clean.toLowerCase()}`,
                            name: clean,
                            color: "#7C3AED",
                        })
                    }
                }
            }
        }
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
}

export async function GET() {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { data, error } = await supabase
            .from("user_tags")
            .select("*")
            .eq("user_id", user.id)
            .order("name", { ascending: true })

        if (!error && Array.isArray(data)) {
            return NextResponse.json(data)
        }

        const fallback = await readFallbackTags(supabase, user)
        return NextResponse.json(fallback)
    } catch (error: any) {
        if (
            error &&
            (error.digest === "DYNAMIC_SERVER_USAGE" ||
                String(error).includes("Dynamic server usage"))
        ) {
            throw error
        }
        console.error("[TAGS_GET]", error)
        return NextResponse.json({ error: "Internal Error" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await req.json()
        const parsed = tagSchema.parse(body)

        const { data, error } = await supabase
            .from("user_tags")
            .insert({
                user_id: user.id,
                name: parsed.name,
                color: parsed.color,
            })
            .select()
            .single()

        if (!error && data) {
            return NextResponse.json(data, { status: 201 })
        }

        // Fallback to user_metadata if user_tags table isn't migrated yet
        const current: UserTagItem[] = Array.isArray(user.user_metadata?.custom_tags)
            ? user.user_metadata.custom_tags
            : []

        const duplicate = current.find(
            (t) => t.name.toLowerCase() === parsed.name.toLowerCase()
        )
        if (duplicate) {
            return NextResponse.json(duplicate)
        }

        const created: UserTagItem = {
            id: crypto.randomUUID(),
            name: parsed.name,
            color: parsed.color,
            created_at: new Date().toISOString(),
        }

        await supabase.auth.updateUser({
            data: {
                ...(user.user_metadata || {}),
                custom_tags: [...current, created],
            },
        })

        return NextResponse.json(created, { status: 201 })
    } catch (error: any) {
        if (
            error &&
            (error.digest === "DYNAMIC_SERVER_USAGE" ||
                String(error).includes("Dynamic server usage"))
        ) {
            throw error
        }
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Nombre de etiqueta inválido" }, { status: 400 })
        }
        console.error("[TAGS_POST]", error)
        return NextResponse.json({ error: "Internal Error" }, { status: 500 })
    }
}

export async function PATCH(req: Request) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await req.json()
        const id = String(body.id || "")
        if (!id) {
            return NextResponse.json({ error: "ID required" }, { status: 400 })
        }

        const parsed = tagSchema.partial().parse(body)

        const { data, error } = await supabase
            .from("user_tags")
            .update({
                ...(parsed.name ? { name: parsed.name } : {}),
                ...(parsed.color ? { color: parsed.color } : {}),
            })
            .eq("id", id)
            .eq("user_id", user.id)
            .select()
            .maybeSingle()

        if (!error && data) {
            return NextResponse.json(data)
        }

        const current: UserTagItem[] = Array.isArray(user.user_metadata?.custom_tags)
            ? user.user_metadata.custom_tags
            : []
        const updated = current.map((t) =>
            t.id === id
                ? {
                      ...t,
                      ...(parsed.name ? { name: parsed.name } : {}),
                      ...(parsed.color ? { color: parsed.color } : {}),
                  }
                : t
        )
        await supabase.auth.updateUser({
            data: { ...(user.user_metadata || {}), custom_tags: updated },
        })
        return NextResponse.json(updated.find((t) => t.id === id) || { id, ...parsed })
    } catch (error: any) {
        if (
            error &&
            (error.digest === "DYNAMIC_SERVER_USAGE" ||
                String(error).includes("Dynamic server usage"))
        ) {
            throw error
        }
        console.error("[TAGS_PATCH]", error)
        return NextResponse.json({ error: "Internal Error" }, { status: 500 })
    }
}

export async function DELETE(req: Request) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const id = searchParams.get("id")
        if (!id) {
            return NextResponse.json({ error: "ID required" }, { status: 400 })
        }

        const { error } = await supabase
            .from("user_tags")
            .delete()
            .eq("id", id)
            .eq("user_id", user.id)

        if (error) {
            const current: UserTagItem[] = Array.isArray(user.user_metadata?.custom_tags)
                ? user.user_metadata.custom_tags
                : []
            const filtered = current.filter((t) => t.id !== id)
            await supabase.auth.updateUser({
                data: { ...(user.user_metadata || {}), custom_tags: filtered },
            })
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        if (
            error &&
            (error.digest === "DYNAMIC_SERVER_USAGE" ||
                String(error).includes("Dynamic server usage"))
        ) {
            throw error
        }
        console.error("[TAGS_DELETE]", error)
        return NextResponse.json({ error: "Internal Error" }, { status: 500 })
    }
}
