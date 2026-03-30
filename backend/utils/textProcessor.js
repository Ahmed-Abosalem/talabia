// ────────────────────────────────────────────────
// 📁 backend/utils/textProcessor.js
// معالج النصوص العربية المتقدم لنظام البحث
// ────────────────────────────────────────────────

/**
 * دالة لإزالة التشكيل (Diacritics)
 */
function removeDiacritics(text) {
    if (!text) return "";
    return text.replace(/[\u064B-\u065F\u0670]/g, ""); // التنوين، الفتحة، الضمة، الكسرة، الشدة، السكون، إلخ
}

/**
 * دالة توحيد الحروف العربية (Normalization)
 * هذه الدالة "عدوانية" (Aggressive) لضمان أقصى درجات التطابق
 */
function normalizeArabic(text) {
    if (!text) return "";

    let normalized = text;

    // 1. إزالة التشكيل أولاً
    normalized = removeDiacritics(normalized);

    // 2. توحيد أشكال الألف (أ، إ، آ -> ا)
    normalized = normalized.replace(/[أإآ]/g, "ا");

    // 3. توحيد التاء المربوطة والهاء (ة -> ه)
    normalized = normalized.replace(/ة/g, "ه");

    // 4. توحيد الياء والمنى (ى -> ي)
    normalized = normalized.replace(/ى/g, "ي");

    // 5. تطبيع المسافات (إزالة المسافات المزدوجة والزائدة)
    normalized = normalized.replace(/\s+/g, " ").trim();

    // 6. توحيد الأحرف اللاتينية (Lowercasing)
    normalized = normalized.toLowerCase();

    return normalized;
}

/**
 * دالة تقسيم النص إلى كلمات (Tokenization)
 * مع معالجة الحالات الخاصة (مثل الكلمات المفصول بـ -)
 */
function tokenize(text) {
    if (!text) return [];

    const normalized = normalizeArabic(text);

    // تقسيم النص بناءً على المسافات والرموز
    // نعتبر الرموز التالية فواصل: مسافة، فاصلة، نقطة، شرطة، أقواس
    let tokens = normalized.split(/[\s,.\-_()\[\]]+/);

    // تنظيف الكلمات الفارغة
    tokens = tokens.filter(t => t && t.length > 0);

    // التعامل مع الكلمات المركبة (اختياري، لكن مفيد للبحث)
    // مثال: إذا كان النص "t-shirt"، الـ Split أعلاه سيحوله لـ ["t", "shirt"]
    // قد نحتاج لإضافة "tshirt" أيضاً إذا أردنا دعم البحث المتصل
    // لكن في البحث العربي، الـ Split كافٍ حالياً.

    return [...new Set(tokens)]; // إزالة التكرار
}

/**
 * المعالج الرئيسي: يحول نص خام إلى نص جاهز للفهرسة والبحث
 * @param {string} text النص الأصلي
 * @returns {object} { normalized: string, tokens: string[] }
 */
export const processText = (text) => {
    if (!text) return { normalized: "", tokens: [] };

    const normalized = normalizeArabic(text);
    const tokens = tokenize(text);

    return {
        normalized,
        tokens
    };
};

/**
 * تحضير نص البحث (Query Pre-processing)
 * @param {string} query نص البحث القادم من المستخدم
 * @returns {object} كائن يحتوي على الكلمات المفتاحية والنص المعالج
 */
export const prepareSearchQuery = (query) => {
    if (!query) return null;

    const { normalized, tokens } = processText(query);

    if (tokens.length === 0) return null;

    return {
        raw: query.trim(),
        normalized,
        tokens
    };
};
