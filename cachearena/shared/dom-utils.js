/**
 * DOM manipulation utilities
 */
/**
 * Extract text content from a DOM node, normalizing whitespace
 */
export function text(node) {
    if (!node)
        return "";
    return (node.textContent || "").replace(/\s+/g, " ").trim();
}
/**
 * Extract text from multiple nodes
 */
export function texts(nodes) {
    return Array.from(nodes || [])
        .map((n) => text(n))
        .filter(Boolean);
}
/**
 * Parse a number from text, handling suffixes like 'k' and 'm'
 */
export function toNumber(raw) {
    if (!raw)
        return "";
    const str = String(raw).trim().toLowerCase();
    const match = str.match(/([\d,.]+)\s*([km])?/);
    if (!match)
        return "";
    const num = parseFloat(match[1].replace(/,/g, ""));
    if (!isFinite(num))
        return "";
    if (match[2] === "k")
        return Math.round(num * 1000);
    if (match[2] === "m")
        return Math.round(num * 1000000);
    return Math.round(num);
}
/**
 * Extract image source from an img element
 */
export function pickSrc(img) {
    if (!img)
        return "";
    return img.getAttribute("src") || (img.dataset?.src ?? "") || (img.dataset?.srcset ?? "");
}
/**
 * Get attribute value from an element
 */
export function attr(el, name) {
    if (!el)
        return "";
    return el.getAttribute(name) || "";
}
