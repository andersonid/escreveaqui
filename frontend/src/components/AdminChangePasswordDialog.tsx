import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import PasswordInput from "@/components/PasswordInput"

interface AdminChangePasswordDialogProps {
  open: boolean
  onClose: () => void
  onSave: (currentPassword: string, newPassword: string) => Promise<void>
}

export default function AdminChangePasswordDialog({
  open,
  onClose,
  onSave,
}: AdminChangePasswordDialogProps) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setError(null)
  }

  const handleSave = async () => {
    if (newPassword.length < 4) {
      setError("A nova senha deve ter pelo menos 4 caracteres.")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave(currentPassword, newPassword)
      reset()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao alterar senha.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          reset()
          onClose()
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Alterar senha do admin</DialogTitle>
          <DialogDescription>
            Após alterar, você precisará entrar novamente com a nova senha.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <PasswordInput
            value={currentPassword}
            onChange={setCurrentPassword}
            placeholder="Senha atual"
            autoComplete="current-password"
          />
          <PasswordInput
            value={newPassword}
            onChange={setNewPassword}
            placeholder="Nova senha"
            autoComplete="new-password"
          />
          <PasswordInput
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Confirmar nova senha"
            autoComplete="new-password"
          />
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
