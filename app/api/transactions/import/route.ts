export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { TransactionService } from "@/lib/services/transaction-service"
import * as z from "zod"

const importRowSchema = z.object({
    date: z.string(),
    type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]).default("EXPENSE"),
    description: z.string().trim().min(1),
    amount: z.number().positive(),
    currency: z.string().length(3).optional(),
    categoryName: z.string().optional(),
    accountId: z.string().uuid().optional(),
    accountName: z.string().optional(),
    tags: z.array(z.string()).optional(),
    notes: z.string().optional(),
})

const importPayloadSchema = z.object({
    rows: z.array(importRowSchema).min(1).max(300),
    defaultAccountId: z.string().uuid().optional(),
})

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
        const parsed = importPayloadSchema.parse(body)

        const [{ data: accounts }, { data: expCats }, { data: incCats }] = await Promise.all([
            supabase
                .from("accounts")
                .select("id, name, currency_code")
                .eq("user_id", user.id)
                .eq("is_active", true),
            supabase
                .from("expense_categories")
                .select("id, name")
                .or(`user_id.is.null,user_id.eq.${user.id}`),
            supabase
                .from("income_categories")
                .select("id, name")
                .or(`user_id.is.null,user_id.eq.${user.id}`),
        ])

        const userAccounts = accounts || []
        if (userAccounts.length === 0) {
            return NextResponse.json(
                { error: "Necesitas al menos una cuenta activa antes de importar movimientos." },
                { status: 400 }
            )
        }

        const fallbackAccount =
            userAccounts.find((a: any) => a.id === parsed.defaultAccountId) || userAccounts[0]

        let imported = 0
        const errors: string[] = []

        for (let i = 0; i < parsed.rows.length; i++) {
            const r = parsed.rows[i]
            try {
                const matchedAcc =
                    userAccounts.find((a: any) => a.id === r.accountId) ||
                    (r.accountName
                        ? userAccounts.find(
                              (a: any) => a.name.toLowerCase() === r.accountName!.trim().toLowerCase()
                          )
                        : null) ||
                    fallbackAccount

                const catPool = r.type === "INCOME" ? incCats || [] : expCats || []
                const matchedCat = r.categoryName
                    ? catPool.find(
                          (c: any) =>
                              c.name.toLowerCase() === r.categoryName!.trim().toLowerCase() ||
                              c.name.toLowerCase().includes(r.categoryName!.trim().toLowerCase())
                      )
                    : catPool[0]

                const parsedDate = new Date(r.date)
                const isoDate = Number.isNaN(parsedDate.getTime())
                    ? new Date().toISOString()
                    : parsedDate.toISOString()

                await TransactionService.processTransaction(supabase, {
                    userId: user.id,
                    type: r.type,
                    accountId: matchedAcc.id,
                    amount: r.amount,
                    currency: (r.currency || matchedAcc.currency_code || "PEN").toUpperCase(),
                    transactionDate: isoDate,
                    description: r.description,
                    notes: r.notes,
                    tags: r.tags,
                    categoryId: r.type === "TRANSFER" ? undefined : matchedCat?.id,
                    metadata: { mode: "DEFAULT", importedFromCsv: true },
                })
                imported++
            } catch (rowErr: any) {
                errors.push(`Fila ${i + 1}: ${rowErr?.message || "No se pudo importar"}`)
            }
        }

        return NextResponse.json({ imported, errors })
    } catch (error: any) {
        if (
            error &&
            (error.digest === "DYNAMIC_SERVER_USAGE" ||
                String(error).includes("Dynamic server usage"))
        ) {
            throw error
        }
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Formato de archivo inválido" }, { status: 400 })
        }
        console.error("[TRANSACTIONS_IMPORT]", error)
        return NextResponse.json({ error: "Error al importar movimientos" }, { status: 500 })
    }
}
