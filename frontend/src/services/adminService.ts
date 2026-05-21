import axios, { isAxiosError } from "axios"
import type { AdminLoginResponse, AdminNote } from "@/interface/admin"

const ADMIN_TOKEN_KEY = "escreveaqui-admin-token"
const ADMIN_USER_KEY = "escreveaqui-admin-user"

function resolveAdminBaseUrl(): string {
  const notesBase = import.meta.env.VITE_API_BASE_URL ?? "/api/v1/notes"
  if (notesBase.endsWith("/notes")) {
    return notesBase.replace(/\/notes$/, "/admin")
  }
  return "/api/v1/admin"
}

const api = axios.create({
  baseURL: resolveAdminBaseUrl(),
  headers: { "Content-Type": "application/json" },
})

function authHeaders(): Record<string, string> {
  const token = sessionStorage.getItem(ADMIN_TOKEN_KEY)
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

export const adminSession = {
  getToken: () => sessionStorage.getItem(ADMIN_TOKEN_KEY),
  getUsername: () => sessionStorage.getItem(ADMIN_USER_KEY),
  setSession(token: string, username: string) {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, token)
    sessionStorage.setItem(ADMIN_USER_KEY, username)
  },
  clear() {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY)
    sessionStorage.removeItem(ADMIN_USER_KEY)
  },
  isLoggedIn: () => Boolean(sessionStorage.getItem(ADMIN_TOKEN_KEY)),
}

export const adminService = {
  async login(username: string, password: string): Promise<AdminLoginResponse> {
    const { data } = await api.post<AdminLoginResponse>("/login", { username, password })
    adminSession.setSession(data.token, data.username)
    return data
  },

  logout() {
    adminSession.clear()
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.put("/password", { currentPassword, newPassword }, { headers: authHeaders() })
    adminSession.clear()
  },

  async listNotes(): Promise<AdminNote[]> {
    const { data } = await api.get<AdminNote[]>("/notes", { headers: authHeaders() })
    return data
  },

  async updateNote(
    slug: string,
    body: {
      configureExpiration: boolean
      ttlMinutes: number | null
      accessToken?: string | null
    }
  ): Promise<AdminNote> {
    const { data } = await api.put<AdminNote>(`/notes/${encodeURIComponent(slug)}`, body, {
      headers: authHeaders(),
    })
    return data
  },

  async deleteNote(slug: string): Promise<void> {
    await api.delete(`/notes/${encodeURIComponent(slug)}`, { headers: authHeaders() })
  },

  getErrorMessage(error: unknown): string {
    if (isAxiosError(error)) {
      const detail = error.response?.data?.detail
      if (typeof detail === "string" && detail.length > 0) return detail
      if (error.response?.status === 401) return "Sessão expirada ou credenciais inválidas."
    }
    return "Não foi possível concluir a operação."
  },
}
