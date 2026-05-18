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
  onSubmit: (token: string) => void
}

export default function AccessDialog({ slug, open, error, onSubmit }: AccessDialogProps) {
  const [token, setToken] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!token.trim()) return
    onSubmit(token.trim())
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
            <Button type="submit">Entrar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
