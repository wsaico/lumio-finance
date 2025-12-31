const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function applyMigration() {
    console.log("🛠️ Aplicando migración via Prisma ($queryRaw)...");

    try {
        // 1. Add column if not exists
        console.log('📝 Añadiendo columna subcategory_id...');
        await prisma.$executeRawUnsafe(`
            ALTER TABLE public.petty_cash_expenses 
            ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES public.subcategories(id) ON DELETE SET NULL;
        `);

        // 2. Create index if not exists
        console.log('📝 Creando índice...');
        await prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS idx_petty_cash_expenses_subcategory ON public.petty_cash_expenses(subcategory_id);
        `);

        // 3. Reload PostgREST schema cache
        console.log('🔄 Recargando caché de esquema de PostgREST...');
        await prisma.$executeRawUnsafe("NOTIFY pgrst, 'reload schema';");

        console.log('✅ ¡MIGRACIÓN COMPLETADA CON ÉXITO!');

    } catch (err) {
        console.error('❌ FALLÓ la migración prisma.');
        console.error('Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

applyMigration();
