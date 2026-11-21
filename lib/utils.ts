import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'PEN', locale: string = 'es-PE') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

/**
 * Clean account name if it already contains currency in parenthesis,
 * preventing redundant display like "Ahorros BCP (PEN) (PEN)".
 */
export function formatAccountPillName(name: string, currencyCode?: string): string {
  if (!name) return ""
  if (!currencyCode) return name
  
  // If the name already includes (CODE) or ends with CODE, don't duplicate it
  const pattern = new RegExp(`\\s*\\(${currencyCode}\\)\\s*$`, 'i')
  const baseName = name.replace(pattern, '').trim()
  
  return `${baseName} (${currencyCode})`
}

