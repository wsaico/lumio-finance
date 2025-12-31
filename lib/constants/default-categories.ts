
export const DEFAULT_EXPENSE_CATEGORIES = [
    {
        id: 'e1000000-0000-4000-a000-000000000001',
        name: 'Comida y bebidas',
        icon: 'utensils',
        color: '#ef4444', // red-500
        isSystem: true,
        budget_rule: 'NEED',
        subcategories: [
            { id: 'a1000000-0000-4000-a000-000000000001', name: 'Restaurantes', icon: 'utensils' },
            { id: 'a1000000-0000-4000-a000-000000000002', name: 'Supermercado', icon: 'shopping-bag' },
            { id: 'a1000000-0000-4000-a000-000000000003', name: 'Bar/Café', icon: 'coffee' },
            { id: 'a1000000-0000-4000-a000-000000000004', name: 'Comida rápida', icon: 'pizza' },
            { id: 'a1000000-0000-4000-a000-000000000005', name: 'Delivery', icon: 'truck' }
        ]
    },
    {
        id: 'e1000000-0000-4000-a000-000000000002',
        name: 'Compras',
        icon: 'shopping-cart',
        color: '#06b6d4', // cyan-500
        isSystem: true,
        budget_rule: 'WANT',
        subcategories: [
            { id: 'a1000000-0000-4000-a000-000000000006', name: 'Ropa y calzado', icon: 'shirt' },
            { id: 'a1000000-0000-4000-a000-000000000007', name: 'Electrónica', icon: 'zap' },
            { id: 'a1000000-0000-4000-a000-000000000008', name: 'Farmacia', icon: 'heart' },
            { id: 'a1000000-0000-4000-a000-000000000009', name: 'Libros', icon: 'book-open' },
            { id: 'a1000000-0000-4000-a000-000000000010', name: 'Regalos', icon: 'gift' },
            { id: 'a1000000-0000-4000-a000-000000000011', name: 'Decoración', icon: 'paintbrush' }
        ]
    },
    {
        id: 'e1000000-0000-4000-a000-000000000003',
        name: 'Vivienda',
        icon: 'home',
        color: '#f59e0b', // amber-500
        isSystem: true,
        budget_rule: 'NEED',
        subcategories: [
            { id: 'a1000000-0000-4000-a000-000000000012', name: 'Alquiler', icon: 'key' },
            { id: 'a1000000-0000-4000-a000-000000000013', name: 'Hipoteca', icon: 'home' },
            { id: 'a1000000-0000-4000-a000-000000000014', name: 'Servicios básicos', icon: 'zap' },
            { id: 'a1000000-0000-4000-a000-000000000015', name: 'Mantenimiento', icon: 'wrench' },
            { id: 'a1000000-0000-4000-a000-000000000016', name: 'Seguros de hogar', icon: 'shield' }
        ]
    },
    {
        id: 'e1000000-0000-4000-a000-000000000004',
        name: 'Transporte',
        icon: 'bus',
        color: '#6b7280', // gray-500
        isSystem: true,
        budget_rule: 'NEED',
        subcategories: [
            { id: 'a1000000-0000-4000-a000-000000000017', name: 'Transporte público', icon: 'bus' },
            { id: 'a1000000-0000-4000-a000-000000000018', name: 'Taxi/Uber', icon: 'car' },
            { id: 'a1000000-0000-4000-a000-000000000019', name: 'Combustible', icon: 'fuel' },
            { id: 'a1000000-0000-4000-a000-000000000020', name: 'Estacionamiento', icon: 'circle-parking' },
            { id: 'a1000000-0000-4000-a000-000000000021', name: 'Peajes', icon: 'circle-dollar-sign' }
        ]
    },
    {
        id: 'e1000000-0000-4000-a000-000000000005',
        name: 'Vehículo',
        icon: 'car',
        color: '#a855f7', // purple-500
        isSystem: true,
        budget_rule: 'NEED',
        subcategories: [
            { id: 'a1000000-0000-4000-a000-000000000022', name: 'Cuota del vehículo', icon: 'credit-card' },
            { id: 'a1000000-0000-4000-a000-000000000023', name: 'Seguro del vehículo', icon: 'shield' },
            { id: 'a1000000-0000-4000-a000-000000000024', name: 'Mantenimiento', icon: 'wrench' },
            { id: 'a1000000-0000-4000-a000-000000000025', name: 'Reparaciones', icon: 'wrench' },
            { id: 'a1000000-0000-4000-a000-000000000026', name: 'Impuestos vehiculares', icon: 'file-text' }
        ]
    },
    {
        id: 'e1000000-0000-4000-a000-000000000006',
        name: 'Vida y entretenimiento',
        icon: 'film',
        color: '#22c55e', // green-500
        isSystem: true,
        budget_rule: 'WANT',
        subcategories: [
            { id: 'a1000000-0000-4000-a000-000000000027', name: 'Lotería, juegos de azar', icon: 'ticket' },
            { id: 'a1000000-0000-4000-a000-000000000028', name: 'Alcohol, tabaco', icon: 'coffee' },
            { id: 'a1000000-0000-4000-a000-000000000029', name: 'Caridad, regalos', icon: 'gift' },
            { id: 'a1000000-0000-4000-a000-000000000030', name: 'Vacaciones, viajes, hoteles', icon: 'plane' },
            { id: 'a1000000-0000-4000-a000-000000000031', name: 'TV, Streaming', icon: 'tv' },
            { id: 'a1000000-0000-4000-a000-000000000032', name: 'Libros, audio, suscripciones', icon: 'book-open' },
            { id: 'a1000000-0000-4000-a000-000000000033', name: 'Deportes', icon: 'dumbbell' },
            { id: 'a1000000-0000-4000-a000-000000000034', name: 'Cine y teatro', icon: 'ticket' },
            { id: 'a1000000-0000-4000-a000-000000000035', name: 'Hobbies', icon: 'camera' },
            { id: 'a1000000-0000-4000-a000-000000000036', name: 'Eventos', icon: 'music' }
        ]
    },
    {
        id: 'e1000000-0000-4000-a000-000000000007',
        name: 'Comunicación, PC',
        icon: 'smartphone',
        color: '#3b82f6', // blue-500
        isSystem: true,
        budget_rule: 'NEED',
        subcategories: [
            { id: 'a1000000-0000-4000-a000-000000000037', name: 'Internet', icon: 'wifi' },
            { id: 'a1000000-0000-4000-a000-000000000038', name: 'Teléfono móvil', icon: 'phone' },
            { id: 'a1000000-0000-4000-a000-000000000039', name: 'TV por cable', icon: 'tv' },
            { id: 'a1000000-0000-4000-a000-000000000040', name: 'Software', icon: 'monitor' },
            { id: 'a1000000-0000-4000-a000-000000000041', name: 'Hardware', icon: 'hard-drive' }
        ]
    },
    {
        id: 'e1000000-0000-4000-a000-000000000008',
        name: 'Gastos financieros',
        icon: 'dollar-sign',
        color: '#14b8a6', // teal-500
        isSystem: true,
        budget_rule: 'NEED',
        subcategories: [
            { id: 'a1000000-0000-4000-a000-000000000042', name: 'Comisiones bancarias', icon: 'percent' },
            { id: 'a1000000-0000-4000-a000-000000000043', name: 'Intereses', icon: 'trending-down' },
            { id: 'a1000000-0000-4000-a000-000000000044', name: 'Tarjetas de crédito', icon: 'credit-card' },
            { id: 'a1000000-0000-4000-a000-000000000045', name: 'Préstamos', icon: 'landmark' },
            { id: 'a1000000-0000-4000-a000-000000000046', name: 'Impuestos', icon: 'file-text' }
        ]
    },
    {
        id: 'e1000000-0000-4000-a000-000000000009',
        name: 'Inversiones',
        icon: 'trending-up',
        color: '#ec4899', // pink-500
        isSystem: true,
        budget_rule: 'SAVINGS',
        subcategories: [
            { id: 'a1000000-0000-4000-a000-000000000047', name: 'Ahorros', icon: 'piggy-bank' },
            { id: 'a1000000-0000-4000-a000-000000000048', name: 'Acciones', icon: 'trending-up' },
            { id: 'a1000000-0000-4000-a000-000000000049', name: 'Fondos de inversión', icon: 'wallet' },
            { id: 'a1000000-0000-4000-a000-000000000050', name: 'Criptomonedas', icon: 'bitcoin' },
            { id: 'a1000000-0000-4000-a000-000000000051', name: 'Bienes raíces', icon: 'building' }
        ]
    },
    {
        id: 'e1000000-0000-4000-a000-000000000010',
        name: 'Otros',
        icon: 'more-horizontal',
        color: '#9ca3af', // gray-400
        isSystem: true,
        budget_rule: 'WANT',
        subcategories: [
            { id: 'a1000000-0000-4000-a000-000000000052', name: 'Educación', icon: 'graduation-cap' },
            { id: 'a1000000-0000-4000-a000-000000000053', name: 'Salud', icon: 'heart' },
            { id: 'a1000000-0000-4000-a000-000000000054', name: 'Mascotas', icon: 'dog' },
            { id: 'a1000000-0000-4000-a000-000000000055', name: 'Donaciones', icon: 'hand-heart' },
            { id: 'a1000000-0000-4000-a000-000000000056', name: 'Varios', icon: 'more-vertical' }
        ]
    }
]

export const DEFAULT_INCOME_CATEGORIES = [
    {
        id: 'b1000000-0000-4000-a000-000000000001',
        name: 'Ingresos',
        icon: 'dollar-sign',
        color: '#eab308', // yellow-500
        isSystem: true,
        subcategories: [
            { id: 'f1000000-0000-4000-a000-000000000001', name: 'Salario' },
            { id: 'f1000000-0000-4000-a000-000000000002', name: 'Bonos' },
            { id: 'f1000000-0000-4000-a000-000000000003', name: 'Freelance' },
            { id: 'f1000000-0000-4000-a000-000000000004', name: 'Inversiones' },
            { id: 'f1000000-0000-4000-a000-000000000005', name: 'Otros ingresos' }
        ]
    }
]
