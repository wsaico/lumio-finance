const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkSchema() {
    try {
        console.log('=== RADIOGRAFÍA DE LA BASE DE DATOS ===\n')

        // 1. Verificar tabla expense_categories
        console.log('📋 EXPENSE CATEGORIES:')
        const expenseCategories = await prisma.$queryRaw`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'expense_categories'
            ORDER BY ordinal_position
        `
        console.table(expenseCategories)

        // 2. Verificar tabla income_categories
        console.log('\n📋 INCOME CATEGORIES:')
        const incomeCategories = await prisma.$queryRaw`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'income_categories'
            ORDER BY ordinal_position
        `
        console.table(incomeCategories)

        // 3. Verificar tabla transactions
        console.log('\n📋 TRANSACTIONS:')
        const transactions = await prisma.$queryRaw`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'transactions'
            ORDER BY ordinal_position
        `
        console.table(transactions)

        // 4. Verificar foreign keys de transactions
        console.log('\n🔗 FOREIGN KEYS EN TRANSACTIONS:')
        const fks = await prisma.$queryRaw`
            SELECT
                tc.constraint_name,
                tc.table_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_name = 'transactions'
        `
        console.table(fks)

        // 5. Contar registros en expense_categories
        console.log('\n📊 CONTEO DE REGISTROS:')
        const expenseCount = await prisma.expenseCategory.count()
        console.log(`Expense Categories: ${expenseCount}`)

        const incomeCount = await prisma.incomeCategory.count()
        console.log(`Income Categories: ${incomeCount}`)

        const transactionCount = await prisma.transaction.count()
        console.log(`Transactions: ${transactionCount}`)

        // 6. Mostrar categorías existentes
        if (expenseCount > 0) {
            console.log('\n💰 EXPENSE CATEGORIES EN LA BD:')
            const cats = await prisma.expenseCategory.findMany({
                take: 10,
                select: { id: true, name: true, icon: true, userId: true }
            })
            console.table(cats)
        }

        if (incomeCount > 0) {
            console.log('\n💵 INCOME CATEGORIES EN LA BD:')
            const cats = await prisma.incomeCategory.findMany({
                take: 10,
                select: { id: true, name: true, icon: true, userId: true }
            })
            console.table(cats)
        }

    } catch (error) {
        console.error('❌ ERROR:', error)
        console.error('Stack:', error.stack)
    } finally {
        await prisma.$disconnect()
    }
}

checkSchema()
