export const dynamic = "force-dynamic"
export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import ExcelJS from "exceljs"
import { createClient } from "@/lib/supabase/server"
import { convertAmount, getExchangeRatesMap } from "@/lib/currency"
import { DEFAULT_CURRENCY, getCurrencySymbol } from "@/lib/currencies"
import { getMonthDateRangeInTimezone, zonedWallTimeToUtcIso } from "@/lib/timezone"
import { getUserEntitlementsServer } from "@/lib/server/entitlements"
import { getServiceRoleClient } from "@/lib/server/system-settings"
import { expandCategoryIds } from "@/lib/category-utils"

type ExportPeriod =
    | "this_month"
    | "last_month"
    | "last_3_months"
    | "this_year"
    | "all"
    | "custom"

const TX_TYPE_ES: Record<string, string> = {
    INCOME: "Ingreso",
    EXPENSE: "Gasto",
    TRANSFER: "Transferencia",
}

const ACCOUNT_TYPE_ES: Record<string, string> = {
    BANK: "Cuenta Bancaria",
    CASH: "Efectivo",
    CREDIT_CARD: "Tarjeta de Crédito",
    DIGITAL: "Billetera Digital",
    INVESTMENT: "Inversión",
    SAVINGS: "Cuenta de Ahorros",
    PETTY_CASH: "Caja Chica",
}

const LOAN_STATUS_ES: Record<string, string> = {
    PENDING: "Pendiente",
    PARTIAL: "Pago parcial",
    PAID: "Pagado",
    COLLECTED: "Cobrado",
    OVERDUE: "Vencido",
    ACTIVE: "Activo",
    CANCELLED: "Cancelado",
}

const GOAL_TYPE_ES: Record<string, string> = {
    EMERGENCY: "Fondo de Emergencia",
    TRAVEL: "Viaje",
    INVESTMENT: "Inversión",
    PURCHASE: "Compra Programada",
    EDUCATION: "Educación",
    HOME: "Vivienda",
    VEHICLE: "Vehículo",
    DEBT: "Pago de Deuda",
    OTHER: "Meta General",
}

const GOAL_STATUS_ES: Record<string, string> = {
    ACTIVE: "En progreso",
    COMPLETED: "Completada",
    PAUSED: "Pausada",
    CANCELLED: "Cancelada",
}

function translateTxType(t?: string | null): string {
    if (!t) return "Gasto"
    return TX_TYPE_ES[t.toUpperCase()] || t
}

function translateAccountType(t?: string | null): string {
    if (!t) return "Cuenta Bancaria"
    return ACCOUNT_TYPE_ES[t.toUpperCase()] || t
}

function translateLoanStatus(s?: string | null): string {
    if (!s) return "Pendiente"
    return LOAN_STATUS_ES[s.toUpperCase()] || s
}

function translateGoalType(t?: string | null): string {
    if (!t) return "Meta General"
    return GOAL_TYPE_ES[t.toUpperCase()] || t
}

function translateGoalStatus(s?: string | null): string {
    if (!s) return "En progreso"
    return GOAL_STATUS_ES[s.toUpperCase()] || s
}

function resolvePeriodRange(
    period: ExportPeriod,
    timeZone: string,
    fromParam?: string | null,
    toParam?: string | null
): {
    startIso: string | null
    endIso: string | null
    label: string
} {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth() + 1

    if (period === "custom" && fromParam && toParam) {
        const [fy, fm, fd] = fromParam.split("-").map(Number)
        const [ty, tm, td] = toParam.split("-").map(Number)
        if (fy && fm && fd && ty && tm && td) {
            return {
                startIso: zonedWallTimeToUtcIso(fy, fm, fd, 0, 0, 0, 0, timeZone),
                endIso: zonedWallTimeToUtcIso(ty, tm, td, 23, 59, 59, 999, timeZone),
                label: `${fromParam} al ${toParam}`,
            }
        }
    }

    if (period === "this_month") {
        const r = getMonthDateRangeInTimezone(y, m, timeZone)
        return {
            startIso: r.startIso,
            endIso: r.endIso,
            label: `Mes actual (${String(m).padStart(2, "0")}/${y})`,
        }
    }
    if (period === "last_month") {
        const d = new Date(y, m - 2, 1)
        const r = getMonthDateRangeInTimezone(d.getFullYear(), d.getMonth() + 1, timeZone)
        return {
            startIso: r.startIso,
            endIso: r.endIso,
            label: `Mes anterior (${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()})`,
        }
    }
    if (period === "last_3_months") {
        const startDate = new Date(y, m - 3, 1)
        const startR = getMonthDateRangeInTimezone(
            startDate.getFullYear(),
            startDate.getMonth() + 1,
            timeZone
        )
        const endR = getMonthDateRangeInTimezone(y, m, timeZone)
        return { startIso: startR.startIso, endIso: endR.endIso, label: "Últimos 3 meses" }
    }
    if (period === "this_year") {
        return {
            startIso: zonedWallTimeToUtcIso(y, 1, 1, 0, 0, 0, 0, timeZone),
            endIso: zonedWallTimeToUtcIso(y, 12, 31, 23, 59, 59, 999, timeZone),
            label: `Año ${y}`,
        }
    }
    return { startIso: null, endIso: null, label: "Historial completo" }
}

function escapeCsvCell(val: unknown): string {
    const str = String(val ?? "").replace(/\r?\n/g, " ")
    if (str.includes(",") || str.includes('"') || str.includes(";")) {
        return `"${str.replace(/"/g, '""')}"`
    }
    return str
}

function buildCsvContent(transactions: any[], baseCurrency: string): string {
    const header = [
        "Fecha",
        "Tipo",
        "Descripción",
        "Categoría",
        "Cuenta",
        "Cuenta Destino",
        "Moneda",
        "Monto",
        "Monto Convertido (" + baseCurrency + ")",
        "Etiquetas",
        "Notas",
    ]
    const rows = transactions.map((t) => [
        String(t.transaction_date || "").slice(0, 10),
        translateTxType(t.transaction_type),
        t.description || "Sin descripción",
        t.categoryName || "Sin categoría",
        t.accountName || "—",
        t.transferToAccountName || "",
        t.currency_code || baseCurrency,
        Number(t.amount || 0).toFixed(2),
        Number(t.convertedAmount || t.amount || 0).toFixed(2),
        Array.isArray(t.tags) ? t.tags.join(", ") : "",
        t.notes || "",
    ])
    const lines = [header, ...rows].map((row) => row.map(escapeCsvCell).join(","))
    return `\uFEFF${lines.join("\r\n")}`
}

function fmtMoney(val: number, currency: string): string {
    const sym = getCurrencySymbol(currency)
    const num = Number(val || 0)
    return `${sym} ${num.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`
}

const THIN_BORDER: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FFE2E8F0" } },
    left: { style: "thin", color: { argb: "FFE2E8F0" } },
    bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
    right: { style: "thin", color: { argb: "FFE2E8F0" } },
}

