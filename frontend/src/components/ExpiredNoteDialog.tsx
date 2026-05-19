import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface ExpiredNoteDialogProps {
  slug: string
  open: boolean
  onCreateNew: () => void
}

export default function ExpiredNoteDialog({ slug, open, onCreateNew }: ExpiredNoteDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Nota expirada</DialogTitle>
          <DialogDescription>
            A nota em <span className="font-mono">{slug}</span> expirou por inatividade e o conteúdo
            anterior não pode mais ser recuperado. O endereço continua o mesmo; para escrever de
            novo aqui, crie uma nota nova neste slug.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" onClick={onCreateNew}>
            Criar nova nota neste endereço
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
