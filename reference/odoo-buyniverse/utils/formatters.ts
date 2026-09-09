
export const formatCurrency = (amount: number, currency: string = 'USD') => {
    // Handle potential non-numeric inputs gracefully
    if (isNaN(amount) || typeof amount !== 'number') {
        amount = 0;
    }
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
};
