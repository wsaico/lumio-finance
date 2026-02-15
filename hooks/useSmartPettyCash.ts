"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useCallback } from 'react'

// Types
interface PettyCashSuggestion {
    description: string
    vendor: string
    categoryId: string
    subcategoryId?: string
    subcategoryName?: string
    categoryName: string
    categoryIcon: string
    receiptType: string
    amount?: number
    confidence: number
    frequency: number
}

interface LearnedPattern {
    keywords: string[]
    vendor: string
    categoryId: string
    subcategoryId?: string
    receiptType: string
    avgAmount: number
}

// Common expense patterns for Peru
// Common expense patterns for Peru (Matched to DEFAULT_EXPENSE_CATEGORIES)
const PERU_EXPENSE_PATTERNS: Record<string, Partial<PettyCashSuggestion & { subcategoryName?: string }>> = {
    // Transporte (Category: Transporte)
    "taxi": { vendor: "Taxi", categoryName: "Transporte", subcategoryName: "Taxi/Uber", receiptType: "BOLETA" },
    "uber": { vendor: "Uber", categoryName: "Transporte", subcategoryName: "Taxi/Uber", receiptType: "BOLETA" },
    "gasolina": { vendor: "Grifo", categoryName: "Transporte", subcategoryName: "Combustible", receiptType: "FACTURA" },
    "combustible": { vendor: "Grifo", categoryName: "Transporte", subcategoryName: "Combustible", receiptType: "FACTURA" },
    "pasaje": { vendor: "Transporte Público", categoryName: "Transporte", subcategoryName: "Transporte público", receiptType: "TICKET" },
    "estacionamiento": { vendor: "Estacionamiento", categoryName: "Transporte", subcategoryName: "Estacionamiento", receiptType: "TICKET" },
    "peaje": { vendor: "Peaje", categoryName: "Transporte", subcategoryName: "Peajes", receiptType: "TICKET" },

    // Alimentación (Category: Comida y bebidas)
    "almuerzo": { vendor: "Restaurante", categoryName: "Comida y bebidas", subcategoryName: "Restaurantes", receiptType: "BOLETA" },
    "comida": { vendor: "Restaurante", categoryName: "Comida y bebidas", subcategoryName: "Restaurantes", receiptType: "BOLETA" },
    "café": { vendor: "Cafetería", categoryName: "Comida y bebidas", subcategoryName: "Bar/Café", receiptType: "BOLETA" },
    "desayuno": { vendor: "Restaurante", categoryName: "Comida y bebidas", subcategoryName: "Restaurantes", receiptType: "BOLETA" },
    "cena": { vendor: "Restaurante", categoryName: "Comida y bebidas", subcategoryName: "Restaurantes", receiptType: "BOLETA" },
    "menú": { vendor: "Restaurante", categoryName: "Comida y bebidas", subcategoryName: "Restaurantes", receiptType: "BOLETA" },
    "refrigerio": { vendor: "Bodega", categoryName: "Comida y bebidas", subcategoryName: "Bar/Café", receiptType: "BOLETA" },
    "agua": { vendor: "Bodega", categoryName: "Comida y bebidas", subcategoryName: "Supermercado", receiptType: "BOLETA" },
    "gaseosa": { vendor: "Bodega", categoryName: "Comida y bebidas", subcategoryName: "Supermercado", receiptType: "BOLETA" },

    // Oficina -> Compras / Otros
    "papel": { vendor: "Librería", categoryName: "Compras", subcategoryName: "Libros", receiptType: "BOLETA" },
    "tinta": { vendor: "Librería", categoryName: "Compras", subcategoryName: "Electrónica", receiptType: "FACTURA" },
    "impresión": { vendor: "Centro de Copias", categoryName: "Otros", subcategoryName: "Varios", receiptType: "BOLETA" },
    "copia": { vendor: "Centro de Copias", categoryName: "Otros", subcategoryName: "Varios", receiptType: "BOLETA" },
    "folder": { vendor: "Librería", categoryName: "Compras", subcategoryName: "Libros", receiptType: "BOLETA" },
    "lapicero": { vendor: "Librería", categoryName: "Compras", subcategoryName: "Libros", receiptType: "BOLETA" },
    "útiles": { vendor: "Librería", categoryName: "Compras", subcategoryName: "Libros", receiptType: "BOLETA" },

    // Limpieza -> Vivienda
    "detergente": { vendor: "Bodega", categoryName: "Vivienda", subcategoryName: "Mantenimiento", receiptType: "BOLETA" },
    "escoba": { vendor: "Ferretería", categoryName: "Vivienda", subcategoryName: "Mantenimiento", receiptType: "BOLETA" },
    "trapeador": { vendor: "Ferretería", categoryName: "Vivienda", subcategoryName: "Mantenimiento", receiptType: "BOLETA" },
    "limpieza": { vendor: "Bodega", categoryName: "Vivienda", subcategoryName: "Mantenimiento", receiptType: "BOLETA" },
    "jabón": { vendor: "Bodega", categoryName: "Vivienda", subcategoryName: "Mantenimiento", receiptType: "BOLETA" },

    // Mantenimiento -> Vivienda / Vehículo
    "reparación": { vendor: "Servicio Técnico", categoryName: "Vivienda", subcategoryName: "Mantenimiento", receiptType: "RECIBO" },
    "arreglo": { vendor: "Servicio Técnico", categoryName: "Vivienda", subcategoryName: "Mantenimiento", receiptType: "RECIBO" },
    "técnico": { vendor: "Servicio Técnico", categoryName: "Vivienda", subcategoryName: "Mantenimiento", receiptType: "RECIBO" },
    "instalación": { vendor: "Servicio Técnico", categoryName: "Vivienda", subcategoryName: "Mantenimiento", receiptType: "RECIBO" },
    "herramienta": { vendor: "Ferretería", categoryName: "Vivienda", subcategoryName: "Mantenimiento", receiptType: "BOLETA" },

    // Mensajería -> Otros
    "courier": { vendor: "Courier", categoryName: "Otros", subcategoryName: "Varios", receiptType: "BOLETA" },
    "envío": { vendor: "Courier", categoryName: "Otros", subcategoryName: "Varios", receiptType: "BOLETA" },
    "encomienda": { vendor: "Courier", categoryName: "Otros", subcategoryName: "Varios", receiptType: "BOLETA" },
    "olva": { vendor: "Olva Courier", categoryName: "Otros", subcategoryName: "Varios", receiptType: "BOLETA" },

    // Farmacia -> Otros (Salud) or Compras (Farmacia)
    "medicina": { vendor: "Farmacia", categoryName: "Otros", subcategoryName: "Salud", receiptType: "BOLETA" },
    "farmacia": { vendor: "Farmacia", categoryName: "Compras", subcategoryName: "Farmacia", receiptType: "BOLETA" },
    "botiquín": { vendor: "Farmacia", categoryName: "Compras", subcategoryName: "Farmacia", receiptType: "BOLETA" },

    // Trámites -> Gastos financieros / Otros
    "notaría": { vendor: "Notaría", categoryName: "Gastos financieros", subcategoryName: "Impuestos", receiptType: "FACTURA" },
    "legalización": { vendor: "Notaría", categoryName: "Gastos financieros", subcategoryName: "Impuestos", receiptType: "FACTURA" },
    "trámite": { vendor: "Entidad", categoryName: "Gastos financieros", subcategoryName: "Impuestos", receiptType: "RECIBO" },
}

