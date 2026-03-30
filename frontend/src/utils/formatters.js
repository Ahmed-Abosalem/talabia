/**
 * Centralized formatting utilities for the Talabia system.
 * Ensures all numbers and dates use English digits (0-9) for a professional look,
 * while maintaining Arabic text when necessary.
 */

/**
 * Formats a number using English digits (Latin numerals).
 * @param {number|string} val - The value to format.
 * @returns {string} - Formatted number string.
 */
export const formatNumber = (val) => {
    const num = Number(val);
    if (isNaN(num)) return "0";
    return num.toLocaleString("en-US");
};

/**
 * Formats a currency value with the 'ر.ي' suffix using English digits.
 * @param {number|string} val - The price to format.
 * @returns {string} - Formatted currency string.
 */
export const formatCurrency = (val) => {
    const num = Number(val);
    if (isNaN(num)) return `0 ر.ي`;
    return `${num.toLocaleString("en-US")} ر.ي`;
};

/**
 * Formats a date using English digits while keeping Arabic month names and labels.
 * Uses the 'u-nu-latn' extension to force Latin (English) numerals.
 * @param {Date|string} date - The date to format.
 * @param {Object} [options] - Optional Intl.DateTimeFormat options.
 * @returns {string} - Formatted date string with English digits.
 */
export const formatDate = (date, options = {}) => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";

    const defaultOptions = {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        ...options,
    };

    // 'ar-EG-u-nu-latn' forces Arabic language with Latin (English) numerals
    return d.toLocaleString("ar-EG-u-nu-latn", defaultOptions);
};

/**
 * Ensures IDs or codes (like Order Codes) are displayed as strings with English digits.
 * @param {string|number} val - The ID or code.
 * @returns {string} - The code in English digits.
 */
export const formatCode = (val) => {
    if (val === null || val === undefined) return "";
    return String(val).replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
};

/**
 * Robust Asset URL Resolver
 * Handles Cloudinary/S3 metadata objects, relative paths, and absolute URLs.
 * Centralizes asset access to prevent code duplication and resolution errors.
 * @param {string|Object} asset - The asset path or metadata object.
 * @returns {string} - The resolved absolute URL.
 */
export const resolveAssetUrl = (asset) => {
    if (!asset) return "";

    // 1. Logic for object-based assets (e.g., from Cloudinary or structured storage)
    if (typeof asset === "object" && asset !== null) {
        const nestedUrl = asset.url || asset.secure_url || asset.path || asset.location || asset.imageUrl || "";
        if (!nestedUrl) return "";
        return resolveAssetUrl(nestedUrl); // Recursive normalization
    }

    if (typeof asset !== "string") return "";

    const trimmed = asset.trim();
    if (!trimmed) return "";

    // 2. Already Absolute URL (External/Cloudinary)
    if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
    }

    // 3. Local Relative Path (API storage)
    const API_BASE_URL = import.meta.env.VITE_API_URL || "";

    // Normalize leading slash to prevent double slashes (e.g. http://api.com//uploads)
    const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;

    // Some paths might already include 'uploads/' or 'products/'
    // If they don't, and it's a known storage path, we could enforce logic here, 
    // but usually, the backend returns the path from the storage root.
    return API_BASE_URL ? `${API_BASE_URL.replace(/\/$/, "")}${normalizedPath}` : normalizedPath;
};
