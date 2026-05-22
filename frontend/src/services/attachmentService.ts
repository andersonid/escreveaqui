import axios, { isAxiosError } from 'axios';
import type { Attachment, UploadUrlResponse, DownloadUrlResponse } from '../interface/attachment';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL
        ? import.meta.env.VITE_API_BASE_URL.replace(/\/notes$/, '/notes')
        : '/api/v1/notes',
    headers: { 'Content-Type': 'application/json' },
});

function authHeaders(token?: string): Record<string, string> {
    if (!token) return {};
    return { 'X-Note-Token': token };
}

export const attachmentService = {
    async list(slug: string, token?: string, prefix = ''): Promise<Attachment[]> {
        const { data } = await api.get<Attachment[]>(`/${slug}/attachments`, {
            params: { prefix },
            headers: authHeaders(token),
        });
        return data;
    },

    async getUploadUrl(
        slug: string,
        fileName: string,
        fileSize: number,
        contentType: string,
        token?: string,
        folder?: string
    ): Promise<UploadUrlResponse> {
        const { data } = await api.post<UploadUrlResponse>(
            `/${slug}/attachments/upload-url`,
            { fileName, fileSize, contentType, folder: folder || null },
            { headers: authHeaders(token) }
        );
        return data;
    },

    async uploadToS3(uploadUrl: string, file: File, onProgress?: (pct: number) => void): Promise<void> {
        await axios.put(uploadUrl, file, {
            headers: { 'Content-Type': file.type || 'application/octet-stream' },
            onUploadProgress: (e) => {
                if (onProgress && e.total) {
                    onProgress(Math.round((e.loaded / e.total) * 100));
                }
            },
        });
    },

    async getDownloadUrl(slug: string, attachmentId: string, token?: string): Promise<DownloadUrlResponse> {
        const { data } = await api.get<DownloadUrlResponse>(
            `/${slug}/attachments/${attachmentId}/download-url`,
            { headers: authHeaders(token) }
        );
        return data;
    },

    async createFolder(slug: string, name: string, token?: string, parentFolder?: string): Promise<Attachment> {
        const { data } = await api.post<Attachment>(
            `/${slug}/attachments/folder`,
            { name, parentFolder: parentFolder || null },
            { headers: authHeaders(token) }
        );
        return data;
    },

    async remove(slug: string, attachmentId: string, token?: string): Promise<void> {
        await api.delete(`/${slug}/attachments/${attachmentId}`, {
            headers: authHeaders(token),
        });
    },

    getErrorMessage(error: unknown): string {
        if (isAxiosError(error)) {
            const detail = error.response?.data?.detail;
            if (typeof detail === 'string' && detail.length > 0) return detail;
            if (error.response?.status === 403) return 'Acesso negado.';
            if (error.response?.status === 400) return 'Requisição inválida.';
        }
        return 'Erro inesperado. Tente novamente.';
    },
};
