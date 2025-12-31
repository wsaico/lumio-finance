import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
    connectionString: process.env.DATABASE_URL
});

async function check() {
    try {
        await client.connect();
        console.log('✅ Conectado a la base de datos\n');

        // 1. Columnas de expense_categories
        console.log('📋 EXPENSE_CATEGORIES:');
        const expenseCols = await client.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'expense_categories'
            ORDER BY ordinal_position
        `);
        console.table(expenseCols.rows);

        // 2. Columnas de income_categories
        console.log('\n📋 INCOME_CATEGORIES:');
        const incomeCols = await client.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'income_categories'
            ORDER BY ordinal_position
        `);
        console.table(incomeCols.rows);

        // 3. Foreign keys de transactions
        console.log('\n🔗 FOREIGN KEYS DE TRANSACTIONS:');
        const fks = await client.query(`
            SELECT
                tc.constraint_name,
                kcu.column_name,
                ccu.table_name AS foreign_table,
                ccu.column_name AS foreign_column
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_name = 'transactions'
        `);
        console.table(fks.rows);

        // 4. Contar registros
        console.log('\n📊 CONTEO:');
        const counts = await client.query(`
            SELECT
                (SELECT COUNT(*) FROM expense_categories) as expense_cats,
                (SELECT COUNT(*) FROM income_categories) as income_cats,
                (SELECT COUNT(*) FROM transactions) as transactions
        `);
        console.table(counts.rows);

        // 5. Ver expense_categories existentes
        const expenseCats = await client.query(`
            SELECT id, user_id, name, icon, is_active
            FROM expense_categories
            LIMIT 10
        `);
        if (expenseCats.rows.length > 0) {
            console.log('\n💰 EXPENSE CATEGORIES:');
            console.table(expenseCats.rows);
        }

        // 6. Ver income_categories existentes
        const incomeCats = await client.query(`
            SELECT id, user_id, name, icon, is_active
            FROM income_categories
            LIMIT 10
        `);
        if (incomeCats.rows.length > 0) {
            console.log('\n💵 INCOME CATEGORIES:');
            console.table(incomeCats.rows);
        }

    } catch (error) {
        console.error('❌ ERROR:', error.message);
        console.error(error.stack);
    } finally {
        await client.end();
    }
}

check();
