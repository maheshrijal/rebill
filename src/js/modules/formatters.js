/**
 * Formatting Functions
 * Number parsing and currency/date formatting utilities
 */

/**
 * Parse a value as a number with fallback
 * @param {*} value - Value to parse
 * @param {number} fallback - Default if parsing fails
 * @returns {number} Parsed number or fallback
 */
export function parseNumber(value, fallback = 0) {
    const num = parseFloat(value);
    return Number.isFinite(num) ? num : fallback;
}

/**
 * Format amount as currency string
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (e.g., 'INR', 'USD')
 * @param {string} locale - Locale string (e.g., 'en-IN')
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, currency, locale) {
    const safeAmount = Number.isFinite(amount) ? amount : 0;
    try {
        return new Intl.NumberFormat(locale || 'en-IN', {
            style: 'currency',
            currency: currency || 'INR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(safeAmount);
    } catch (error) {
        const suffix = currency ? ` ${currency}` : '';
        return `${safeAmount.toFixed(2)}${suffix}`;
    }
}

/**
 * Format date value as DD/MM/YYYY
 * @param {string|Date} dateValue - Date to format
 * @returns {string} Formatted date string
 */
export function formatDate(dateValue) {
    if (!dateValue) return '';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return dateValue;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear());
    return `${day}/${month}/${year}`;
}
