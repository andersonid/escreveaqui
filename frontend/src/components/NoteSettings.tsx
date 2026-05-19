import { useEffect, useState } from "react"
import { Settings, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export type TtlUnit = "minutes" | "hours" | "days"

export interface NoteSettingsState {
  expirationEnabled: boolean
  ttlValue: number
  ttlUnit: TtlUnit
  protectionEnabled: boolean
  accessPassword: string
}

interface NoteSettingsProps {
  slug: string
  initialTtlMinutes: number | null
  initialProtected: boolean
  expiresAt: string | null
  onApply: (settings: NoteSettingsState) => Promise<void>
}

export function ttlMinutesFromParts(enabled: boolean, value: number, unit: TtlUnit): number | null {
  if (!enabled || value <= 0) return null
  const multipliers: Record<TtlUnit, number> = {
    minutes: 1,
    hours: 60,
    days: 1440,
  }
  return value * multipliers[unit]
}

function partsFromTtlMinutes(ttlMinutes: number | null): Pick<NoteSettingsState, "expirationEnabled" | "ttlValue" | "ttlUnit"> {
  if (!ttlMinutes || ttlMinutes <= 0) {
    return { expirationEnabled: false, ttlValue: 30, ttlUnit: "days" }
  }
  if (ttlMinutes % 1440 === 0) {
    return { expirationEnabled: true, ttlValue: ttlMinutes / 1440, ttlUnit: "days" }
  }
  if (ttlMinutes % 60 === 0) {
    return { expirationEnabled: true, ttlValue: ttlMinutes / 60, ttlUnit: "hours" }
  }
  return { expirationEnabled: true, ttlValue: ttlMinutes, ttlUnit: "minutes" }
}

export function formatExpiresAt(expiresAt: string | null): string | null {
  if (!expiresAt) return null
  try {
    return new Date(expiresAt).toLocaleString("pt-BR")
  } catch {
    return null
  }
}

function validateSettings(
  settings: NoteSettingsState,
  initialProtected: boolean
): string | null {
  if (settings.expirationEnabled && settings.ttlValue < 1) {
    return "Informe um tempo de expiração válido (mínimo 1)."
  }

  const password = settings.accessPassword.trim()
  const needsNewPassword = settings.protectionEnabled && !initialProtected
  const changingPassword = settings.protectionEnabled && initialProtected && password.length > 0

  if (needsNewPassword && password.length < 4) {
    return "Para proteger a nota, defina uma senha com pelo menos 4 caracteres."
  }

  if (changingPassword && password.length < 4) {
    return "A nova senha deve ter pelo menos 4 caracteres."
  }

  return null
}

export default function NoteSettings({
  slug,
  initialTtlMinutes,
  initialProtected,
  expiresAt,
  onApply,
}: NoteSettingsProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const initialParts = partsFromTtlMinutes(initialTtlMinutes)
  const [expirationEnabled, setExpirationEnabled] = useState(initialParts.expirationEnabled)
  const [ttlValue, setTtlValue] = useState(initialParts.ttlValue)
  const [ttlUnit, setTtlUnit] = useState<TtlUnit>(initialParts.ttlUnit)
  const [protectionEnabled, setProtectionEnabled] = useState(initialProtected)
  const [accessPassword, setAccessPassword] = useState("")

  const resetForm = () => {
    const parts = partsFromTtlMinutes(initialTtlMinutes)
    setExpirationEnabled(parts.expirationEnabled)
    setTtlValue(parts.ttlValue)
    setTtlUnit(parts.ttlUnit)
    setProtectionEnabled(initialProtected)
    setAccessPassword("")
    setError(null)
    setSuccess(false)
  }

  useEffect(() => {
    if (open) {
      resetForm()
    }
  }, [initialTtlMinutes, initialProtected, open])

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      resetForm()
    }
  }

  const handleApply = async () => {
    const settings: NoteSettingsState = {
      expirationEnabled,
      ttlValue,
      ttlUnit,
      protectionEnabled,
      accessPassword,
    }

    const validationError = validateSettings(settings, initialProtected)
    if (validationError) {
      setError(validationError)
      setSuccess(false)
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      await onApply(settings)
      setSuccess(true)
      setAccessPassword("")
      window.setTimeout(() => {
        setOpen(false)
        setSuccess(false)
      }, 600)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar as configurações.")
    } finally {
      setSaving(false)
    }
  }

  const previewTtl = ttlMinutesFromParts(expirationEnabled, ttlValue, ttlUnit)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-3 left-3 z-20 bg-background/80 backdrop-blur border shadow-sm"
          title="Configurações da nota"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Configurações</DialogTitle>
          <DialogDescription>
            Nota <span className="font-mono">{slug}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Expiração automática</p>
                <p className="text-xs text-muted-foreground">
                  Renova a partir de cada edição
                </p>
              </div>
              <Switch
                checked={expirationEnabled}
                onCheckedChange={setExpirationEnabled}
                disabled={saving}
              />
            </div>

            {expirationEnabled && (
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  min={1}
                  value={ttlValue}
                  onChange={(e) => setTtlValue(Number(e.target.value))}
                  className="w-24"
                  disabled={saving}
                />
                <select
                  value={ttlUnit}
                  onChange={(e) => setTtlUnit(e.target.value as TtlUnit)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
                  disabled={saving}
                >
                  <option value="minutes">minutos</option>
                  <option value="hours">horas</option>
                  <option value="days">dias</option>
                </select>
              </div>
            )}

            {expirationEnabled && previewTtl && (
              <p className="text-xs text-muted-foreground">
                Após {previewTtl} minuto(s) sem edição, a nota é apagada. Editar renova o prazo.
              </p>
            )}
            {expiresAt && expirationEnabled && (
              <p className="text-xs text-muted-foreground">
                Expira em: {formatExpiresAt(expiresAt)}
              </p>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Proteger com senha</p>
                <p className="text-xs text-muted-foreground">
                  Compartilhe a senha com quem deve acessar
                </p>
              </div>
              <Switch
                checked={protectionEnabled}
                onCheckedChange={setProtectionEnabled}
                disabled={saving}
              />
            </div>

            {protectionEnabled && (
              <Input
                type="password"
                value={accessPassword}
                onChange={(e) => setAccessPassword(e.target.value)}
                placeholder={initialProtected ? "Nova senha (deixe vazio para manter)" : "Definir senha de acesso"}
                disabled={saving}
                autoComplete="new-password"
              />
            )}
            {protectionEnabled && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Guarde a senha com segurança: não há recuperação. Sem ela o conteúdo fica
                inacessível (permanece no servidor, mas ilegível). Ao atualizar a página será
                preciso digitá-la de novo.
              </p>
            )}
          </section>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          {success && (
            <p className="text-sm text-primary flex items-center gap-2" role="status">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Configurações salvas
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={() => void handleApply()} disabled={saving || success}>
            {saving ? "Salvando…" : success ? "Salvo" : "Aplicar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
