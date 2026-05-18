import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface AccessDialogProps {
  slug: string
  open: boolean
  error?: string | null
  loading?: boolean
  onSubmit: (token: string) => void | Promise<void>
}

export default function AccessDialog({ slug, open, error, loading, onSubmit }: AccessDialogProps) {
  const [token, setToken] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token.trim() || loading) return
    await onSubmit(token.trim())
  }

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nota protegida</DialogTitle>
            <DialogDescription>
              A nota <span className="font-mono">{slug}</span> exige senha de acesso.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Senha de acesso"
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Verificando…" : "Entrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