function addSheetBanner(
    ws: ExcelJS.Worksheet,
    title: string,
    subtitle: string,
    colCount: number
) {
    const endColLetter = String.fromCharCode(64 + Math.max(2, Math.min(26, colCount)))
    const r1 = ws.addRow([title])
    ws.mergeCells(`A1:${endColLetter}1`)
    r1.height = 28
    r1.getCell(1).font = {
        name: "Calibri",
        size: 14,
        bold: true,
        color: { argb: "FFFFFFFF" },
    }
    r1.getCell(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4C1D95" },
    }
    r1.getCell(1).alignment = { vertical: "middle", horizontal: "left", indent: 1 }

    const r2 = ws.addRow([subtitle])
    ws.mergeCells(`A2:${endColLetter}2`)
    r2.height = 20
    r2.getCell(1).font = {
        name: "Calibri",
        size: 10,
        italic: true,
        color: { argb: "FF475569" },
    }
    r2.getCell(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF1F5F9" },
    }
    r2.getCell(1).alignment = { vertical: "middle", horizontal: "left", indent: 1 }

    ws.addRow([])
}

function styleTableHeader(row: ExcelJS.Row) {
    row.height = 25
    row.eachCell((cell) => {
        cell.font = { name: "Calibri", size: 10.5, bold: true, color: { argb: "FFFFFFFF" } }
        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF5B3CE6" },
        }
        cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 }
        cell.border = THIN_BORDER
    })
}

function styleDataRow(row: ExcelJS.Row, idx: number) {
    row.height = 21
    const bgArgb = idx % 2 === 1 ? "FFF8FAFC" : "FFFFFFFF"
    row.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { name: "Calibri", size: 10, color: { argb: "FF0F172A" } }
        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: bgArgb },
        }
        cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 }
        cell.border = THIN_BORDER
    })
}

function styleTotalRow(row: ExcelJS.Row) {
    row.height = 24
    row.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { name: "Calibri", size: 10.5, bold: true, color: { argb: "FF1E1B4B" } }
        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFEDE9FE" },
        }
        cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 }
        cell.border = {
            top: { style: "medium", color: { argb: "FF7C3AED" } },
            bottom: { style: "double", color: { argb: "FF7C3AED" } },
            left: { style: "thin", color: { argb: "FFDDD6FE" } },
            right: { style: "thin", color: { argb: "FFDDD6FE" } },
        }
    })
}

