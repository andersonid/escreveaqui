import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import PasswordInput from "@/components/PasswordInput"
import AdminNoteEditDialog from "@/components/AdminNoteEditDialog"
import AdminChangePasswordDialog from "@/components/AdminChangePasswordDialog"
import AdminNotesTable from "@/components/AdminNotesTable"
import type { AdminNote } from "@/interface/admin"
import { adminService, adminSession } from "@/services/adminService"

export default function Admin() {
  const [loggedIn, setLoggedIn] = useState(adminSession.isLoggedIn())
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loginLoading, setLoginLoading] = useState(false)

  const [notes, setNotes] = useState<AdminNote[]>([])
  const [loadingNotes, setLoadingNotes] = useState(false)
  const [listError, setListError] = useState<string | null>(null)

  const [editNote, setEditNote] = useState<AdminNote | null>(null)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)

  const loadNotes = useCallback(async () => {
    setLoadingNotes(true)
    setListError(null)
    try {
      const data = await adminService.listNotes()
      setNotes(data)
    } catch (err) {
      setListError(adminService.getErrorMessage(err))
      if (isUnauthorized(err)) {
        handleLogout()
      }
    } finally {
      setLoadingNotes(false)
    }
  }, [])

  useEffect(() => {
    if (loggedIn) {
      void loadNotes()
    }
  }, [loggedIn, loadNotes])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError(null)
    try {
      await adminService.login(username.trim(), password)
      setLoggedIn(true)
      setPassword("")
    } catch (err) {
      setLoginError(adminService.getErrorMessage(err))
    } finally {
      setLoginLoading(false)
    }
  }

  const handleLogout = () => {
    adminService.logout()
    setLoggedIn(false)
    setNotes([])
  }

  const handleDelete = async (note: AdminNote) => {
    const ok = window.confirm(
      `Apagar a nota "${note.slug}"? Esta ação não pode ser desfeita.`
    )
    if (!ok) return
    try {
      await adminService.deleteNote(note.slug)
      await loadNotes()
    } catch (err) {
      window.alert(adminService.getErrorMessage(err))
      if (isUnauthorized(err)) handleLogout()
    }
  }

  if (!loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm space-y-4 border rounded-lg p-6 shadow-sm bg-card"
        >
          <h1 className="font-display text-2xl font-bold">Admin — escreveaqui</h1>
          <p className="text-sm text-muted-foreground">Acesso restrito</p>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="admin-user">
              Usuário
            </label>
            <Input
              id="admin-user"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="admin-pass">
              Senha
            </label>
            <PasswordInput
              id="admin-pass"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
            />
          </div>
          {loginError && (
            <p className="text-sm text-destructive" role="alert">
              {loginError}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={loginLoading}>
            {loginLoading ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold">Painel admin</h1>
          <p className="text-sm text-muted-foreground">
            Olá, {adminSession.getUsername() ?? "admin"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadNotes()} disabled={loadingNotes}>
            Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPasswordDialogOpen(true)}>
            Alterar minha senha
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Sair
          </Button>
          <Button variant="link" size="sm" asChild>
            <Link to="/">Site</Link>
          </Button>
        </div>
      </header>

      <main className="p-4 max-w-[100vw]">
        {listError && (
          <p className="text-sm text-destructive mb-4" role="alert">
            {listError}
          </p>
        )}
        <AdminNotesTable
          notes={notes}
          loading={loadingNotes}
          onEdit={setEditNote}
          onDelete={(note) => void handleDelete(note)}
        />
      </main>

      <AdminNoteEditDialog
        note={editNote}
        open={editNote != null}
        onClose={() => setEditNote(null)}
        onSave={async (payload) => {
          if (!editNote) return
          await adminService.updateNote(editNote.slug, payload)
          await loadNotes()
        }}
      />

      <AdminChangePasswordDialog
        open={passwordDialogOpen}
        onClose={() => setPasswordDialogOpen(false)}
        onSave={async (current, next) => {
          await adminService.changePassword(current, next)
          handleLogout()
        }}
      />
    </div>
  )
}

function isUnauthorized(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "response" in err &&
    (err as { response?: { status?: number } }).response?.status === 401
  )
}
