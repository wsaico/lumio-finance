'use client';

export function useCurrency() {
    return {
        format: (value: number, currency: string = 'PEN') => {
            return new Intl.NumberFormat('es-PE', {
                style: 'currency',
                currency,
                minimumFractionDigits: 2
            }).format(value);
        }
    };
}
