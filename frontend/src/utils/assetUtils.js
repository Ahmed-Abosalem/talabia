/**
 * s:\Talabia_new\frontend\src\utils\assetUtils.js
 * 
 * Shared utility for handling assets and media across the application.
 */

const API_BASE_URL =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    "";

/**
 * Resolves an image path to a full URL.
 * Handles different path formats and environment variables.
 * 
 * @param {string} imagePath - The relative or absolute path of the image.
 * @returns {string} - The full URL to the image.
 */
export const resolveImageUrl = (imagePath) => {
    if (!imagePath || typeof imagePath !== "string") return "";

    if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
        return imagePath;
    }

    let normalized = imagePath.trim();

    if (!normalized.startsWith("/")) {
        if (normalized.startsWith("uploads/")) {
            normalized = "/" + normalized;
        } else if (normalized.startsWith("ads/")) {
            normalized = "/uploads/" + normalized;
        } else if (normalized.startsWith("products/")) {
            normalized = "/uploads/" + normalized;
        } else {
            normalized = "/uploads/" + normalized;
        }
    }

    return `${API_BASE_URL}${normalized}`;
};
