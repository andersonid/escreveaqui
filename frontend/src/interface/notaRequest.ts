export interface NotaRequest {
    content: string;
    ttlMinutes?: number | null;
    configureExpiration?: boolean;
    accessToken?: string | null;
}
