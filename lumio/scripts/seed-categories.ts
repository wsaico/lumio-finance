
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const EXPENSE_CATEGORIES = [
    {
        name: 'Alimentación',
        icon: 'utensils',
        color: '#ef4444', // red
        subcategories: ['Restaurantes', 'Mercado', 'Bebidas', 'Snacks']
    },
    {
        name: 'Transporte',
        icon: 'car',
        color: '#f97316', // orange
        subcategories: ['Taxi/Uber', 'Transporte Público', 'Gasolina', 'Mantenimiento', 'Estacionamiento']
    },
    {
        name: 'Vivienda',
        icon: 'home',
        color: '#eab308', // yellow
        subcategories: ['Alquiler', 'Luz', 'Agua', 'Internet', 'Mantenimiento']
    },
    {
        name: 'Ocio',
        icon: 'party-popper',
        color: '#8b5cf6', // violet
        subcategories: ['Cine', 'Salidas', 'Juegos', 'Streaming', 'Hobbies']
    },
    {
        name: 'Salud',
        icon: 'heart-pulse',
        color: '#ec4899', // pink
        subcategories: ['Farmacia', 'Consultas', 'Seguro', 'Deporte']
    },
    {
        name: 'Educación',
        icon: 'graduation-cap',
        color: '#3b82f6', // blue
        subcategories: ['Cursos', 'Libros', 'Matrícula', 'Materiales']
    },
    {
        name: 'Compras',
        icon: 'shopping-bag',
        color: '#14b8a6', // teal
        subcategories: ['Ropa', 'Tecnología', 'Hogar', 'Regalos']
    },
    {
        name: 'Otros',
        icon: 'circle-help',
        color: '#6b7280', // gray
        subcategories: ['Varios', 'Donaciones']
    }
]

const INCOME_CATEGORIES = [
    {
        name: 'Laboral',
        icon: 'briefcase',
        color: '#10b981', // emerald
        subcategories: ['Salario', 'Bonos', 'Horas Extras', 'Comisiones']
    },
    {
        name: 'Inversiones',
        icon: 'trending-up',
        color: '#0ea5e9', // sky
        subcategories: ['Dividendos', 'Intereses', 'Rendimientos']
    },
    {
        name: 'Otros Ingresos',
        icon: 'wallet',
        color: '#6366f1', // indigo
        subcategories: ['Regalos', 'Venta de Artículos', 'Reembolsos']
    }
]

async function main() {
    console.log('🌱 Starting category seeding...')

    // Get all profiles (users)
    const users = await prisma.profile.findMany()

    if (users.length === 0) {
        console.log('⚠️ No users found. Please create a user first.')
        return
    }

    for (const user of users) {
        console.log(`Processing user: ${user.username || user.id}`)

        // 1. Expense Categories
        for (const [index, cat] of EXPENSE_CATEGORIES.entries()) {
            // Upsert Category
            const createdCategory = await prisma.expenseCategory.upsert({
                where: {
                    userId_name: {
                        userId: user.id,
                        name: cat.name
                    }
                },
                update: {
                    icon: cat.icon,
                    color: cat.color,
                    sortOrder: index
                },
                create: {
                    userId: user.id,
                    name: cat.name,
                    icon: cat.icon,
                    color: cat.color,
                    sortOrder: index,
                    isSystem: true
                }
            })

            // Upsert Subcategories
            for (const subName of cat.subcategories) {
                // Check if exists manually since no unique constraint on (categoryId, name) usually
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
                }
            }
        }

        // 2. Income Categories
        for (const [index, cat] of INCOME_CATEGORIES.entries()) {
            const createdCategory = await prisma.incomeCategory.upsert({
                where: {
                    userId_name: {
                        userId: user.id,
                        name: cat.name
                    }
                },
                update: {
                    icon: cat.icon,
                    color: cat.color,
                    sortOrder: index
                },
                create: {
                    userId: user.id,
                    name: cat.name,
                    icon: cat.icon,
                    color: cat.color,
                    sortOrder: index,
                    isSystem: true
                }
            })

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
                }
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
