/**
 * Text normalization utilities for phone models and brands
 */
/**
 * Normalize text by removing accents, converting to lowercase, and standardizing whitespace
 */
export function normalize(text) {
    if (!text)
        return "";
    const stripped = text
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
    return stripped.replace(/[^a-z0-9]+/g, " ").trim();
}
/**
 * Create a cache key from brand and model names
 */
export function keyFor(brand, model) {
    return `${normalize(brand)}|${normalize(model)}`;
}
/**
 * Extract slug from GSMArena URL
 * Example: https://www.gsmarena.com/samsung_galaxy_s25-12345.php -> samsung_galaxy_s25
 */
export function slugFromUrl(url) {
    if (!url)
        return "";
    const match = url.match(/\/([^/]+)-(\d+)\.php/);
    if (match)
        return match[1];
    return "";
}
