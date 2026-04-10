/**
 * Escapes HTML special characters to prevent XSS.
 * @param {string} unsafe - The string to escape.
 * @returns {string} - The escaped string.
 */
export function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

/**
 * Formats an ISO string to a localized full date and time.
 * @param {string} isoString - The ISO date string.
 * @returns {string} - Localized date and time.
 */
export function formatFullLocal(isoString) {
    if (!isoString) return 'Unknown';
    return new Date(isoString).toLocaleString();
}

/**
 * Formats an ISO string to a medium localized format.
 * @param {string} isoString 
 * @returns {string}
 */
export function formatDate(isoString) {
    if (!isoString) return 'Unknown';
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Returns a relative time string (e.g., "5m ago").
 * @param {string} isoString 
 * @returns {string}
 */
export function getRelativeTime(isoString) {
    if (!isoString) return 'Unknown';
    const now = new Date();
    const then = new Date(isoString);
    const diffInSeconds = Math.floor((now - then) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'yesterday';
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return formatDate(isoString);
}
