import { startOfMonth, endOfMonth, format } from "date-fns";
import { es } from "date-fns/locale";

export type SearchExample = {
    keyword: string;
    description: string;
}

export type SearchResult = {
    id: string;
    type: 'NAVIGATION' | 'ACTION' | 'FILTER' | 'AI_GENERATED';
    title: string;
    subtitle?: string;
    icon?: any;
    url: string;
    score: number; // Relevance score
};

export type SearchContext = {
    categories: any[];
    accounts: any[];
}

const MONTHS = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

const normalizeText = (text: string) =>
    text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

export function parseSmartQuery(query: string): SearchResult[] {
    const rawLower = query.toLowerCase().trim();
    if (!rawLower) return [];

    const results: SearchResult[] = [];

    // --- NAVEGACIÓN Y ACCIONES DEL SISTEMA ---

    // Transacciones y Filtros Básicos
    if (rawLower.includes('transacc') || rawLower.includes('movimien') || rawLower.includes('ver todo')) {
        results.push({
            id: 'nav-transactions',
            type: 'NAVIGATION',
            title: 'Ver Transacciones',
            subtitle: 'Historial completo de movimientos',
            url: '/dashboard/transactions',
            score: 90
        });
    }

    if (rawLower.includes('gasto')) {
        results.push({
            id: 'act-new-expense',
            type: 'ACTION',
            title: 'Registrar Nuevo Gasto',
            subtitle: 'Abrir formulario de egreso',
            url: '/dashboard/transactions?new=true&type=expense',
            score: 100
        });
    }

    if (rawLower.includes('ingres')) {
        results.push({
            id: 'act-new-income',
            type: 'ACTION',
            title: 'Registrar Nuevo Ingreso',
            subtitle: 'Abrir formulario de entrada',
            url: '/dashboard/transactions?new=true&type=income',
            score: 100
        });
    }

    if (rawLower.includes('presupuesto')) {
        results.push({
            id: 'nav-budget',
            type: 'NAVIGATION',
            title: 'Ir a Presupuestos',
            subtitle: 'Gestión y control de gastos',
            url: '/dashboard/budgets',
            score: 80
        });
        if (rawLower.includes('crear') || rawLower.includes('nuevo')) {
            results.push({
                id: 'act-budget-new',
                type: 'ACTION',
                title: 'Crear Nuevo Presupuesto',
                subtitle: 'Configurar límite de gasto',
                url: '/dashboard/budgets?new=true',
                score: 110
            });
        }
    }

    if (rawLower.includes('transfer')) {
        results.push({
            id: 'act-transfer',
            type: 'ACTION',
            title: 'Nueva Transferencia',
            subtitle: 'Mover dinero entre cuentas',
            url: '/dashboard/transactions?transfer=true',
            score: 95
        });
    }

    if (rawLower.includes('meta') || rawLower.includes('ahorro')) {
        results.push({
            id: 'nav-goals',
            type: 'NAVIGATION',
            title: 'Metas de Ahorro',
            subtitle: 'Seguimiento de objetivos financieros',
            url: '/dashboard/savings-goals',
            score: 80
        });
    }

    if (rawLower.includes('caja chica')) {
        results.push({
            id: 'nav-petty',
            type: 'NAVIGATION',
            title: 'Caja Chica',
            subtitle: 'Administración de gastos menores',
            url: '/dashboard/petty-cash',
            score: 80
        });
    }

    if (rawLower.includes('prestam') || rawLower.includes('deuda') || rawLower.includes('credito')) {
        results.push({
            id: 'nav-loans',
            type: 'NAVIGATION',
            title: 'Préstamos y Deudas',
            subtitle: 'Control de créditos y pagos',
            url: '/dashboard/loans',
            score: 80
        });
    }

    if (rawLower.includes('configur') || rawLower.includes('ajuste') || rawLower.includes('perfil')) {
        results.push({
            id: 'nav-settings',
            type: 'NAVIGATION',
            title: 'Configuraciones',
            subtitle: 'Personalizar app y perfil',
            url: '/dashboard/settings',
            score: 70
        });
    }

    if (rawLower.includes('analisis') || rawLower.includes('grafic') || rawLower.includes('reporte')) {
        results.push({
            id: 'nav-reports',
            type: 'NAVIGATION',
            title: 'Reportes e Informes',
            subtitle: 'Gráficos avanzados y estadísticas',
            url: '/dashboard/reports',
            score: 70
        });
    }

    return results.sort((a, b) => b.score - a.score);
}
