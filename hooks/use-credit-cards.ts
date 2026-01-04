
import { useQuery } from '@tanstack/react-query'
import { useSettingsStore } from './use-settings-store'
import { useExchangeRates } from './use-exchange-rates'

export interface CreditCard {
    id: string
    name: string
    last_four_digits: string
    credit_limit: number
    used_balance: number
    currency_code: string
    closing_day: number
    payment_due_day: number
    icon?: string
    color?: string
    card_network?: string
}

export function useCreditCards() {
    const { convert } = useExchangeRates()
    const { currencyCode: baseCurrency } = useSettingsStore()

    const { data: cards, isLoading } = useQuery<CreditCard[]>({
        queryKey: ['credit-cards'],
        queryFn: async () => {
            const res = await fetch('/api/credit-cards')
            if (!res.ok) throw new Error('Error fetching credit cards')
            return res.json()
        }
    })

    return {
        cards,
        isLoading
    }
}
