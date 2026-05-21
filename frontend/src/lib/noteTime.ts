export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString("pt-BR")
  } catch {
    return "—"
  }
}

export function formatTtlMinutes(minutes: number | null | undefined): string {
  if (minutes == null || minutes <= 0) return "Sem expiração"
  if (minutes % 1440 === 0) {
    const days = minutes / 1440
    return `${days} dia(s)`
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60
    return `${hours} hora(s)`
  }
  return `${minutes} minuto(s)`
}

export function formatRemaining(expiresAt: string | null | undefined): string {
  if (!expiresAt) return "—"
  const end = new Date(expiresAt).getTime()
  const diffMs = end - Date.now()
  if (diffMs <= 0) return "Expirada"
  const totalMinutes = Math.floor(diffMs / 60_000)
  if (totalMinutes < 60) return `${totalMinutes} min`
  if (totalMinutes < 1440) {
    const h = Math.floor(totalMinutes / 60)
    const m = totalMinutes % 60
    return m > 0 ? `${h} h ${m} min` : `${h} h`
  }
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  return hours > 0 ? `${days} d ${hours} h` : `${days} d`
}
