import axios, { isAxiosError } from 'axios';
import type { Nota } from '../interface/nota';
import type { NotaRequest } from '../interface/notaRequest';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1/notes',
    headers: {
        'Content-Type': 'application/json',
    },
});

function authHeaders(token?: string): Record<string, string> {
    if (!token) return {};
    return { 'X-Note-Token': token };
}

export const notaService = {
    async getBySlug(slug: string, token?: string): Promise<Nota> {
        const response = await api.get<Nota>(`/${slug.trim()}`, {
            headers: authHeaders(token),
        });
        return response.data;
    },

    async upsert(
        slug: string,
        content: string,
        options?: {
            ttlMinutes?: number | null;
            accessToken?: string | null;
            token?: string;
        }
    ): Promise<void> {
        const payload: NotaRequest = {
            content,
            ttlMinutes: options?.ttlMinutes,
            accessToken: options?.accessToken,
        };
        await api.put(`/${slug.trim()}`, payload, {
            headers: authHeaders(options?.token),
        });
    },

    isForbidden(error: unknown): boolean {
        return isAxiosError(error) && error.response?.status === 403;
    },

    getErrorMessage(error: unknown): string {
        if (isAxiosError(error)) {
            const detail = error.response?.data?.detail;
            if (typeof detail === 'string' && detail.length > 0) {
                return detail;
            }
            if (error.response?.status === 403) {
                return 'Senha incorreta ou ausente para alterar esta nota.';
            }
            if (error.response?.status === 400) {
                return 'Dados inválidos. Verifique os campos e tente novamente.';
            }
        }
        return 'Não foi possível salvar as configurações. Tente novamente.';
    },
};
