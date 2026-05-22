export interface AdminNote {
  id: string
  slug: string
  createdAt: string
  updatedAt: string
  createdClientIp: string | null
  lastClientIp: string | null
  ttlMinutes: number | null
  expiresAt: string | null
  isProtected: boolean
  expired: boolean
  attachmentCount: number
  attachmentSizeBytes: number
}

export interface AdminLoginResponse {
  token: string
  username: string
}
