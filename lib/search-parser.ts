export type SearchResult = {
    id: string
    type: "NAVIGATION" | "ACTION" | "FILTER"
    title: string
    subtitle?: string
    url: string
    score: number
}

export const normalizeText = (text: string) =>
    text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()

const MODULE_INDEX: Array<{
    id: string
    title: string
    subtitle: string
    url: string
    keywords: string[]
}> = [
    {
        id: "mod-dashboard",
        title: "Inicio",
        subtitle: "Resumen financiero y métricas del mes",
        url: "/dashboard",
        keywords: ["inicio", "dashboard", "resumen", "home", "panel"],
    },
    {
        id: "mod-transactions",
        title: "Movimientos",
        subtitle: "Historial completo de ingresos, gastos y transferencias",
        url: "/dashboard/transactions",
        keywords: ["movimientos", "transacciones", "historial", "operaciones"],
    },
    {
        id: "mod-accounts",
        title: "Mis cuentas y tarjetas",
        subtitle: "Saldos, bancos, efectivo y tarjetas de crédito",
        url: "/dashboard/accounts",
        keywords: ["cuentas", "bancos", "tarjetas", "credito", "efectivo", "patrimonio", "saldo"],
    },
    {
        id: "mod-budgets",
        title: "Presupuestos",
        subtitle: "Límites de gasto por categoría",
        url: "/dashboard/budgets",
        keywords: ["presupuestos", "limites", "topes", "control"],
    },
    {
        id: "mod-loans",
        title: "Préstamos",
        subtitle: "Por cobrar, por pagar y cuotas",
        url: "/dashboard/loans",
        keywords: ["prestamos", "deudas", "cuotas", "cobrar", "pagar"],
    },
    {
        id: "mod-planning",
        title: "Planificación (Base Cero)",
        subtitle: "Asigna cada sol de tus ingresos (ZBB)",
        url: "/dashboard/planning",
        keywords: ["planificacion", "zbb", "base cero", "planificar", "asignar"],
    },
    {
        id: "mod-goals",
        title: "Metas de ahorro",
        subtitle: "Objetivos y aportes acumulados",
        url: "/dashboard/savings-goals",
        keywords: ["metas", "ahorro", "objetivos", "alcancia"],
    },
    {
        id: "mod-analysis",
        title: "Análisis Financiero",
        subtitle: "Gráficos avanzados y salud financiera",
        url: "/dashboard/analysis",
        keywords: ["analisis", "graficos", "estadisticas", "salud", "tendencias"],
    },
    {
        id: "mod-reports",
        title: "Reportes (Excel y PDF)",
        subtitle: "Exportar reporte ejecutivo y detalle de movimientos",
        url: "/dashboard/reports",
        keywords: ["reportes", "informes", "excel", "pdf", "exportar", "descargar"],
    },
    {
        id: "mod-settings",
        title: "Ajustes y Apariencia",
        subtitle: "Color de marca, modo oscuro, moneda y perfil",
        url: "/dashboard/settings",
        keywords: ["ajustes", "configuracion", "tema", "color", "oscuro", "perfil", "moneda"],
    },
]

