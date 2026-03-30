// src/utils/currencyUtils.js

/**
 * Format an amount as Yemeni Rial (YER)
 * @param {number|string} amount 
 * @returns {string} Formatted string, e.g. "1,000 ر.ي"
 */
export const formatCurrency = (amount) => {
    if (amount === undefined || amount === null || isNaN(amount)) {
        return "0 ر.ي";
    }
    // استخدام التنسيق الرقمي الأمريكي للفواصل وتحديد منزلتين عشريتين بحد أقصى ثم إضافة "ر.ي"
    const numericAmount = Number(amount);
    return `${numericAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ر.ي`;
};