async function buildRealXlsxBuffer(params: {
    userName: string
    periodLabel: string
    baseCurrency: string
    totals: {
        netWorth: number
        liquidity: number
        cardDebt: number
        income: number
        expenses: number
        netCashflow: number
        receivables: number
        payables: number
        goalsSaved: number
        goalsTarget: number
    }
    accounts: any[]
    transactions: any[]
    categorySummary: any[]
    budgets: any[]
    goals: any[]
    loans: any[]
}): Promise<Buffer> {
    const {
        userName,
        periodLabel,
        baseCurrency,
        totals,
        accounts,
        transactions,
        categorySummary,
        budgets,
        goals,
        loans,
    } = params

    const wb = new ExcelJS.Workbook()
    wb.creator = "Lumio Finance"
    wb.created = new Date()
    const dateStr = new Date().toLocaleDateString("es-PE")
    const metaSub = `Titular: ${userName}   |   Periodo: ${periodLabel}   |   Moneda Base: ${baseCurrency}   |   Generado: ${dateStr}`

    // =========================================================================
    // HOJA 1: RESUMEN EJECUTIVO
    // =========================================================================
    const wsSummary = wb.addWorksheet("Resumen Ejecutivo", {
        views: [{ state: "frozen", ySplit: 4 }],
    })
    wsSummary.columns = [{ width: 36 }, { width: 22 }, { width: 32 }]
    addSheetBanner(wsSummary, "LUMIO FINANCE — RESUMEN EJECUTIVO", metaSub, 3)

    const hSum = wsSummary.addRow([
        "Indicador Financiero",
        `Importe (${baseCurrency})`,
        "Detalle / Observación",
    ])
    styleTableHeader(hSum)
    hSum.getCell(2).alignment = { vertical: "middle", horizontal: "right" }

    const summaryRows: [string, number, string, string?][] = [
        [
            "Liquidez Disponible en Cuentas",
            totals.liquidity,
            `${accounts.filter((a) => a.account_type !== "CREDIT_CARD").length} cuenta(s) operativas`,
            "FF059669",
        ],
        [
            "Deuda en Tarjetas de Crédito",
            totals.cardDebt,
            `${accounts.filter((a) => a.account_type === "CREDIT_CARD").length} tarjeta(s) registradas`,
            "FFE11D48",
        ],
        [
            "Patrimonio Neto en Cuentas",
            totals.netWorth,
            "Liquidez menos saldo utilizado en tarjetas",
            "FF4F46E5",
        ],
        [
            "Ingresos del Periodo",
            totals.income,
            `${transactions.filter((t) => t.transaction_type === "INCOME").length} ingreso(s) en el rango`,
            "FF059669",
        ],
        [
            "Gastos del Periodo",
            totals.expenses,
            `${transactions.filter((t) => t.transaction_type === "EXPENSE").length} gasto(s) en el rango`,
            "FFE11D48",
        ],
        [
            "Balance / Flujo Neto del Periodo",
            totals.netCashflow,
            totals.netCashflow >= 0 ? "Superávit en el periodo" : "Déficit en el periodo",
            totals.netCashflow >= 0 ? "FF059669" : "FFE11D48",
        ],
        [
            "Ahorro Acumulado en Metas",
            totals.goalsSaved,
            `Meta total objetivo: ${fmtMoney(totals.goalsTarget, baseCurrency)}`,
            "FF059669",
        ],
        [
            "Préstamos Por Cobrar (Activos)",
            totals.receivables,
            "Dinero pendiente que te deben",
            "FF059669",
        ],
        [
            "Préstamos y Deudas Por Pagar (Activos)",
            totals.payables,
            "Compromisos pendientes de pago",
            "FFE11D48",
        ],
    ]

    summaryRows.forEach(([label, val, note, colorArgb], idx) => {
        const r = wsSummary.addRow([label, val, note])
        styleDataRow(r, idx)
        r.getCell(1).font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF0F172A" } }
        r.getCell(2).numFmt = "#,##0.00"
        r.getCell(2).alignment = { vertical: "middle", horizontal: "right" }
        if (colorArgb) {
            r.getCell(2).font = {
                name: "Calibri",
                size: 10.5,
                bold: true,
                color: { argb: colorArgb },
            }
        }
    })

    if (categorySummary.length > 0) {
        wsSummary.addRow([])
        const catHeader = wsSummary.addRow([
            "Desglose de Gastos por Categoría",
            `Monto (${baseCurrency})`,
            "% sobre el Total de Gastos",
        ])
        styleTableHeader(catHeader)
        catHeader.getCell(2).alignment = { vertical: "middle", horizontal: "right" }

        categorySummary.forEach((c, idx) => {
            const r = wsSummary.addRow([
                c.name,
                c.amount,
                `${c.percent}% (${c.count} mov.)`,
            ])
            styleDataRow(r, idx)
            r.getCell(2).numFmt = "#,##0.00"
            r.getCell(2).alignment = { vertical: "middle", horizontal: "right" }
        })
    }

    // =========================================================================
    // HOJA 2: CUENTAS Y TARJETAS
    // =========================================================================
    const wsAcc = wb.addWorksheet("Cuentas y Tarjetas", {
        views: [{ state: "frozen", ySplit: 4 }],
    })
    wsAcc.columns = [
        { width: 28 },
        { width: 22 },
        { width: 18 },
        { width: 12 },
        { width: 18 },
        { width: 18 },
        { width: 18 },
        { width: 22 },
    ]
    addSheetBanner(wsAcc, "LUMIO FINANCE — CUENTAS Y TARJETAS", metaSub, 8)

    const hAcc = wsAcc.addRow([
        "Nombre de Cuenta",
        "Tipo de Cuenta",
        "Banco / Entidad",
        "Moneda",
        "Saldo Inicial",
        "Saldo Actual / Deuda",
        "Límite de Crédito",
        `Equivalente (${baseCurrency})`,
    ])
    styleTableHeader(hAcc)
    ;[5, 6, 7, 8].forEach((c) => {
        hAcc.getCell(c).alignment = { vertical: "middle", horizontal: "right" }
    })

    accounts.forEach((a, idx) => {
        const isCard = a.account_type === "CREDIT_CARD"
        const bal = isCard
            ? -Math.max(Math.abs(Number(a.used_balance || 0)), Math.abs(Number(a.current_balance || 0)))
            : Number(a.current_balance || 0)

        const r = wsAcc.addRow([
            a.name,
            translateAccountType(a.account_type),
            a.bank_name || a.custom_bank_name || "—",
            a.currency_code || baseCurrency,
            Number(a.initial_balance || 0),
            bal,
            isCard ? Number(a.credit_limit || 0) : 0,
            Number(a.convertedBalance || 0),
        ])
        styleDataRow(r, idx)
        r.getCell(1).font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF0F172A" } }
        ;[5, 6, 7, 8].forEach((c) => {
            r.getCell(c).numFmt = "#,##0.00"
            r.getCell(c).alignment = { vertical: "middle", horizontal: "right" }
        })
        r.getCell(8).font = {
            name: "Calibri",
            size: 10,
            bold: true,
            color: { argb: a.convertedBalance >= 0 ? "FF059669" : "FFE11D48" },
        }
    })

    const accTotalRow = wsAcc.addRow([
        `TOTAL PATRIMONIO (${accounts.length} cuentas)`,
        "",
        "",
        baseCurrency,
        "",
        "",
        "",
        totals.netWorth,
    ])
    styleTotalRow(accTotalRow)
    accTotalRow.getCell(8).numFmt = "#,##0.00"
    accTotalRow.getCell(8).alignment = { vertical: "middle", horizontal: "right" }

    // =========================================================================
    // HOJA 3: MOVIMIENTOS
    // =========================================================================
    const wsTx = wb.addWorksheet("Movimientos", {
        views: [{ state: "frozen", ySplit: 4 }],
    })
    wsTx.columns = [
        { width: 14 },
        { width: 16 },
        { width: 34 },
        { width: 22 },
        { width: 24 },
        { width: 22 },
        { width: 10 },
        { width: 16 },
        { width: 18 },
        { width: 22 },
        { width: 26 },
    ]
    addSheetBanner(wsTx, "LUMIO FINANCE — DETALLE DE MOVIMIENTOS", metaSub, 11)

    const hTx = wsTx.addRow([
        "Fecha",
        "Tipo",
        "Descripción",
        "Categoría",
        "Cuenta Origen",
        "Cuenta Destino",
        "Moneda",
        "Monto Original",
        `Monto (${baseCurrency})`,
        "Etiquetas",
        "Notas",
    ])
    styleTableHeader(hTx)
    hTx.getCell(8).alignment = { vertical: "middle", horizontal: "right" }
    hTx.getCell(9).alignment = { vertical: "middle", horizontal: "right" }

    transactions.forEach((t, idx) => {
        const isExp = t.transaction_type === "EXPENSE"
        const isInc = t.transaction_type === "INCOME"
        const signedOrig = isExp ? -Math.abs(Number(t.amount || 0)) : Number(t.amount || 0)
        const signedConv = isExp
            ? -Math.abs(Number(t.convertedAmount || 0))
            : Number(t.convertedAmount || 0)

        const r = wsTx.addRow([
            String(t.transaction_date || "").slice(0, 10),
            translateTxType(t.transaction_type),
            t.description || "Sin descripción",
            t.categoryName || "Sin categoría",
            t.accountName || "—",
            t.transferToAccountName || "—",
            t.currency_code || baseCurrency,
            signedOrig,
            signedConv,
            Array.isArray(t.tags) && t.tags.length > 0 ? t.tags.join(", ") : "—",
            t.notes || "—",
        ])
        styleDataRow(r, idx)
        r.getCell(8).numFmt = "#,##0.00"
        r.getCell(9).numFmt = "#,##0.00"
        r.getCell(8).alignment = { vertical: "middle", horizontal: "right" }
        r.getCell(9).alignment = { vertical: "middle", horizontal: "right" }

        const amtColor = isExp ? "FFE11D48" : isInc ? "FF059669" : "FF4F46E5"
        r.getCell(2).font = { name: "Calibri", size: 10, bold: true, color: { argb: amtColor } }
        r.getCell(8).font = { name: "Calibri", size: 10, bold: true, color: { argb: amtColor } }
        r.getCell(9).font = { name: "Calibri", size: 10, bold: true, color: { argb: amtColor } }
    })

    const txTotalRow = wsTx.addRow([
        "BALANCE NETO",
        `${transactions.length} mov.`,
        `Ingresos: ${fmtMoney(totals.income, baseCurrency)}  |  Gastos: ${fmtMoney(totals.expenses, baseCurrency)}`,
        "",
        "",
        "",
        baseCurrency,
        "",
        totals.netCashflow,
        "",
        "",
    ])
    styleTotalRow(txTotalRow)
    txTotalRow.getCell(9).numFmt = "#,##0.00"
    txTotalRow.getCell(9).alignment = { vertical: "middle", horizontal: "right" }

    // =========================================================================
    // HOJA 4: PRESUPUESTOS
    // =========================================================================
    const wsBud = wb.addWorksheet("Presupuestos", {
        views: [{ state: "frozen", ySplit: 4 }],
    })
    wsBud.columns = [
        { width: 28 },
        { width: 14 },
        { width: 14 },
        { width: 10 },
        { width: 18 },
        { width: 18 },
        { width: 18 },
        { width: 14 },
        { width: 14 },
    ]
    addSheetBanner(wsBud, "LUMIO FINANCE — CONTROL DE PRESUPUESTOS", metaSub, 9)

    const hBud = wsBud.addRow([
        "Nombre del Presupuesto",
        "Tipo",
        "Periodo",
        "Moneda",
        "Límite Asignado",
        "Gastado (Mes)",
        "Disponible",
        "% Ejecución",
        "Estado",
    ])
    styleTableHeader(hBud)
    ;[5, 6, 7, 8].forEach((c) => {
        hBud.getCell(c).alignment = { vertical: "middle", horizontal: "right" }
    })

    budgets.forEach((b, idx) => {
        const limit = Number(b.amount || 0)
        const spent = Number(b.spent || 0)
        const remaining = limit - spent
        const pct = limit > 0 ? Math.round((spent / limit) * 1000) / 10 : 0

        const r = wsBud.addRow([
            b.name,
            b.type === "SAVINGS" ? "Ahorro" : "Gasto",
            `${String(b.budget_month || "").padStart(2, "0")}/${b.budget_year}`,
            b.currency_code || baseCurrency,
            limit,
            spent,
            remaining,
            `${pct}%`,
            !b.is_active ? "Pausado" : pct >= 100 ? "Excedido" : pct >= 85 ? "En alerta" : "En rango",
        ])
        styleDataRow(r, idx)
        r.getCell(1).font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF0F172A" } }
        ;[5, 6, 7].forEach((c) => {
            r.getCell(c).numFmt = "#,##0.00"
            r.getCell(c).alignment = { vertical: "middle", horizontal: "right" }
        })
        r.getCell(8).alignment = { vertical: "middle", horizontal: "right" }
        r.getCell(9).font = {
            name: "Calibri",
            size: 10,
            bold: true,
            color: {
                argb: pct >= 100 ? "FFE11D48" : pct >= 85 ? "FFD97706" : "FF059669",
            },
        }
    })

    // =========================================================================
    // HOJA 5: METAS DE AHORRO
    // =========================================================================
    const wsGoals = wb.addWorksheet("Metas de Ahorro", {
        views: [{ state: "frozen", ySplit: 4 }],
    })
    wsGoals.columns = [
        { width: 28 },
        { width: 22 },
        { width: 10 },
        { width: 18 },
        { width: 18 },
        { width: 18 },
        { width: 14 },
        { width: 16 },
        { width: 14 },
    ]
    addSheetBanner(wsGoals, "LUMIO FINANCE — METAS DE AHORRO", metaSub, 9)

    const hGoals = wsGoals.addRow([
        "Meta de Ahorro",
        "Categoría de Meta",
        "Moneda",
        "Monto Objetivo",
        "Ahorrado Actual",
        "Falta por Ahorrar",
        "% Avance",
        "Fecha Objetivo",
        "Estado",
    ])
    styleTableHeader(hGoals)
    ;[4, 5, 6, 7].forEach((c) => {
        hGoals.getCell(c).alignment = { vertical: "middle", horizontal: "right" }
    })

    goals.forEach((g, idx) => {
        const target = Number(g.target_amount || 0)
        const current = Number(g.current_amount || 0)
        const missing = Math.max(0, target - current)
        const pct = target > 0 ? Math.min(100, Math.round((current / target) * 1000) / 10) : 0

        const r = wsGoals.addRow([
            g.name,
            translateGoalType(g.goal_type),
            g.currency || baseCurrency,
            target,
            current,
            missing,
            `${pct}%`,
            g.target_date || "—",
            translateGoalStatus(g.status),
        ])
        styleDataRow(r, idx)
        r.getCell(1).font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF0F172A" } }
        ;[4, 5, 6].forEach((c) => {
            r.getCell(c).numFmt = "#,##0.00"
            r.getCell(c).alignment = { vertical: "middle", horizontal: "right" }
        })
        r.getCell(7).alignment = { vertical: "middle", horizontal: "right" }
        r.getCell(5).font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF059669" } }
    })

    // =========================================================================
    // HOJA 6: PRÉSTAMOS Y DEUDAS
    // =========================================================================
    const wsLoans = wb.addWorksheet("Préstamos y Deudas", {
        views: [{ state: "frozen", ySplit: 4 }],
    })
    wsLoans.columns = [
        { width: 16 },
        { width: 28 },
        { width: 10 },
        { width: 18 },
        { width: 18 },
        { width: 18 },
        { width: 16 },
        { width: 16 },
        { width: 26 },
    ]
    addSheetBanner(wsLoans, "LUMIO FINANCE — PRÉSTAMOS Y DEUDAS", metaSub, 9)

    const hLoans = wsLoans.addRow([
        "Tipo",
        "Contacto / Entidad",
        "Moneda",
        "Monto Original",
        "Pagado / Cobrado",
        "Saldo Pendiente",
        "Estado",
        "Vencimiento",
        "Notas",
    ])
    styleTableHeader(hLoans)
    ;[4, 5, 6].forEach((c) => {
        hLoans.getCell(c).alignment = { vertical: "middle", horizontal: "right" }
    })

    loans.forEach((item, idx) => {
        const isReceivable = item.direction === "POR_COBRAR"
        const orig = Number(item.original_amount || 0)
        const rem = Number(item.outstanding_balance || 0)
        const paid = Math.max(0, orig - rem)

        const r = wsLoans.addRow([
            isReceivable ? "Por cobrar" : "Por pagar",
            item.contact_name,
            item.currency_code || baseCurrency,
            orig,
            paid,
            rem,
            translateLoanStatus(item.status),
            item.due_date || "—",
            item.notes || "—",
        ])
        styleDataRow(r, idx)
        ;[4, 5, 6].forEach((c) => {
            r.getCell(c).numFmt = "#,##0.00"
            r.getCell(c).alignment = { vertical: "middle", horizontal: "right" }
        })
        const dirColor = isReceivable ? "FF059669" : "FFE11D48"
        r.getCell(1).font = { name: "Calibri", size: 10, bold: true, color: { argb: dirColor } }
        r.getCell(6).font = { name: "Calibri", size: 10, bold: true, color: { argb: dirColor } }
    })

    const arrayBuffer = await wb.xlsx.writeBuffer()
    return Buffer.from(arrayBuffer)
}

