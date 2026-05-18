export interface Nota {
    slug: string;
    content: string | null;
    updatedAt: string;
    ttlMinutes: number | null;
    expiresAt: string | null;
    isProtected: boolean;
}
