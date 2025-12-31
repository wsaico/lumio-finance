const { Client } = require('pg');

const passwordRaw = 'Pr0v2025$$*';
const host = 'db.ocztmztsjnulshaudcnx.supabase.co';

async function applyMigration() {
    console.log("🛠️ Aplicando migración para subcategorías en Caja Chica...");

    const client = new Client({
        host: host,
        port: 5432,
        user: 'postgres',
        password: passwordRaw,
        database: 'postgres',
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000
    });

    try {
        await client.connect();
        console.log('📡 Conectado a la base de datos.');

        // 1. Add column if not exists
        console.log('📝 Añadiendo columna subcategory_id...');
        await client.query(`
            ALTER TABLE IF EXISTS public.petty_cash_expenses 
            ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES public.subcategories(id) ON DELETE SET NULL;
        `);

        // 2. Create index if not exists
        console.log('📝 Creando índice...');
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_petty_cash_expenses_subcategory ON public.petty_cash_expenses(subcategory_id);
        `);

        // 3. Reload PostgREST schema cache
        console.log('🔄 Recargando caché de esquema de PostgREST...');
        await client.query("NOTIFY pgrst, 'reload schema';");

        console.log('✅ ¡MIGRACIÓN COMPLETADA CON ÉXITO!');

        await client.end();
        process.exit(0);
    } catch (err) {
        console.error('❌ FALLÓ la migración.');
        console.error('Error:', err);
        if (err.code) console.error('Error Code:', err.code);
        process.exit(1);
    }
}

applyMigration();
