/**
 * s:\Talabia_new\frontend\src\utils\formUtils.js
 * 
 * Shared utility for handling form-related logic, specifically keys and IDs.
 */

/**
 * Generates a safe key from a string value, supporting Arabic characters.
 * 
 * @param {string} value - The input string to convert to a key.
 * @param {string} fallbackPrefix - Prefix to use if the value is empty or invalid.
 * @returns {string} - A safe, URL-friendly or key-friendly string.
 */
export const makeSafeKey = (value, fallbackPrefix = "opt") => {
    const base = String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^\w\u0600-\u06FF-]+/g, "");
    return base || `${fallbackPrefix}-${Date.now()}`;
};

/**
 * Ensures a key is unique within a set of used keys by appending an index if necessary.
 * 
 * @param {string} baseKey - The desired key.
 * @param {Set|Array} usedKeys - A collection of keys already in use.
 * @returns {string} - A unique version of the baseKey.
 */
export const ensureUniqueKey = (baseKey, usedKeys) => {
    const keysSet = usedKeys instanceof Set ? usedKeys : new Set(usedKeys);
    let key = baseKey;
    let i = 1;
    while (keysSet.has(key)) {
        key = `${baseKey}-${i++}`;
    }
    return key;
};
