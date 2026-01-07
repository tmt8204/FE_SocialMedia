// Utility functions for feed (user, jwt, escape, etc.)

export function postIdNum(id) {
    return id.toString().replace(/^post-/, '');
}

export function parseJwtPayload(token) {
    if (!token) return null;
    try {
        const part = token.split('.')[1];
        const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
        const json = atob(b64);
        return JSON.parse(json);
    } catch (e) {
        return null;
    }
}

export function getCurrentUserId(api) {
    const t = api.getToken();
    if (!t) return null;
    const payload = parseJwtPayload(t);
    if (!payload) return null;
    return payload.sub || payload.userId || null;
}

export function getCurrentUserNameFromToken(api) {
    const t = api.getToken();
    if (!t) return null;
    const payload = parseJwtPayload(t);
    if (!payload) return null;
    return payload.userName || null;
}

export function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
