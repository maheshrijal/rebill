/**
 * Calculations Module
 * Invoice totals calculation
 */

/**
 * Calculate invoice totals from items
 * @param {Array} items - Array of line items with total property
 * @param {number} taxRate - Tax rate as percentage
 * @param {number} discount - Discount amount
 * @returns {Object} Totals object with subtotal, taxRate, taxAmount, discount, total, balanceDue
 */
export function calculateTotals(items, taxRate, discount) {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount - discount;
    return {
        subtotal,
        taxRate,
        taxAmount,
        discount,
        total,
        balanceDue: total
    };
}