async function buildExecutivePdf(params: {
    userName: string
    periodLabel: string
    baseCurrency: string
    totals: {
        netWorth: number
        liquidity: number
        cardDebt: number
        income: number
        expenses: number
        netCashflow: number
        receivables: number
        payables: number
        goalsSaved: number
        goalsTarget: number
    }
    accounts: any[]
    transactions: any[]
    categorySummary: any[]
    budgets: any[]
    goals: any[]
    loans: any[]
}): Promise<Buffer> {
    const PDFDocument = (await import("pdfkit")).default

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: "A4", margin: 40, bufferPages: true })
        const chunks: Buffer[] = []
        doc.on("data", (c: Buffer) => chunks.push(c))
        doc.on("end", () => resolve(Buffer.concat(chunks)))
        doc.on("error", reject)

        const {
            userName,
            periodLabel,
            baseCurrency,
            totals,
            accounts,
            transactions,
            categorySummary,
            budgets,
            goals,
            loans,
        } = params

        const pageW = doc.page.width - 80

        // Top Brand Header Banner
        doc.rect(0, 0, doc.page.width, 98).fill("#3B0764")
        doc.fillColor("#FFFFFF").fontSize(21).font("Helvetica-Bold").text("Lumio Finance", 40, 22)
        doc.fillColor("#E9D5FF")
            .fontSize(10)
            .font("Helvetica")
            .text("Reporte Financiero Integral · Cuentas, Flujo, Presupuestos, Metas y Préstamos", 40, 48)
        doc.fillColor("#FFFFFF")
            .fontSize(9)
            .text(
                `Titular: ${userName}   |   Periodo: ${periodLabel}   |   Moneda Base: ${baseCurrency}   |   Fecha: ${new Date().toLocaleDateString("es-PE")}`,
                40,
                70
            )

        let y = 116

        // 6 KPI Cards (3x2 grid)
        const kpis = [
            {
                label: "PATRIMONIO NETO EN CUENTAS",
                value: fmtMoney(totals.netWorth, baseCurrency),
                sub: `Liquidez: ${fmtMoney(totals.liquidity, baseCurrency)}`,
                color: "#4F46E5",
            },
            {
                label: "INGRESOS DEL PERIODO",
                value: fmtMoney(totals.income, baseCurrency),
                sub: `${transactions.filter((t) => t.transaction_type === "INCOME").length} ingreso(s)`,
                color: "#059669",
            },
            {
                label: "GASTOS DEL PERIODO",
                value: fmtMoney(totals.expenses, baseCurrency),
                sub: `${transactions.filter((t) => t.transaction_type === "EXPENSE").length} gasto(s)`,
                color: "#E11D48",
            },
            {
                label: "BALANCE / FLUJO NETO",
                value: fmtMoney(totals.netCashflow, baseCurrency),
                sub: totals.netCashflow >= 0 ? "Superávit del periodo" : "Déficit del periodo",
                color: totals.netCashflow >= 0 ? "#059669" : "#E11D48",
            },
            {
                label: "AHORRO EN METAS",
                value: fmtMoney(totals.goalsSaved, baseCurrency),
                sub: `Objetivo: ${fmtMoney(totals.goalsTarget, baseCurrency)}`,
                color: "#0D9488",
            },
            {
                label: "PRÉSTAMOS (COBRAR / PAGAR)",
                value: `+${fmtMoney(totals.receivables, baseCurrency)}`,
                sub: `Por pagar: ${fmtMoney(totals.payables, baseCurrency)}`,
                color: "#475569",
            },
        ]

        const cardW = (pageW - 20) / 3
        const cardH = 62
        kpis.forEach((k, idx) => {
            const col = idx % 3
            const rowIdx = Math.floor(idx / 3)
            const cx = 40 + col * (cardW + 10)
            const cy = y + rowIdx * (cardH + 10)
            doc.roundedRect(cx, cy, cardW, cardH, 7).fillAndStroke("#F8FAFC", "#E2E8F0")
            doc.fillColor("#64748B").fontSize(7.5).font("Helvetica-Bold").text(k.label, cx + 10, cy + 10)
            doc.fillColor(k.color).fontSize(13).font("Helvetica-Bold").text(k.value, cx + 10, cy + 24)
            doc.fillColor("#64748B").fontSize(7.5).font("Helvetica").text(k.sub, cx + 10, cy + 44)
        })

        y += cardH * 2 + 28

        const ensureSpace = (needed: number) => {
            if (y + needed > 760) {
                doc.addPage()
                y = 44
            }
        }

        // 1. CUENTAS Y TARJETAS
        ensureSpace(70)
        doc.fillColor("#1E1B4B")
            .fontSize(11.5)
            .font("Helvetica-Bold")
            .text(`1. Cuentas y Tarjetas (${accounts.length})`, 40, y)
        y += 16

        doc.rect(40, y, pageW, 18).fill("#5B3CE6")
        doc.fillColor("#FFFFFF")
            .fontSize(8)
            .font("Helvetica-Bold")
            .text("CUENTA", 48, y + 5)
            .text("TIPO", 220, y + 5)
            .text("MONEDA", 350, y + 5)
            .text("SALDO ACTUAL", 415, y + 5, { width: 132, align: "right" })
        y += 18

        if (accounts.length === 0) {
            doc.fillColor("#64748B").fontSize(8.5).font("Helvetica").text("No hay cuentas registradas.", 48, y + 6)
            y += 22
        } else {
            accounts.forEach((a, idx) => {
                ensureSpace(18)
                if (idx % 2 === 1) doc.rect(40, y, pageW, 17).fill("#F8FAFC")
                const isCard = a.account_type === "CREDIT_CARD"
                const bal = isCard
                    ? -Math.max(Math.abs(Number(a.used_balance || 0)), Math.abs(Number(a.current_balance || 0)))
                    : Number(a.current_balance || 0)

                doc.fillColor("#0F172A").fontSize(8.5).font("Helvetica-Bold").text(String(a.name || "").slice(0, 32), 48, y + 4)
                doc.fillColor("#475569").fontSize(8.5).font("Helvetica").text(translateAccountType(a.account_type), 220, y + 4)
                doc.fillColor("#475569").fontSize(8.5).font("Helvetica").text(a.currency_code || baseCurrency, 350, y + 4)
                doc.fillColor(bal >= 0 ? "#059669" : "#E11D48")
                    .fontSize(8.5)
                    .font("Helvetica-Bold")
                    .text(fmtMoney(bal, a.currency_code || baseCurrency), 415, y + 4, {
                        width: 132,
                        align: "right",
                    })
                y += 17
            })
        }

        // 2. PRESUPUESTOS Y METAS
        y += 14
        ensureSpace(70)
        doc.fillColor("#1E1B4B")
            .fontSize(11.5)
            .font("Helvetica-Bold")
            .text(`2. Presupuestos (${budgets.length}) y Metas de Ahorro (${goals.length})`, 40, y)
        y += 16

        if (budgets.length > 0) {
            doc.rect(40, y, pageW, 18).fill("#F1F5F9")
            doc.fillColor("#334155")
                .fontSize(8)
                .font("Helvetica-Bold")
                .text("PRESUPUESTO", 48, y + 5)
                .text("PERIODO", 230, y + 5)
                .text("GASTADO / LÍMITE", 320, y + 5)
                .text("USO", 480, y + 5, { width: 67, align: "right" })
            y += 18

            budgets.slice(0, 10).forEach((b) => {
                ensureSpace(17)
                const limit = Number(b.amount || 0)
                const spent = Number(b.spent || 0)
                const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0
                doc.fillColor("#0F172A").fontSize(8.5).font("Helvetica").text(String(b.name || "").slice(0, 34), 48, y + 4)
                doc.fillColor("#64748B").fontSize(8.5).text(`${String(b.budget_month || "").padStart(2, "0")}/${b.budget_year}`, 230, y + 4)
                doc.fillColor("#334155")
                    .fontSize(8.5)
                    .text(`${fmtMoney(spent, b.currency_code || baseCurrency)} / ${fmtMoney(limit, b.currency_code || baseCurrency)}`, 320, y + 4)
                doc.fillColor(pct >= 100 ? "#E11D48" : "#4F46E5")
                    .fontSize(8.5)
                    .font("Helvetica-Bold")
                    .text(`${pct}%`, 480, y + 4, { width: 67, align: "right" })
                y += 17
            })
        }

        if (goals.length > 0) {
            y += 6
            ensureSpace(40)
            doc.rect(40, y, pageW, 18).fill("#F1F5F9")
            doc.fillColor("#334155")
                .fontSize(8)
                .font("Helvetica-Bold")
                .text("META DE AHORRO", 48, y + 5)
                .text("TIPO", 220, y + 5)
                .text("AHORRADO / OBJETIVO", 320, y + 5)
                .text("AVANCE", 480, y + 5, { width: 67, align: "right" })
            y += 18

            goals.slice(0, 10).forEach((g) => {
                ensureSpace(17)
                const target = Number(g.target_amount || 0)
                const cur = Number(g.current_amount || 0)
                const pct = target > 0 ? Math.min(100, Math.round((cur / target) * 100)) : 0
                doc.fillColor("#0F172A").fontSize(8.5).font("Helvetica").text(String(g.name || "").slice(0, 32), 48, y + 4)
                doc.fillColor("#64748B").fontSize(8.5).text(translateGoalType(g.goal_type), 220, y + 4)
                doc.fillColor("#334155")
                    .fontSize(8.5)
                    .text(`${fmtMoney(cur, g.currency || baseCurrency)} / ${fmtMoney(target, g.currency || baseCurrency)}`, 320, y + 4)
                doc.fillColor("#059669")
                    .fontSize(8.5)
                    .font("Helvetica-Bold")
                    .text(`${pct}%`, 480, y + 4, { width: 67, align: "right" })
                y += 17
            })
        }

        // 3. PRÉSTAMOS Y DEUDAS
        if (loans.length > 0) {
            y += 14
            ensureSpace(60)
            doc.fillColor("#1E1B4B")
                .fontSize(11.5)
                .font("Helvetica-Bold")
                .text(`3. Préstamos y Deudas (${loans.length})`, 40, y)
            y += 16

            doc.rect(40, y, pageW, 18).fill("#F1F5F9")
            doc.fillColor("#334155")
                .fontSize(8)
                .font("Helvetica-Bold")
                .text("DIRECCIÓN", 48, y + 5)
                .text("CONTACTO", 140, y + 5)
                .text("ESTADO", 310, y + 5)
                .text("SALDO PENDIENTE", 415, y + 5, { width: 132, align: "right" })
            y += 18

            loans.slice(0, 15).forEach((l) => {
                ensureSpace(17)
                const isRec = l.direction === "POR_COBRAR"
                doc.fillColor(isRec ? "#059669" : "#E11D48")
                    .fontSize(8.5)
                    .font("Helvetica-Bold")
                    .text(isRec ? "Por cobrar" : "Por pagar", 48, y + 4)
                doc.fillColor("#0F172A").fontSize(8.5).font("Helvetica").text(String(l.contact_name || "").slice(0, 28), 140, y + 4)
                doc.fillColor("#64748B").fontSize(8.5).text(translateLoanStatus(l.status), 310, y + 4)
                doc.fillColor(isRec ? "#059669" : "#E11D48")
                    .fontSize(8.5)
                    .font("Helvetica-Bold")
                    .text(fmtMoney(Number(l.outstanding_balance || 0), l.currency_code || baseCurrency), 415, y + 4, {
                        width: 132,
                        align: "right",
                    })
                y += 17
            })
        }

        // 4. MOVIMIENTOS DEL PERIODO
        y += 14
        ensureSpace(70)
        doc.fillColor("#1E1B4B")
            .fontSize(11.5)
            .font("Helvetica-Bold")
            .text(`4. Movimientos del Periodo (${transactions.length})`, 40, y)
        y += 16

        doc.rect(40, y, pageW, 18).fill("#5B3CE6")
        doc.fillColor("#FFFFFF")
            .fontSize(8)
            .font("Helvetica-Bold")
            .text("FECHA", 46, y + 5)
            .text("TIPO", 104, y + 5)
            .text("DESCRIPCIÓN", 162, y + 5)
            .text("CATEGORÍA", 300, y + 5)
            .text("CUENTA", 392, y + 5)
            .text("MONTO", 468, y + 5, { width: 80, align: "right" })
        y += 18

        transactions.slice(0, 150).forEach((t, idx) => {
            ensureSpace(17)
            if (idx % 2 === 1) doc.rect(40, y, pageW, 16).fill("#F8FAFC")
            const isExp = t.transaction_type === "EXPENSE"
            const isInc = t.transaction_type === "INCOME"
            const color = isExp ? "#E11D48" : isInc ? "#059669" : "#4F46E5"

            doc.fillColor("#64748B").fontSize(8).font("Helvetica").text(String(t.transaction_date || "").slice(0, 10), 46, y + 4)
            doc.fillColor(color).fontSize(8).font("Helvetica-Bold").text(translateTxType(t.transaction_type), 104, y + 4)
            doc.fillColor("#0F172A").fontSize(8).font("Helvetica").text(String(t.description || "Sin descripción").slice(0, 26), 162, y + 4)
            doc.fillColor("#475569").fontSize(8).text(String(t.categoryName || "—").slice(0, 17), 300, y + 4)
            doc.fillColor("#475569").fontSize(8).text(String(t.accountName || "—").slice(0, 15), 392, y + 4)
            doc.fillColor(color)
                .fontSize(8)
                .font("Helvetica-Bold")
                .text(
                    `${isExp ? "-" : isInc ? "+" : ""}${fmtMoney(Number(t.amount || 0), t.currency_code || baseCurrency)}`,
                    468,
                    y + 4,
                    { width: 80, align: "right" }
                )
            y += 16
        })

        // Footer with Page Numbers on all pages
        const pageRange = doc.bufferedPageRange()
        for (let i = pageRange.start; i < pageRange.start + pageRange.count; i++) {
            doc.switchToPage(i)
            doc.fillColor("#94A3B8")
                .fontSize(8)
                .font("Helvetica")
                .text(
                    `Lumio Finance · Reporte generado el ${new Date().toLocaleString("es-PE")} · Página ${i + 1} de ${pageRange.count}`,
                    40,
                    doc.page.height - 28,
                    { align: "center", width: pageW }
                )
        }

        doc.end()
    })
}

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        const db = getServiceRoleClient() || supabase
        const sp = request.nextUrl.searchParams
        const rawFormat = sp.get("format")
        const isPreview = rawFormat === "preview"

        const { entitlements, timezone } = await getUserEntitlementsServer(db, user)
        if (!isPreview && !entitlements.canExportReports) {
            return NextResponse.json(
                {
                    error: "Los reportes descargables requieren Plan Premium o estar en periodo de prueba.",
                    code: "PREMIUM_REQUIRED",
                },
                { status: 403 }
            )
        }

        const format =
            rawFormat === "pdf"
                ? "pdf"
                : rawFormat === "csv"
                  ? "csv"
                  : rawFormat === "preview"
                    ? "preview"
                    : "excel"
        const period = (sp.get("period") || "this_month") as ExportPeriod
        const fromParam = sp.get("from")
        const toParam = sp.get("to")
        const baseCurrency = (sp.get("currency") || DEFAULT_CURRENCY).toUpperCase()
        const range = resolvePeriodRange(period, timezone, fromParam, toParam)

        let txQuery = db
            .from("transactions")
            .select(
                "id, transaction_type, amount, currency_code, transaction_date, description, notes, tags, account_id, transfer_to_account_id, expense_category_id, income_category_id, subcategory_id, metadata"
            )
            .eq("user_id", user.id)
            .order("transaction_date", { ascending: false })

        if (range.startIso) txQuery = txQuery.gte("transaction_date", range.startIso)
        if (range.endIso) txQuery = txQuery.lte("transaction_date", range.endIso)

        const now = new Date()
        const curMonthRange = getMonthDateRangeInTimezone(
            now.getFullYear(),
            now.getMonth() + 1,
            timezone
        )

        const [
            profileRes,
            accountsRes,
            txRes,
            monthExpenseRes,
            budgetsRes,
            goalsRes,
            recRes,
            payRes,
            legacyLoansRes,
            expCatRes,
            incCatRes,
            rateMap,
        ] = await Promise.all([
            db.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
            db
                .from("accounts")
                .select(
                    "id, name, account_type, currency_code, initial_balance, current_balance, credit_limit, used_balance, bank_name, custom_bank_name, is_active, archived"
                )
                .eq("user_id", user.id)
                .eq("is_active", true),
            txQuery,
            db
                .from("transactions")
                .select("amount, currency_code, account_id, expense_category_id, subcategory_id")
                .eq("user_id", user.id)
                .eq("transaction_type", "EXPENSE")
                .gte("transaction_date", curMonthRange.startIso)
                .lte("transaction_date", curMonthRange.endIso),
            db
                .from("budgets")
                .select(
                    "id, name, type, amount, currency_code, budget_month, budget_year, include_categories, is_active"
                )
                .eq("user_id", user.id),
            db
                .from("savings_goals")
                .select(
                    "id, name, goal_type, target_amount, current_amount, currency, target_date, status"
                )
                .eq("user_id", user.id),
            db
                .from("accounts_receivable")
                .select(
                    "id, contact_name, original_amount, outstanding_balance, currency_code, status, due_date, notes"
                )
                .eq("user_id", user.id),
            db
                .from("accounts_payable")
                .select(
                    "id, contact_name, original_amount, outstanding_balance, currency_code, status, due_date, notes"
                )
                .eq("user_id", user.id),
            db
                .from("loans")
                .select(
                    "id, contact_name, loan_type, principal_amount, remaining_balance, currency_code, status, due_date, notes"
                )
                .eq("user_id", user.id),
            db
                .from("expense_categories")
                .select("id, name, parent_category_id")
                .or(`user_id.is.null,user_id.eq.${user.id}`),
            db
                .from("income_categories")
                .select("id, name, parent_category_id")
                .or(`user_id.is.null,user_id.eq.${user.id}`),
            getExchangeRatesMap(db),
        ])

        const toBase = (amt: number, cur?: string | null) =>
            convertAmount(Number(amt || 0), cur || baseCurrency, baseCurrency, rateMap)

        const rawAccounts = (accountsRes.data || []).filter((a: any) => !a.archived)
        const accounts = rawAccounts.map((a: any) => {
            const isCard = a.account_type === "CREDIT_CARD"
            const debt = Math.max(
                Math.abs(Number(a.used_balance || 0)),
                Math.abs(Math.min(0, Number(a.current_balance || 0)))
            )
            const effectiveBal = isCard ? -debt : Number(a.current_balance || 0)
            return {
                ...a,
                convertedBalance: Math.round(toBase(effectiveBal, a.currency_code) * 100) / 100,
            }
        })

        const accMap = new Map<string, string>(
            accounts.map((a: any) => [a.id, `${a.name} (${a.currency_code || baseCurrency})`])
        )
        const accCurrencyMap = new Map<string, string>(
            accounts.map((a: any) => [a.id, a.currency_code || baseCurrency])
        )

        const allCategories = [
            ...(expCatRes.data || []).map((c: any) => ({
                ...c,
                type: "EXPENSE",
                parent_id: c.parent_category_id,
            })),
            ...(incCatRes.data || []).map((c: any) => ({
                ...c,
                type: "INCOME",
                parent_id: c.parent_category_id,
            })),
        ]
        const catMap = new Map<string, string>()
        const categoriesByName: Record<string, string[]> = {}
        const normalize = (n: string) => (n ? n.trim().toLowerCase() : "")

        allCategories.forEach((c: any) => {
            catMap.set(c.id, c.name)
            if (c.name) {
                const key = normalize(c.name)
                if (!categoriesByName[key]) categoriesByName[key] = []
                categoriesByName[key].push(c.id)
            }
        })

        const transactions = (txRes.data || [])
            .filter((t: any) => !(t.metadata && t.metadata.mode === "SCHEDULED"))
            .map((t: any) => {
                const txCurr =
                    t.currency_code || accCurrencyMap.get(t.account_id) || baseCurrency
                const converted =
                    Math.round(toBase(Number(t.amount || 0), txCurr) * 100) / 100
                return {
                    ...t,
                    currency_code: txCurr,
                    convertedAmount: converted,
                    accountName: accMap.get(t.account_id) || "Cuenta general",
                    transferToAccountName: t.transfer_to_account_id
                        ? accMap.get(t.transfer_to_account_id) || ""
                        : "",
                    categoryName:
                        catMap.get(t.expense_category_id) ||
                        catMap.get(t.income_category_id) ||
                        (t.transaction_type === "TRANSFER" ? "Transferencia" : "Sin categoría"),
                }
            })

        // Category summary for expenses in the period
        const catBuckets: Record<string, { name: string; amount: number; count: number }> = {}
        for (const t of transactions) {
            if (t.transaction_type !== "EXPENSE") continue
            const key = t.categoryName || "Sin categoría"
            if (!catBuckets[key]) catBuckets[key] = { name: key, amount: 0, count: 0 }
            catBuckets[key].amount += t.convertedAmount
            catBuckets[key].count += 1
        }
        const totalCatExp = Object.values(catBuckets).reduce((s, c) => s + c.amount, 0)
        const categorySummary = Object.values(catBuckets)
            .sort((a, b) => b.amount - a.amount)
            .map((c) => ({
                name: c.name,
                amount: Math.round(c.amount * 100) / 100,
                count: c.count,
                percent:
                    totalCatExp > 0 ? Math.round((c.amount / totalCatExp) * 1000) / 10 : 0,
            }))

        // Compute real budget execution
        const monthExpTxs = monthExpenseRes.data || []
        const budgets = (budgetsRes.data || []).map((b: any) => {
            let spentInBudgetCurr = 0
            const bCurr = b.currency_code || baseCurrency

            if (Array.isArray(b.include_categories) && b.include_categories.length > 0) {
                const targetIds: string[] = []
                b.include_categories.forEach((id: string) => {
                    targetIds.push(id)
                    const name = catMap.get(id)
                    if (name) {
                        const key = normalize(name)
                        if (categoriesByName[key]) targetIds.push(...categoriesByName[key])
                    }
                })
                const targetSet = new Set(expandCategoryIds(targetIds, allCategories))
                spentInBudgetCurr = monthExpTxs.reduce((sum: number, tx: any) => {
                    const match =
                        (tx.expense_category_id && targetSet.has(tx.expense_category_id)) ||
                        (tx.subcategory_id && targetSet.has(tx.subcategory_id))
                    if (!match) return sum
                    const txCurr =
                        tx.currency_code || accCurrencyMap.get(tx.account_id) || baseCurrency
                    return sum + convertAmount(Number(tx.amount || 0), txCurr, bCurr, rateMap)
                }, 0)
            } else {
                spentInBudgetCurr = monthExpTxs.reduce((sum: number, tx: any) => {
                    const txCurr =
                        tx.currency_code || accCurrencyMap.get(tx.account_id) || baseCurrency
                    return sum + convertAmount(Number(tx.amount || 0), txCurr, bCurr, rateMap)
                }, 0)
            }

            return {
                ...b,
                spent: Math.round(spentInBudgetCurr * 100) / 100,
            }
        })

        const goals = goalsRes.data || []
        const receivables = recRes.data || []
        const payables = payRes.data || []
        const legacyLoans = legacyLoansRes.data || []

        const loans: any[] = [
            ...receivables.map((r: any) => ({ ...r, direction: "POR_COBRAR" })),
            ...payables.map((p: any) => ({ ...p, direction: "POR_PAGAR" })),
            ...legacyLoans.map((l: any) => ({
                id: l.id,
                direction: l.loan_type === "BORROWED" ? "POR_PAGAR" : "POR_COBRAR",
                contact_name: l.contact_name,
                original_amount: l.principal_amount,
                outstanding_balance: l.remaining_balance,
                currency_code: l.currency_code,
                status: l.status,
                due_date: l.due_date,
                notes: l.notes,
            })),
        ]

        const liquidity = accounts
            .filter((a: any) => a.account_type !== "CREDIT_CARD")
            .reduce((s: number, a: any) => s + a.convertedBalance, 0)
        const cardDebt = accounts
            .filter((a: any) => a.account_type === "CREDIT_CARD")
            .reduce((s: number, a: any) => s + Math.abs(a.convertedBalance), 0)
        const netWorth = liquidity - cardDebt

        const income = transactions
            .filter((t: any) => t.transaction_type === "INCOME")
            .reduce((s: number, t: any) => s + t.convertedAmount, 0)
        const expenses = transactions
            .filter((t: any) => t.transaction_type === "EXPENSE")
            .reduce((s: number, t: any) => s + t.convertedAmount, 0)

        const activeReceivables = loans
            .filter(
                (r: any) =>
                    r.direction === "POR_COBRAR" &&
                    r.status !== "COLLECTED" &&
                    r.status !== "CANCELLED"
            )
            .reduce((s: number, r: any) => s + toBase(r.outstanding_balance, r.currency_code), 0)
        const activePayables = loans
            .filter(
                (p: any) =>
                    p.direction === "POR_PAGAR" &&
                    p.status !== "PAID" &&
                    p.status !== "CANCELLED"
            )
            .reduce((s: number, p: any) => s + toBase(p.outstanding_balance, p.currency_code), 0)

        const goalsSaved = goals.reduce(
            (s: number, g: any) => s + toBase(g.current_amount, g.currency),
            0
        )
        const goalsTarget = goals.reduce(
            (s: number, g: any) => s + toBase(g.target_amount, g.currency),
            0
        )

        const userName = profileRes.data?.full_name || user.email || "Usuario Lumio"
        const fileStamp = new Date().toISOString().slice(0, 10)
        const totals = {
            netWorth: Math.round(netWorth * 100) / 100,
            liquidity: Math.round(liquidity * 100) / 100,
            cardDebt: Math.round(cardDebt * 100) / 100,
            income: Math.round(income * 100) / 100,
            expenses: Math.round(expenses * 100) / 100,
            netCashflow: Math.round((income - expenses) * 100) / 100,
            receivables: Math.round(activeReceivables * 100) / 100,
            payables: Math.round(activePayables * 100) / 100,
            goalsSaved: Math.round(goalsSaved * 100) / 100,
            goalsTarget: Math.round(goalsTarget * 100) / 100,
        }

        if (format === "preview") {
            return NextResponse.json({
                periodLabel: range.label,
                baseCurrency,
                totals,
                counts: {
                    accounts: accounts.length,
                    transactions: transactions.length,
                    categories: categorySummary.length,
                    budgets: budgets.length,
                    goals: goals.length,
                    loans: loans.length,
                },
            })
        }

        if (format === "csv") {
            const csvText = buildCsvContent(transactions, baseCurrency)
            return new NextResponse(csvText, {
                status: 200,
                headers: {
                    "Content-Type": "text/csv; charset=utf-8",
                    "Content-Disposition": `attachment; filename="Lumio-Movimientos-${fileStamp}.csv"`,
                },
            })
        }

        if (format === "pdf") {
            const pdfBuffer = await buildExecutivePdf({
                userName,
                periodLabel: range.label,
                baseCurrency,
                totals,
                accounts,
                transactions,
                categorySummary,
                budgets,
                goals,
                loans,
            })

            return new NextResponse(new Uint8Array(pdfBuffer), {
                status: 200,
                headers: {
                    "Content-Type": "application/pdf",
                    "Content-Disposition": `attachment; filename="Lumio-Reporte-${fileStamp}.pdf"`,
                },
            })
        }

        const xlsxBuffer = await buildRealXlsxBuffer({
            userName,
            periodLabel: range.label,
            baseCurrency,
            totals,
            accounts,
            transactions,
            categorySummary,
            budgets,
            goals,
            loans,
        })

        return new NextResponse(new Uint8Array(xlsxBuffer), {
            status: 200,
            headers: {
                "Content-Type":
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="Lumio-Reporte-${fileStamp}.xlsx"`,
            },
        })
    } catch (error: any) {
        if (
            error &&
            (error.digest === "DYNAMIC_SERVER_USAGE" ||
                String(error).includes("Dynamic server usage"))
        ) {
            throw error
        }
        console.error("[REPORTS_EXPORT_GET]", error)
        return NextResponse.json(
            { error: error.message || "No se pudo generar el reporte" },
            { status: 500 }
        )
    }
}
