

const TIMEZONE = 'Asia/Shanghai';

/**
 * Converts a "local" datetime string (e.g. from datetime-local input, "2026-01-01T12:00")
 * explicitly assuming it is Beijing Time, into a UTC ISO string for storage.
 * 
 * Example: "2026-01-01T12:00" -> "2026-01-01T04:00:00.000Z"
 */
export function beijingToUtcIso(localString: string): string {
    if (!localString) return '';
    // If it already has Z or offset, trust it, otherwise append offset
    if (localString.includes('Z') || localString.includes('+')) {
        return new Date(localString).toISOString();
    }

    // Append Beijing offset to treat the string as Beijing time
    const beijingDate = new Date(`${localString}+08:00`);
    return beijingDate.toISOString();
}

/**
 * Formats a UTC ISO string into a display string in Beijing Time.
 * Default format: "YYYY-MM-DD HH:mm:ss"
 */
export function formatBeijing(isoString: string | Date, fmt: string = 'yyyy-MM-dd HH:mm:ss'): string {
    if (!isoString) return '-';
    const date = new Date(isoString);
    // Use date-fns-tz if available, or native Intl
    // Since we might not have date-fns installed, let's use native Intl for now to be safe and dependency-free
    return new Intl.DateTimeFormat('zh-CN', {
        timeZone: TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).format(date).replace(/\//g, '-');
}

/**
 * Returns the current time string suitable for datetime-local input value (YYYY-MM-DDTHH:mm)
 * in Beijing Time.
 * Used for setting default values or converting UTC DB value back to input.
 */
export function utcToBeijingInputString(isoString: string): string {
    if (!isoString) return '';
    const date = new Date(isoString);

    // Get parts in Beijing time
    const options: Intl.DateTimeFormatOptions = {
        timeZone: TIMEZONE,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
    };

    // Format: "2026/01/20 12:00:00" -> needs to become "2026-01-20T12:00"
    const parts = new Intl.DateTimeFormat('en-CA', { ...options, hour12: false }).formatToParts(date);

    // en-CA gives YYYY-MM-DD. checking parts roughly
    // simpler approach: shift the time via calculation
    const offset = 8 * 60 * 60 * 1000;
    const beijingTime = new Date(date.getTime() + offset);
    // Use getUTC* methods to extract the shifted time as "local" parts
    const y = beijingTime.getUTCFullYear();
    const m = String(beijingTime.getUTCMonth() + 1).padStart(2, '0');
    const d = String(beijingTime.getUTCDate()).padStart(2, '0');
    const hh = String(beijingTime.getUTCHours()).padStart(2, '0');
    const mm = String(beijingTime.getUTCMinutes()).padStart(2, '0');

    return `${y}-${m}-${d}T${hh}:${mm}`;
}

export function getBeijingNow(): Date {
    // Current time is just current time, but if we need formatting
    return new Date();
}
