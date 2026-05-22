import type { AdminNote } from "@/interface/admin"
import { formatDateTime, formatRemaining, formatTtlMinutes, remainingMs } from "@/lib/noteTime"

export type SortKey =
  | "slug"
  | "createdAt"
  | "updatedAt"
  | "createdClientIp"
  | "lastClientIp"
  | "ttlMinutes"
  | "expiresAt"
  | "remaining"
  | "isProtected"
  | "expired"
  | "attachmentCount"
  | "attachmentSizeBytes"

export type SortDir = "asc" | "desc"

export type ProtectionFilter = "all" | "yes" | "no"
export type ExpirationFilter = "all" | "none" | "active" | "expired"

export function buildNoteSearchText(note: AdminNote): string {
  const parts = [
    note.slug,
    note.createdClientIp,
    note.lastClientIp,
    formatDateTime(note.createdAt),
    formatDateTime(note.updatedAt),
    formatDateTime(note.expiresAt),
    formatTtlMinutes(note.ttlMinutes),
    formatRemaining(note.expiresAt),
    note.isProtected ? "protegida sim" : "protegida não",
    note.expired ? "expirada" : "ativa",
    note.attachmentCount > 0 ? `${note.attachmentCount} anexo anexos` : "sem anexos",
  ]
  return parts.filter(Boolean).join(" ").toLowerCase()
}

function compareStrings(a: string, b: string, dir: SortDir): number {
  const r = a.localeCompare(b, "pt-BR", { sensitivity: "base" })
  return dir === "asc" ? r : -r
}

function compareNumbers(a: number, b: number, dir: SortDir): number {
  return dir === "asc" ? a - b : b - a
}

function sortValue(note: AdminNote, key: SortKey): string | number | boolean {
  switch (key) {
    case "slug":
      return note.slug
    case "createdAt":
      return new Date(note.createdAt).getTime()
    case "updatedAt":
      return new Date(note.updatedAt).getTime()
    case "createdClientIp":
      return note.createdClientIp ?? ""
    case "lastClientIp":
      return note.lastClientIp ?? ""
    case "ttlMinutes":
      return note.ttlMinutes ?? -1
    case "expiresAt":
      return note.expiresAt ? new Date(note.expiresAt).getTime() : 0
    case "remaining": {
      const ms = remainingMs(note.expiresAt)
      if (ms == null) return Number.POSITIVE_INFINITY
      return ms
    }
    case "isProtected":
      return note.isProtected ? 1 : 0
    case "expired":
      return note.expired ? 1 : 0
    case "attachmentCount":
      return note.attachmentCount
    case "attachmentSizeBytes":
      return note.attachmentSizeBytes
  }
}

export function filterAndSortNotes(
  notes: AdminNote[],
  options: {
    query: string
    protection: ProtectionFilter
    expiration: ExpirationFilter
    sortKey: SortKey
    sortDir: SortDir
  }
): AdminNote[] {
  const q = options.query.trim().toLowerCase()

  let result = notes.filter((note) => {
    if (options.protection === "yes" && !note.isProtected) return false
    if (options.protection === "no" && note.isProtected) return false

    const hasExpiry = note.expiresAt != null && (note.ttlMinutes ?? 0) > 0
    switch (options.expiration) {
      case "none":
        if (hasExpiry) return false
        break
      case "active":
        if (!hasExpiry || note.expired) return false
        break
      case "expired":
        if (!note.expired) return false
        break
    }

    if (q && !buildNoteSearchText(note).includes(q)) return false
    return true
  })

  result = [...result].sort((a, b) => {
    const va = sortValue(a, options.sortKey)
    const vb = sortValue(b, options.sortKey)
    if (typeof va === "number" && typeof vb === "number") {
      return compareNumbers(va, vb, options.sortDir)
    }
    if (typeof va === "boolean" && typeof vb === "boolean") {
      return compareNumbers(va ? 1 : 0, vb ? 1 : 0, options.sortDir)
    }
    return compareStrings(String(va), String(vb), options.sortDir)
  })

  return result
}
