import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
    console.log("🛠️ Iniciando migración via API Route...")

    // Debug ENV
    const dbUrl = process.env.DATABASE_URL
    console.log("DATABASE_URL defined:", !!dbUrl)
    if (dbUrl) {
        console.log("DATABASE_URL starts with:", dbUrl.substring(0, 20))
    }

    try {
        // 1. Add column
        console.log('📝 Intentando ejecutar SQL...')
        await prisma.$executeRawUnsafe(`
            ALTER TABLE public.petty_cash_expenses 
            ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES public.subcategories(id) ON DELETE SET NULL;
        `)
        console.log('✅ Columna subcategory_id añadida/verificada')

        // 2. Create index
        await prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS idx_petty_cash_expenses_subcategory ON public.petty_cash_expenses(subcategory_id);
        `)
        console.log('✅ Índice creado/verificado')

        // 3. Reload PostgREST schema cache
        await prisma.$executeRawUnsafe("NOTIFY pgrst, 'reload schema';")
        console.log('✅ PostgREST schema reloaded')

        return NextResponse.json({
            success: true,
            message: "Migración de Caja Chica completada con éxito",
            dbDetected: !!dbUrl
        })
    } catch (error: any) {
        console.error('❌ Error en migración:', error)
        return NextResponse.json({
            success: false,
            error: error.message,
            dbDetected: !!dbUrl,
            stack: error.stack
        }, { status: 500 })
    } finally {
        await prisma.$disconnect()
    }
}
