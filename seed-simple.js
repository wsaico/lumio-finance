
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const EXPENSE_CATEGORIES = [
    {
        name: 'Alimentación',
        icon: 'utensils',
        color: '#ef4444',
        subcategories: ['Restaurantes', 'Mercado', 'Bebidas', 'Snacks']
    },
    {
        name: 'Transporte',
        icon: 'car',
        color: '#f97316',
        subcategories: ['Taxi/Uber', 'Transporte Público', 'Gasolina', 'Mantenimiento', 'Estacionamiento']
    },
    {
        name: 'Vivienda',
        icon: 'home',
        color: '#eab308',
        subcategories: ['Alquiler', 'Luz', 'Agua', 'Internet', 'Mantenimiento']
    },
    {
        name: 'Ocio',
        icon: 'party-popper',
        color: '#8b5cf6',
        subcategories: ['Cine', 'Salidas', 'Juegos', 'Streaming', 'Hobbies']
    },
    {
        name: 'Salud',
        icon: 'heart-pulse',
        color: '#ec4899',
        subcategories: ['Farmacia', 'Consultas', 'Seguro', 'Deporte']
    },
    {
        name: 'Educación',
        icon: 'graduation-cap',
        color: '#3b82f6',
        subcategories: ['Cursos', 'Libros', 'Matrícula', 'Materiales']
    },
    {
        name: 'Compras',
        icon: 'shopping-bag',
        color: '#14b8a6',
        subcategories: ['Ropa', 'Tecnología', 'Hogar', 'Regalos']
    },
    {
        name: 'Otros',
        icon: 'circle-help',
        color: '#6b7280',
        subcategories: ['Varios', 'Donaciones']
    }
]

const INCOME_CATEGORIES = [
    {
        name: 'Laboral',
        icon: 'briefcase',
        color: '#10b981',
        subcategories: ['Salario', 'Bonos', 'Horas Extras', 'Comisiones']
    },
    {
        name: 'Inversiones',
        icon: 'trending-up',
        color: '#0ea5e9',
        subcategories: ['Dividendos', 'Intereses', 'Rendimientos']
    },
    {
        name: 'Otros Ingresos',
        icon: 'wallet',
        color: '#6366f1',
        subcategories: ['Regalos', 'Venta de Artículos', 'Reembolsos']
    }
]

async function main() {
    console.log('🌱 Starting category seeding (JS)...')

    // Get first user
    const user = await prisma.profile.findFirst()

    if (!user) {
        console.log('⚠️ No users found. Please create a user first.')
        return
    }

    const userId = user.id
    console.log(`Processing user: ${userId}`)

    // 1. Expense Categories
    for (const [index, cat] of EXPENSE_CATEGORIES.entries()) {
        const createdCategory = await prisma.expenseCategory.upsert({
            where: {
                userId_name: {
                    userId: userId,
                    name: cat.name
                }
            },
            update: {
                icon: cat.icon,
                color: cat.color,
                sortOrder: index
            },
            create: {
                userId: userId,
                name: cat.name,
                icon: cat.icon,
                color: cat.color,
                sortOrder: index,
                isSystem: true
            }
        })

        console.log(`Created/Updated Expense Category: ${cat.name}`)

        for (const subName of cat.subcategories) {
            const existingSub = await prisma.subcategory.findFirst({
                where: {
                    expenseCategoryId: createdCategory.id,
                    name: subName
                }
            })

            if (!existingSub) {
                await prisma.subcategory.create({
                    data: {
                        expenseCategoryId: createdCategory.id,
                        name: subName
                    }
                })
                console.log(`  + Added subcategory: ${subName}`)
            }
        }
    }

    // 2. Income Categories
    for (const [index, cat] of INCOME_CATEGORIES.entries()) {
        const createdCategory = await prisma.incomeCategory.upsert({
            where: {
                userId_name: {
                    userId: userId,
                    name: cat.name
                }
            },
            update: {
                icon: cat.icon,
                color: cat.color,
                sortOrder: index
            },
            create: {
                userId: userId,
                name: cat.name,
                icon: cat.icon,
                color: cat.color,
                sortOrder: index,
                isSystem: true
            }
        })

        console.log(`Created/Updated Income Category: ${cat.name}`)

        for (const subName of cat.subcategories) {
            const existingSub = await prisma.subcategory.findFirst({
                where: {
                    incomeCategoryId: createdCategory.id,
                    name: subName
                }
            })

            if (!existingSub) {
                await prisma.subcategory.create({
                    data: {
                        incomeCategoryId: createdCategory.id,
                        name: subName
                    }
                })
                console.log(`  + Added subcategory: ${subName}`)
            }
        }
    }

    console.log('✅ Seeding completed!')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
