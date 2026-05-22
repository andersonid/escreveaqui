import { useState, useEffect, useRef, useCallback } from "react"
import {
  Paperclip,
  Upload,
  FolderPlus,
  Trash2,
  Download,
  Folder,
  File,
  FileText,
  FileImage,
  FileVideo,
  FileArchive,
  ChevronLeft,
  Loader2,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { attachmentService } from "@/services/attachmentService"
import type { Attachment } from "@/interface/attachment"

interface NoteAttachmentsProps {
  slug: string
  accessToken?: string
  disabled?: boolean
  ttlMinutes: number | null
  expiresAt: string | null
}

interface UploadProgress {
  fileName: string
  progress: number
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function fileIcon(contentType: string, isFolder: boolean) {
  if (isFolder) return <Folder className="h-4 w-4 text-amber-500 shrink-0" />
  if (contentType.startsWith("image/")) return <FileImage className="h-4 w-4 text-blue-500 shrink-0" />
  if (contentType.startsWith("video/")) return <FileVideo className="h-4 w-4 text-purple-500 shrink-0" />
  if (contentType.startsWith("text/") || contentType.includes("json") || contentType.includes("yaml") || contentType.includes("xml") || contentType.includes("markdown"))
    return <FileText className="h-4 w-4 text-green-600 shrink-0" />
  if (contentType.includes("zip") || contentType.includes("tar") || contentType.includes("gzip") || contentType.includes("compress"))
    return <FileArchive className="h-4 w-4 text-orange-500 shrink-0" />
  if (contentType.includes("pdf")) return <FileText className="h-4 w-4 text-red-500 shrink-0" />
  return <File className="h-4 w-4 text-muted-foreground shrink-0" />
}

function formatExpiresAt(expiresAt: string | null): string | null {
  if (!expiresAt) return null
  try {
    return new Date(expiresAt).toLocaleString("pt-BR")
  } catch {
    return null
  }
}

export default function NoteAttachments({
  slug,
  accessToken,
  disabled = false,
  ttlMinutes,
  expiresAt,
}: NoteAttachmentsProps) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPrefix, setCurrentPrefix] = useState("")
  const [pathStack, setPathStack] = useState<string[]>([])
  const [uploads, setUploads] = useState<UploadProgress[]>([])
  const [newFolderName, setNewFolderName] = useState("")
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await attachmentService.list(slug, accessToken, currentPrefix)
      setItems(data)
    } catch (err) {
      setError(attachmentService.getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [slug, accessToken, currentPrefix])

  useEffect(() => {
    if (open) {
      void loadItems()
    }
  }, [open, loadItems])

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      setCurrentPrefix("")
      setPathStack([])
      setItems([])
      setError(null)
      setShowNewFolder(false)
      setNewFolderName("")
    }
  }

  const navigateInto = (folder: Attachment) => {
    setPathStack((prev) => [...prev, currentPrefix])
    setCurrentPrefix(folder.virtualPath)
  }

  const navigateBack = () => {
    setPathStack((prev) => {
      const next = [...prev]
      const parent = next.pop() ?? ""
      setCurrentPrefix(parent)
      return next
    })
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    for (const file of Array.from(files)) {
      const upload: UploadProgress = { fileName: file.name, progress: 0 }
      setUploads((prev) => [...prev, upload])

      try {
        const { uploadUrl } = await attachmentService.getUploadUrl(
          slug,
          file.name,
          file.size,
          file.type || "application/octet-stream",
          accessToken,
          currentPrefix || undefined
        )

        await attachmentService.uploadToS3(uploadUrl, file, (pct) => {
          setUploads((prev) =>
            prev.map((u) => (u.fileName === file.name ? { ...u, progress: pct } : u))
          )
        })

        setUploads((prev) => prev.filter((u) => u.fileName !== file.name))
      } catch (err) {
        setUploads((prev) => prev.filter((u) => u.fileName !== file.name))
        setError(attachmentService.getErrorMessage(err))
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = ""
    await loadItems()
  }

  const handleCreateFolder = async () => {
    const name = newFolderName.trim()
    if (!name) return

    try {
      await attachmentService.createFolder(slug, name, accessToken, currentPrefix || undefined)
      setNewFolderName("")
      setShowNewFolder(false)
      await loadItems()
    } catch (err) {
      setError(attachmentService.getErrorMessage(err))
    }
  }

  const handleDownload = async (attachment: Attachment) => {
    try {
      const { downloadUrl } = await attachmentService.getDownloadUrl(
        slug,
        attachment.id,
        accessToken
      )
      window.open(downloadUrl, "_blank")
    } catch (err) {
      setError(attachmentService.getErrorMessage(err))
    }
  }

  const handleDelete = async (attachment: Attachment) => {
    setDeleting(attachment.id)
    try {
      await attachmentService.remove(slug, attachment.id, accessToken)
      await loadItems()
    } catch (err) {
      setError(attachmentService.getErrorMessage(err))
    } finally {
      setDeleting(null)
    }
  }

  const breadcrumb = currentPrefix
    ? currentPrefix.replace(/\/$/, "").split("/")
    : []

  const hasExpiry = ttlMinutes !== null && ttlMinutes > 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          className="fixed top-3 left-14 z-20 bg-background/80 backdrop-blur border shadow-sm"
          title="Anexos"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Anexos</DialogTitle>
          <DialogDescription>
            Nota <span className="font-mono">{slug}</span>
          </DialogDescription>
        </DialogHeader>

        {hasExpiry && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>
              Nota com expiração ativa{expiresAt && ` (${formatExpiresAt(expiresAt)})`}.
              Ao expirar, a nota e todos os seus anexos serão removidos permanentemente.
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {pathStack.length > 0 && (
            <Button variant="ghost" size="sm" onClick={navigateBack} className="gap-1">
              <ChevronLeft className="h-3.5 w-3.5" />
              Voltar
            </Button>
          )}

          {breadcrumb.length > 0 && (
            <div className="text-xs text-muted-foreground font-mono truncate">
              /{breadcrumb.join("/")}
            </div>
          )}

          <div className="ml-auto flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNewFolder(!showNewFolder)}
              className="gap-1"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              Pasta
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="gap-1"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => void handleFileSelect(e)}
            />
          </div>
        </div>

        {showNewFolder && (
          <div className="flex gap-2">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nome da pasta"
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleCreateFolder()
                if (e.key === "Escape") setShowNewFolder(false)
              }}
              autoFocus
            />
            <Button size="sm" onClick={() => void handleCreateFolder()}>
              Criar
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowNewFolder(false)}>
              Cancelar
            </Button>
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto border rounded-md">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Carregando…
            </div>
          ) : items.length === 0 && uploads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <Paperclip className="h-8 w-8 opacity-30" />
              <p className="text-sm">Nenhum anexo</p>
              <p className="text-xs">Arraste arquivos ou use o botão Upload</p>
            </div>
          ) : (
            <ul className="divide-y">
              {uploads.map((u) => (
                <li
                  key={`upload-${u.fileName}`}
                  className="flex items-center gap-3 px-3 py-2.5"
                >
                  <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                  <span className="text-sm truncate flex-1">{u.fileName}</span>
                  <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
                    {u.progress}%
                  </span>
                  <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-200"
                      style={{ width: `${u.progress}%` }}
                    />
                  </div>
                </li>
              ))}

              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 group"
                >
                  {fileIcon(item.contentType, item.folder)}

                  {item.folder ? (
                    <button
                      onClick={() => navigateInto(item)}
                      className="text-sm truncate flex-1 text-left hover:underline font-medium"
                    >
                      {item.displayName}
                    </button>
                  ) : (
                    <span className="text-sm truncate flex-1">{item.displayName}</span>
                  )}

                  {!item.folder && (
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                      {formatBytes(item.sizeBytes)}
                    </span>
                  )}

                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {!item.folder && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Baixar"
                        onClick={() => void handleDownload(item)}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      title="Remover"
                      disabled={deleting === item.id}
                      onClick={() => void handleDelete(item)}
                    >
                      {deleting === item.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