// IGV Rates in Peru
export const PERU_TAX_RATES = [
    { value: "18", label: "18% General", description: "Tasa estándar IGV" },
    { value: "10", label: "10% Reducido", description: "Hoteles, restaurantes (turismo)" },
    { value: "0", label: "0% Exonerado", description: "Productos exonerados" },
    { value: "inafecto", label: "Inafecto", description: "No gravado con IGV" },
]

// Local storage keys
const STORAGE_KEY = 'petty-cash-learned-patterns'

// Get learned patterns from localStorage
function getLearnedPatterns(): LearnedPattern[] {
    if (typeof window === 'undefined') return []
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        return stored ? JSON.parse(stored) : []
    } catch {
        return []
    }
}

// Save learned pattern to localStorage
function saveLearnedPattern(pattern: LearnedPattern) {
    if (typeof window === 'undefined') return
    try {
        const patterns = getLearnedPatterns()
        // Check if pattern exists, update or add
        const existingIndex = patterns.findIndex(p =>
            p.keywords.some(k => pattern.keywords.includes(k))
        )
        if (existingIndex >= 0) {
            // Merge keywords and update
            patterns[existingIndex] = {
                ...patterns[existingIndex],
                ...pattern,
                keywords: [...new Set([...patterns[existingIndex].keywords, ...pattern.keywords])]
            }
        } else {
            patterns.push(pattern)
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(patterns.slice(-100))) // Keep last 100
    } catch (e) {
        console.error('Error saving pattern:', e)
    }
}

