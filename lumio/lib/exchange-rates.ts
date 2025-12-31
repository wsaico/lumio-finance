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
        console.error('Error fetching exchange rate:', error);
        return null; // Return null to handle UI gracefully instead of crashing
    }
}
