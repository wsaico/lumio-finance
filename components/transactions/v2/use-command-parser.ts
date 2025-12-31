import { useState, useEffect } from 'react'
import { startOfDay, addDays, nextMonday, subDays, parse } from 'date-fns'

interface ParsedCommand {
    amount?: number
    description?: string
    categoryId?: string
    date?: Date
    type?: "EXPENSE" | "INCOME"
    mode?: "SINGLE" | "SUBSCRIPTION" | "RECURRING" | "SCHEDULED"
}

export function useCommandParser() {
    const parseCommand = (input: string): ParsedCommand => {
        const result: ParsedCommand = {
            type: "EXPENSE",
            mode: "SINGLE",
            date: new Date()
        }

        const lower = input.toLowerCase()

        // 1. Detect Type
        if (lower.includes('+') || lower.includes('ingreso') || lower.includes('cobro')) {
            result.type = "INCOME"
        }

        // 2. Detect Mode
        if (lower.includes('mensual') || lower.includes('netflix') || lower.includes('spotify') || lower.includes('cada mes')) {
            result.mode = "SUBSCRIPTION"
        } else if (lower.includes('semanal') || lower.includes('cada semana')) {
            result.mode = "RECURRING"
        } else if (lower.includes('mañana') || lower.includes('el lunes') || lower.includes('programar') || lower.includes('futuro')) {
            result.mode = "SCHEDULED"
        }

        // 3. Detect Amount (last number sequence, usually)
        // Matches "15.50" or "15" or "$15"
        const amountMatch = input.match(/(\d+([.,]\d{1,2})?)/g)
        if (amountMatch) {
            // Take the last one typically, or the one that looks most like a price (not part of a date like "2023")
            // For now, simple logic: last number
            const rawAmount = amountMatch[amountMatch.length - 1].replace(',', '.')
            const amount = parseFloat(rawAmount)
            if (!isNaN(amount)) {
                result.amount = amount
            }
        }

        // 4. Detect Date keywords
        if (lower.includes('ayer')) {
            result.date = subDays(new Date(), 1)
        } else if (lower.includes('mañana')) {
            result.date = addDays(new Date(), 1)
        } else if (lower.includes('el lunes')) {
            result.date = nextMonday(new Date())
        }

        // 5. Clean Description
        // Remove known keywords to leave the title
        let cleanDesc = input
            .replace(/(\d+([.,]\d{1,2})?)/g, '') // remove numbers
            .replace(/\b(ingreso|cobro|deposito|mensual|cada mes|semanal|cada semana|mañana|ayer|hoy|el lunes)\b/gi, '')
            .replace(/[+$]/g, '')
            .trim()
            .replace(/\s+/g, ' ') // normalize spaces

        // Auto capitalize
        if (cleanDesc.length > 0) {
            cleanDesc = cleanDesc.charAt(0).toUpperCase() + cleanDesc.slice(1)
        }

        result.description = cleanDesc

        return result
    }

    return { parseCommand }
}
