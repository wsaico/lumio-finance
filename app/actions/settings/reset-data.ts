'use server'

import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function resetUserData() {
    // Initialize Admin Client to bypass RLS policies
    // This is critical because some tables might not have DELETE policies for users
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )

    // User verification still happens via standard client to ensure we only delete for the requesting user
    const supabaseAuth = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()

    if (authError || !user) {
        console.error("[Reset Data] Unauthorized attempt")
        return { success: false, error: "Unauthorized" }
    }

    try {
        const userId = user.id

        // Sequential deletion to respect foreign key constraints
        // Using supabaseAdmin to bypass RLS

        // --- 1. Sub-dependencies (Child tables first) ---
        await supabaseAdmin.from('loan_installments').delete().eq('user_id', userId)
        await supabaseAdmin.from('installment_schedule').delete().eq('user_id', userId)
        await supabaseAdmin.from('goal_milestones').delete().eq('user_id', userId)
        await supabaseAdmin.from('goal_account_links').delete().eq('user_id', userId)
        await supabaseAdmin.from('budget_lines').delete().eq('user_id', userId)
        await supabaseAdmin.from('credit_card_statements').delete().eq('user_id', userId)

        // --- 2. Transactions & Movements ---
        await supabaseAdmin.from('transactions').delete().eq('user_id', userId)
        await supabaseAdmin.from('loan_payments').delete().eq('user_id', userId)
        await supabaseAdmin.from('goal_contributions').delete().eq('user_id', userId)
        await supabaseAdmin.from('credit_card_purchases').delete().eq('user_id', userId)
        await supabaseAdmin.from('petty_cash_expenses').delete().eq('user_id', userId)
        await supabaseAdmin.from('account_balance_adjustments').delete().eq('user_id', userId)

        // --- 3. Planning & Budgets ---
        await supabaseAdmin.from('budgets').delete().eq('user_id', userId)
        await supabaseAdmin.from('zbb_allocations').delete().eq('user_id', userId)
        await supabaseAdmin.from('zbb_planning_cycles').delete().eq('user_id', userId)

        // --- 4. Main Financial Products ---
        await supabaseAdmin.from('savings_goals').delete().eq('user_id', userId)
        await supabaseAdmin.from('loans').delete().eq('user_id', userId)
        await supabaseAdmin.from('credit_cards').delete().eq('user_id', userId)
        await supabaseAdmin.from('petty_cash_funds').delete().eq('user_id', userId)
        await supabaseAdmin.from('accounts').delete().eq('user_id', userId)
        await supabaseAdmin.from('accounts_payable').delete().eq('user_id', userId)
        await supabaseAdmin.from('accounts_receivable').delete().eq('user_id', userId)

        // --- 5. Rules & Logs ---
        await supabaseAdmin.from('recurring_rules').delete().eq('user_id', userId)
        await supabaseAdmin.from('notifications').delete().eq('user_id', userId)
        await supabaseAdmin.from('google_tokens').delete().eq('user_id', userId)

        // Note: We deliberately KEEP Categories and Profile settings so the user can start over immediately
        // without needing to see "seed" duplications or empty screens.

        revalidatePath('/dashboard')
        return { success: true }

    } catch (error) {
        console.error("[Reset Data] Failed to delete data:", error)
        return { success: false, error: "Database error during reset" }
    }
}
