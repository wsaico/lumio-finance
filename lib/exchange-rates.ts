export async function getExchangeRate(from: string, to: string): Promise<number | null> {
    if (from === to) return 1;

    try {
        // Using open.er-api.com (Supports PEN, MXN, and other global currencies)
        // No API key required for standard usage
        const res = await fetch(`https://open.er-api.com/v6/latest/${from}`);
        if (!res.ok) throw new Error('Failed to fetch rate');

        const data = await res.json();
        return data.rates[to] || null;
    } catch (error) {
        // Next.js dynamic usage error detection - MUST re-throw immediately and silently
        if (error && (
            error.digest === 'DYNAMIC_SERVER_USAGE' || 
            (error.message && error.message.includes('Dynamic server usage')) ||
            (String(error).includes('Dynamic server usage')) ||
            (String(error).includes('cookies')) ||
            (String(error).includes('next/headers'))
        )) {
            throw error;
        }

        console.error('Error fetching exchange rate:', error);
        return null; // Return null to handle UI gracefully instead of crashing
    }
}
