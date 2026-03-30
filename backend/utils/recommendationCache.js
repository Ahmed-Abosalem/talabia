/**
 * 📁 backend/utils/recommendationCache.js
 * نظام كاش متطور مع حماية من الانهيار (Cache Stampede Protection)
 */

const cache = new Map();
const pendingRequests = new Map(); // لتحويل الطلبات المتزامنة لنفس المنتج لطلب واحد (Single-flight)

const DEFAULT_TTL = 1000 * 60 * 60 * 4; // 4 ساعات

/**
 * جلب البيانات من الكاش أو تنفيذ الوظيفة وتخزين النتيجة
 * @param {string} key - المفتاح (ProductId)
 * @param {Function} fetcher - دالة الجلب من القاعدة في حال عدم وجود كاش
 */
export async function getOrSetCache(key, fetcher) {
    const now = Date.now();
    const entry = cache.get(key);

    // 1. إذا كان الكاش موجوداً وصالحاً
    if (entry && entry.expiry > now) {
        return entry.data;
    }

    // 2. حماية الـ Stampede: إذا كان هناك طلب جاري فعلياً لنفس المفتاح
    if (pendingRequests.has(key)) {
        return pendingRequests.get(key);
    }

    // 3. بناء الطلب وتخزينه في الـ Pending
    const requestPromise = (async () => {
        try {
            const data = await fetcher();
            cache.set(key, {
                data,
                expiry: Date.now() + DEFAULT_TTL
            });
            return data;
        } finally {
            pendingRequests.delete(key);
        }
    })();

    pendingRequests.set(key, requestPromise);
    return requestPromise;
}

/**
 * إبطال الكاش لمنتج معين (Event-based Invalidation)
 */
export function invalidateCache(key) {
    if (key === 'all') {
        cache.clear();
    } else {
        cache.delete(key);
    }
}
