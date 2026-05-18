export interface NotaRequest {
    content: string;
    ttlMinutes?: number | null;
    accessToken?: string | null;
}
