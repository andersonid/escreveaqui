import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import PasswordInput from "@/components/PasswordInput"
import type { AdminNote } from "@/interface/admin"
import {
  ttlMinutesFromParts,
  type TtlUnit,
  partsFromTtlMinutes,
} from "@/components/NoteSettings"

interface AdminNoteEditDialogProps {
  note: AdminNote | null
  open: boolean
  onClose: () => void
  onSave: (payload: {
    configureExpiration: boolean
    ttlMinutes: number | null
    accessToken?: string | null
  }) => Promise<void>
}

export default function AdminNoteEditDialog({
  note,
  open,
  onClose,
  onSave,
}: AdminNoteEditDialogProps) {
  const [expirationEnabled, setExpirationEnabled] = useState(false)
  const [ttlValue, setTtlValue] = useState(30)
  const [ttlUnit, setTtlUnit] = useState<TtlUnit>("days")
  const [protectionEnabled, setProtectionEnabled] = useState(false)
  const [accessPassword, setAccessPassword] = useState("")
  const [accessPasswordConfirm, setAccessPasswordConfirm] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !note) return
    const parts = partsFromTtlMinutes(note.ttlMinutes)
    setExpirationEnabled(parts.expirationEnabled)
    setTtlValue(parts.ttlValue)
    setTtlUnit(parts.ttlUnit)
    setProtectionEnabled(note.isProtected)
    setAccessPassword("")
    setAccessPasswordConfirm("")
    setError(null)
  }, [open, note])

  const handleSave = async () => {
    if (!note) return

    const ttlMinutes = ttlMinutesFromParts(expirationEnabled, ttlValue, ttlUnit)

    let accessToken: string | null | undefined = undefined
    if (!protectionEnabled) {
      if (note.isProtected) accessToken = ""
    } else if (accessPassword.trim()) {
      if (accessPassword !== accessPasswordConfirm) {
        setError("As senhas não coincidem.")
        return
      }
      accessToken = accessPassword.trim()
    } else if (!note.isProtected) {
      setError("Informe uma senha para proteger a nota.")
      return
    }

    setSaving(true)
    setError(null)
    try {
      await onSave({
        configureExpiration: true,
        ttlMinutes,
        accessToken,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar nota</DialogTitle>
          <DialogDescription>
            Slug: <span className="font-mono">{note?.slug}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium">Expiração automática</p>
              <Switch checked={expirationEnabled} onCheckedChange={setExpirationEnabled} />
            </div>
            {expirationEnabled && (
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  min={1}
                  value={ttlValue}
                  onChange={(e) => setTtlValue(Number(e.target.value))}
                  className="w-24"
                />
                <select
                  value={ttlUnit}
                  onChange={(e) => setTtlUnit(e.target.value as TtlUnit)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="minutes">minutos</option>
                  <option value="hours">horas</option>
                  <option value="days">dias</option>
                </select>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium">Proteger com senha</p>
              <Switch checked={protectionEnabled} onCheckedChange={setProtectionEnabled} />
            </div>
            {protectionEnabled && (
              <div className="space-y-2">
                <PasswordInput
                  value={accessPassword}
                  onChange={setAccessPassword}
                  placeholder={note?.isProtected ? "Nova senha (vazio = manter)" : "Definir senha"}
                  autoComplete="new-password"
                />
                <PasswordInput
                  value={accessPasswordConfirm}
                  onChange={setAccessPasswordConfirm}
                  placeholder="Confirmar senha"
                  autoComplete="new-password"
                />
              </div>
            )}
            {!protectionEnabled && note?.isProtected && (
              <p className="text-xs text-neutral-700 dark:text-neutral-400">
                Ao salvar com proteção desligada, a senha da nota será removida.
              </p>
            )}
          </section>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
