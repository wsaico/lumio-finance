
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// Or Service Role if needed for admin reading, but tests should emulate anon usually (although Row Level Security might block anon).
// Let's use Service Role for verification script to bypass RLS and ensure logic is correct first.
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    console.log('🔍 Verificando lógica 50/30/20...');

    // 1. Get a User
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    if (userError || !users.users.length) {
        console.error('❌ No se encontraron usuarios o error:', userError);
        return;
    }
    const userId = users.users[0].id;
    console.log(`👤 Usuario de prueba: ${userId}`);

    // 2. Insert Test Categories (Deleting them first to clean up? No, dangerous. Just checking existing ones.)
    console.log('📋 Verificando categorías...');
    const { data: categories } = await supabase.from('expense_categories').select('*').eq('user_id', userId);

    // Check if budget_rule exists
    if (categories.length > 0 && categories[0].budget_rule === undefined) {
        console.error('❌ La columna budget_rule NO EXISTE en expense_categories. ¿Se ejecutó el SQL?');
        return;
    }

    const needs = categories.filter(c => c.budget_rule === 'NEED').length;
    const wants = categories.filter(c => c.budget_rule === 'WANT').length;
    const savings = categories.filter(c => c.budget_rule === 'SAVINGS').length;

    console.log(`✅ Categorías encontradas: ${categories.length}`);
    console.log(`   - Necesidades (NEED): ${needs}`);
    console.log(`   - Deseos (WANT): ${wants}`);
    console.log(`   - Ahorro (SAVINGS): ${savings}`);

    if (needs === 0 && wants === 0 && savings === 0) {
        console.warn('⚠️ Todas las categorías son NULL o indefinidas en budget_rule.');
    }

    // 3. Simulate Calculation (Fetch transactions)
    const startDate = new Date().toISOString();
    // Just fetch all to see if join works
    const { data: txs, error: txError } = await supabase
        .from('transactions')
        .select(`
            id, 
            amount, 
            transaction_type,
            expense_category:expense_categories(name, budget_rule)
        `)
        .eq('user_id', userId)
        .eq('transaction_type', 'EXPENSE')
        .limit(5);

    if (txError) {
        console.error('❌ Error fetching transactions with join:', txError);
    } else {
        console.log('✅ Join Transaction -> Category funciona correctamante.');
        if (txs.length > 0) {
            console.log('   Muestra de transacción:', {
                id: txs[0].id,
                amount: txs[0].amount,
                category: txs[0].expense_category?.name,
                rule: txs[0].expense_category?.budget_rule
            });
        } else {
            console.warn('⚠️ No hay transacciones de gastos para probar.');
        }
    }

    console.log('🏁 Verificación completada.');
}

main();
