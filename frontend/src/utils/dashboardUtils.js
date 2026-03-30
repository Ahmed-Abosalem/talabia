/**
 * s:\Talabia_new\frontend\src\utils\dashboardUtils.js
 * 
 * Shared utility for dashboard-specific logic and data normalization.
 */

/**
 * Returns a date range object (from, to) based on a specific filter.
 * 
 * @param {string} filter - The time filter (today, 7d, 30d, year, custom, all).
 * @param {string|Date} customFrom - Custom start date.
 * @param {string|Date} customTo - Custom end date.
 * @returns {object} - { from: Date, to: Date } or empty object.
 */
export function getDateRangeFromFilter(filter, customFrom, customTo) {
    if (filter === "all") return {};

    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    switch (filter) {
        case "today": {
            return { from: start, to: end };
        }
        case "7d": {
            const s = new Date(start);
            s.setDate(s.getDate() - 6);
            return { from: s, to: end };
        }
        case "30d": {
            const s = new Date(start);
            s.setDate(s.getDate() - 29);
            return { from: s, to: end };
        }
        case "year": {
            const s = new Date(start.getFullYear(), 0, 1);
            s.setHours(0, 0, 0, 0);
            return { from: s, to: end };
        }
        case "custom": {
            const range = {};
            if (customFrom) {
                const f = new Date(customFrom);
                if (!isNaN(f)) {
                    f.setHours(0, 0, 0, 0);
                    range.from = f;
                }
            }
            if (customTo) {
                const t = new Date(customTo);
                if (!isNaN(t)) {
                    t.setHours(23, 59, 59, 999);
                    range.to = t;
                }
            }
            return range;
        }
        default:
            return {};
    }
}

/**
 * Builds an empty address object.
 */
export function buildEmptyAddress() {
    return { country: "", city: "", area: "", street: "", details: "" };
}

/**
 * Normalizes address data from the API into a consistent object.
 */
export function normalizeAddressFromApi(address) {
    if (!address) return buildEmptyAddress();
    if (typeof address === "string") {
        return { ...buildEmptyAddress(), details: address };
    }
    if (typeof address === "object") {
        return {
            country: address.country || "",
            city: address.city || "",
            area: address.area || "",
            street: address.street || "",
            details: address.details || "",
        };
    }
    return buildEmptyAddress();
}