// Hook for smart suggestions
export function useSmartPettyCash(description: string, expenseCategories: { id: string; name: string; icon: string; subcategories?: { id: string; name: string }[] }[]) {
    // Get suggestions based on description
    const suggestions = useMemo(() => {
        if (!description || description.length < 2) return null

        const lowerDesc = description.toLowerCase()
        const words = lowerDesc.split(/\s+/)

        // First check learned patterns
        const learnedPatterns = getLearnedPatterns()
        for (const pattern of learnedPatterns) {
            if (pattern.keywords.some(k => lowerDesc.includes(k.toLowerCase()))) {
                const category = expenseCategories?.find(c =>
                    c.id === pattern.categoryId || c.name.toLowerCase() === pattern.categoryId.toLowerCase()
                )
                if (category) {
                    return {
                        vendor: pattern.vendor,
                        categoryId: category.id,
                        subcategoryId: pattern.subcategoryId,
                        categoryName: category.name,
                        categoryIcon: category.icon,
                        receiptType: pattern.receiptType,
                        amount: pattern.avgAmount,
                        confidence: 0.9,
                        source: 'learned'
                    }
                }
            }
        }

        // Then check predefined patterns
        for (const word of words) {
            const pattern = PERU_EXPENSE_PATTERNS[word]
            if (pattern) {
                const category = expenseCategories?.find(c =>
                    c.name.toLowerCase().includes(pattern.categoryName?.toLowerCase() || '')
                )
                const subcategory = category?.subcategories?.find((s: any) =>
                    s.name.toLowerCase() === pattern.subcategoryName?.toLowerCase()
                )
                return {
                    vendor: pattern.vendor,
                    categoryId: category?.id,
                    subcategoryId: subcategory?.id,
                    subcategoryName: subcategory?.name,
                    categoryName: pattern.categoryName || category?.name,
                    categoryIcon: category?.icon || 'receipt',
                    receiptType: pattern.receiptType,
                    confidence: 0.7,
                    source: 'predefined'
                }
            }
        }

        // Check if any category name matches
        for (const category of (expenseCategories || [])) {
            if (lowerDesc.includes(category.name.toLowerCase())) {
                return {
                    categoryId: category.id,
                    categoryName: category.name,
                    categoryIcon: category.icon,
                    confidence: 0.5,
                    source: 'category-match'
                }
            }
        }

        return null
    }, [description, expenseCategories])

    // Learn from user selection
    const learn = useCallback((data: {
        description: string
        vendor?: string
        categoryId: string
        subcategoryId?: string
        receiptType: string
        amount?: number
    }) => {
        const keywords = data.description
            .toLowerCase()
            .split(/\s+/)
            .filter(w => w.length > 2)

        saveLearnedPattern({
            keywords,
            vendor: data.vendor || '',
            categoryId: data.categoryId,
            subcategoryId: data.subcategoryId,
            receiptType: data.receiptType,
            avgAmount: data.amount || 0
        })
    }, [])

    return { suggestions, learn }
}

// Hook for expense categories (fix the issue)
export function usePettyCashCategories() {
    return useQuery({
        queryKey: ['petty-cash-categories'],
        queryFn: async () => {
            const res = await fetch('/api/categories')
            if (!res.ok) throw new Error('Error fetching categories')
            const data = await res.json()
            // Return only expense categories
            return data.expense || []
        },
        staleTime: 1000 * 60 * 5,
    })
}

// Hook for recent vendors (from expense history)
export function useRecentVendors() {
    return useQuery({
        queryKey: ['petty-cash-recent-vendors'],
        queryFn: async () => {
            const res = await fetch('/api/petty-cash/expenses?limit=50')
            if (!res.ok) return []
            const expenses = await res.json()

            // Extract unique vendors with frequency
            const vendorMap = new Map<string, number>()
            for (const exp of expenses) {
                if (exp.vendor) {
                    vendorMap.set(exp.vendor, (vendorMap.get(exp.vendor) || 0) + 1)
                }
            }

            return Array.from(vendorMap.entries())
                .map(([vendor, count]) => ({ vendor, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10)
        },
        staleTime: 1000 * 60 * 2,
    })
}

// Common vendors for quick selection
export const COMMON_VENDORS = [
    { name: "Bodega", icon: "store", keywords: ["agua", "gaseosa", "galleta"] },
    { name: "Restaurante", icon: "utensils", keywords: ["almuerzo", "comida", "menú"] },
    { name: "Farmacia", icon: "pill", keywords: ["medicina", "pastilla"] },
    { name: "Grifo", icon: "fuel", keywords: ["gasolina", "combustible"] },
    { name: "Taxi", icon: "car", keywords: ["taxi", "movilidad"] },
    { name: "Librería", icon: "book", keywords: ["papel", "útiles", "folder"] },
    { name: "Ferretería", icon: "wrench", keywords: ["herramienta", "clavo"] },
    { name: "Mercado", icon: "shopping-basket", keywords: ["fruta", "verdura"] },
    { name: "Courier", icon: "package", keywords: ["envío", "encomienda"] },
    { name: "Notaría", icon: "stamp", keywords: ["notaría", "legalización"] },
]