export function parseSmartQuery(query: string): SearchResult[] {
    const q = normalizeText(query)
    if (!q) return []

    const results: SearchResult[] = []

    // 1. Natural quick-entry detection e.g. "gasto 50 almuerzo" or "ingreso 1200 sueldo"
    const quickExpenseMatch = q.match(/^(?:gasto|gastar|pague|pago)\s+(\d+(?:[.,]\d+)?)(?:\s+(.+))?$/)
    if (quickExpenseMatch) {
        const amt = quickExpenseMatch[1]
        const concept = quickExpenseMatch[2]?.trim()
        results.push({
            id: "act-quick-expense-nlp",
            type: "ACTION",
            title: concept
                ? `Registrar gasto de ${amt} — ${concept}`
                : `Registrar gasto de ${amt}`,
            subtitle: "Ir directo al registro de gasto",
            url: "/dashboard/transactions/new?type=EXPENSE",
            score: 140,
        })
    }

    const quickIncomeMatch = q.match(/^(?:ingreso|cobre|sueldo|recibi)\s+(\d+(?:[.,]\d+)?)(?:\s+(.+))?$/)
    if (quickIncomeMatch) {
        const amt = quickIncomeMatch[1]
        const concept = quickIncomeMatch[2]?.trim()
        results.push({
            id: "act-quick-income-nlp",
            type: "ACTION",
            title: concept
                ? `Registrar ingreso de ${amt} — ${concept}`
                : `Registrar ingreso de ${amt}`,
            subtitle: "Ir directo al registro de ingreso",
            url: "/dashboard/transactions/new?type=INCOME",
            score: 140,
        })
    }

    // 2. Quick action intents
    if (q.includes("gast") || q.includes("egres") || q.includes("compra")) {
        results.push({
            id: "act-new-expense",
            type: "ACTION",
            title: "Registrar Nuevo Gasto",
            subtitle: "Abrir registro rápido de egreso",
            url: "/dashboard/transactions/new?type=EXPENSE",
            score: 115,
        })
    }

    if (q.includes("ingres") || q.includes("sueldo") || q.includes("cobr")) {
        results.push({
            id: "act-new-income",
            type: "ACTION",
            title: "Registrar Nuevo Ingreso",
            subtitle: "Abrir registro rápido de entrada",
            url: "/dashboard/transactions/new?type=INCOME",
            score: 115,
        })
    }

    if (q.includes("pagar tarjeta") || q.includes("tarjeta")) {
        results.push({
            id: "act-pay-card",
            type: "ACTION",
            title: "Pagar Tarjeta de Crédito",
            subtitle: "Registrar transferencia hacia tu tarjeta",
            url: "/dashboard/transactions/new?type=TRANSFER",
            score: 120,
        })
    }

    if (q.includes("transfer") || q.includes("mover")) {
        results.push({
            id: "act-transfer",
            type: "ACTION",
            title: "Nueva Transferencia",
            subtitle: "Mover saldo entre cuentas o pagar tarjeta",
            url: "/dashboard/transactions/new?type=TRANSFER",
            score: 110,
        })
    }

    if (q.includes("excel") || q.includes("pdf") || q.includes("export") || q.includes("report")) {
        results.push({
            id: "act-export-reports",
            type: "ACTION",
            title: "Exportar Reportes (Excel / PDF)",
            subtitle: "Genera tu reporte financiero por rango de fechas",
            url: "/dashboard/reports",
            score: 118,
        })
    }

    if ((q.includes("nuev") || q.includes("crear")) && q.includes("meta")) {
        results.push({
            id: "act-new-goal",
            type: "ACTION",
            title: "Crear Nueva Meta de Ahorro",
            subtitle: "Define un objetivo financiero",
            url: "/dashboard/savings-goals/new",
            score: 120,
        })
    }

    // 3. System Modules
    for (const mod of MODULE_INDEX) {
        const titleNorm = normalizeText(mod.title)
        const matchesKeyword = mod.keywords.some((k) => k.includes(q) || q.includes(k))
        const matchesTitle = titleNorm.includes(q)
        if (matchesTitle || matchesKeyword) {
            results.push({
                id: mod.id,
                type: "NAVIGATION",
                title: mod.title,
                subtitle: mod.subtitle,
                url: mod.url,
                score: matchesTitle ? 105 : 85,
            })
        }
    }

    // Deduplicate by url keeping highest score
    const deduped = new Map<string, SearchResult>()
    for (const item of results) {
        const existing = deduped.get(item.id)
        if (!existing || item.score > existing.score) {
            deduped.set(item.id, item)
        }
    }

    return Array.from(deduped.values()).sort((a, b) => b.score - a.score)
}
