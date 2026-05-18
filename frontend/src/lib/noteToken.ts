const tokenKey = (slug: string) => `escreveaqui:token:${slug}`;

export function getStoredToken(slug: string): string | null {
    return sessionStorage.getItem(tokenKey(slug));
}

export function setStoredToken(slug: string, token: string): void {
    sessionStorage.setItem(tokenKey(slug), token);
}

export function clearStoredToken(slug: string): void {
    sessionStorage.removeItem(tokenKey(slug));
}
