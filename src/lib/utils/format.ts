/**
 * Formats a number as a currency string in Algerian Dinar (DA).
 * @param amount The amount to format
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-DZ', { 
        style: 'currency', 
        currency: 'DZD' 
    }).format(amount).replace('DZD', 'DA');
}
