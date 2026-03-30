// ──────────────────────────────────────────────────────
// 📁 frontend/src/pages/Admin/utils/financialHelpers.js
// دوال مشتركة للإدارة المالية — تُستورد من جميع صفحات الإدارة المالية
// ──────────────────────────────────────────────────────

/**
 * تسمية الأدوار المالية بالعربي
 */
export function getRoleLabel(role) {
    switch (role) {
        case "SELLER": return "بائع";
        case "SHIPPING": return "شركة شحن";
        case "PLATFORM": return "المنصة";
        case "SALES": return "إجمالي المبيعات";
        default: return role || "-";
    }
}

/**
 * ألوان / كلاسات CSS لكل دور
 */
export const ROLE_CONFIG = {
    SELLER: { color: "primary", label: "بائع" },
    SHIPPING: { color: "success", label: "شركة شحن" },
    PLATFORM: { color: "muted", label: "المنصة" },
    SALES: { color: "accent", label: "إجمالي المبيعات" },
};

/**
 * تنسيق طريقة الدفع — متطابق مع إدارة الطلبات
 */
export function formatPaymentMethod(method) {
    if (!method) return "-";
    const code = String(method).toUpperCase();
    switch (code) {
        case "COD":
        case "CASH_ON_DELIVERY": return "الدفع عند الاستلام";
        case "ONLINE":
        case "CARD":
        case "CREDIT_CARD": return "الدفع بالبطاقة";
        case "BANK_TRANSFER": return "الحوالة البنكية";
        case "WALLET": return "الدفع بالمحفظة";
        default: return method;
    }
}

/**
 * تسمية نوع العملية المالية بالعربي
 */
export function getTypeLabel(type) {
    switch (type) {
        case "ORDER_EARNING_SELLER": return "مستحقات البائع من الطلبات";
        case "ORDER_EARNING_SHIPPING": return "مستحقات شركة الشحن";
        case "ORDER_EARNING_PLATFORM": return "عمولة المنصة";
        case "PAYOUT": return "تحويل / إرسال";
        case "REFUND": return "استرجاع";
        case "SUPPLY": return "توريد";
        default: return type || "-";
    }
}

/**
 * تسمية نوع العملية — مختصر (للجداول المضغوطة)
 */
export function getTypeShortLabel(type) {
    switch (type) {
        case "ORDER_EARNING_SELLER": return "مستحقات بائع";
        case "ORDER_EARNING_SHIPPING": return "مستحقات شحن";
        case "ORDER_EARNING_PLATFORM": return "عمولة منصة";
        case "PAYOUT": return "تحويل";
        case "REFUND": return "استرجاع";
        case "SUPPLY": return "توريد";
        default: return type || "-";
    }
}

/**
 * هل العملية "صادرة" (تقلل الرصيد)؟
 */
export function isOutgoing(type) {
    return type === "PAYOUT" || type === "REFUND";
}

/**
 * تحويل فلتر التاريخ إلى from/to
 */
export function computeDateRange(preset, customFrom, customTo) {
    const now = new Date();

    if (preset === "custom" && customFrom && customTo) {
        return {
            from: new Date(customFrom).toISOString(),
            to: new Date(customTo).toISOString(),
        };
    }

    let from;
    const to = now.toISOString();

    if (preset === "today") {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        from = d.toISOString();
    } else if (preset === "week") {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        from = d.toISOString();
    } else if (preset === "year") {
        const d = new Date();
        d.setFullYear(d.getFullYear() - 1);
        from = d.toISOString();
    } else if (preset === "all") {
        return { from: undefined, to: undefined };
    } else {
        // الافتراضي: الشهر الحالي (آخر 30 يوم تقريباً)
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        from = d.toISOString();
    }

    return { from, to };
}

/**
 * ترجمة أسماء فلاتر الفترات الزمنية
 */
export const DATE_PRESET_LABELS = {
    all: "الكل",
    today: "اليوم",
    week: "أسبوع",
    month: "شهر",
    year: "سنة",
    custom: "مخصص",
};

/**
 * ثوابت ترقيم الصفحات
 */
export const PAGE_SIZE = 10;
