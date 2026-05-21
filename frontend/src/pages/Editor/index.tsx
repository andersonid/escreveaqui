import { useParams } from "react-router-dom"
import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { Lock } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import EditorLineGutter from "@/components/EditorLineGutter"
import { notaService } from "@/services/notaService"
import NoteSettings, { ttlMinutesFromParts, type NoteSettingsState } from "@/components/NoteSettings"
import AccessDialog from "@/components/AccessDialog"
import ExpiredNoteDialog from "@/components/ExpiredNoteDialog"
import type { Nota } from "@/interface/nota"
import debounce from "lodash.debounce"
import type { DebouncedFunc } from "lodash"

const CARET_COLORS = ["#c9190b", "#ffdf00", "#002776"]
const INACTIVITY_TIMEOUT = 2000
const AUTO_SAVE_DELAY = 1000

export default function Editor() {
  const { key } = useParams<{ key: string }>()
  const slug = key?.trim() ?? ""

  const [text, setText] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [caretIndex, setCaretIndex] = useState(0)
  const [noteMeta, setNoteMeta] = useState<Pick<Nota, "ttlMinutes" | "expiresAt" | "isProtected">>({
    ttlMinutes: null,
    expiresAt: null,
    isProtected: false,
  })
  const [accessToken, setAccessToken] = useState<string | undefined>()
  const [needsAuth, setNeedsAuth] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [readOnly, setReadOnly] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [noteExpired, setNoteExpired] = useState(false)
  const [allowNewOnSlug, setAllowNewOnSlug] = useState(false)

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const settingsRef = useRef({ ttlMinutes: null as number | null, accessToken: undefined as string | undefined })
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const gutterRef = useRef<HTMLDivElement>(null)

  const syncGutterScroll = useCallback(() => {
    const ta = textareaRef.current
    const gutter = gutterRef.current
    if (ta && gutter) {
      gutter.scrollTop = ta.scrollTop
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setCaretIndex((prev) => (prev + 1) % CARET_COLORS.length)
    }, 800)
    return () => clearInterval(interval)
  }, [])

  const loadNote = useCallback(
    async (token?: string) => {
      if (!slug) return
      try {
        const nota = await notaService.getBySlug(slug, token)
        setNoteMeta({
          ttlMinutes: nota.ttlMinutes,
          expiresAt: nota.expiresAt,
          isProtected: nota.isProtected,
        })
        settingsRef.current.ttlMinutes = nota.ttlMinutes

        if (nota.expired && !allowNewOnSlug) {
          setNoteExpired(true)
          setText("")
          setNeedsAuth(false)
          setReadOnly(true)
          setLoaded(true)
          return
        }

        setNoteExpired(false)

        if (nota.isProtected && nota.content === null) {
          setText("")
          setNeedsAuth(true)
          setReadOnly(true)
          setLoaded(true)
          return
        }

        setNeedsAuth(false)
        setAuthError(null)
        setReadOnly(false)
        if (nota.content !== null && nota.content !== undefined) {
          setText(nota.content)
        }
        setLoaded(true)
      } catch (err) {
        if (notaService.isForbidden(err)) {
          setText("")
          setAuthError("Senha incorreta")
          setNeedsAuth(true)
          setReadOnly(true)
          setAccessToken(undefined)
          setLoaded(true)
        } else {
          console.error("Erro ao carregar nota:", err)
        }
      }
    },
    [slug, allowNewOnSlug]
  )

  useEffect(() => {
    if (!slug) return
    sessionStorage.removeItem(`escreveaqui:token:${slug}`)
    setAccessToken(undefined)
    setAllowNewOnSlug(false)
    setNoteExpired(false)
    setLoaded(false)
    void loadNote()
  }, [slug, loadNote])

  useEffect(() => {
    if (!slug || !loaded || needsAuth || isTyping || (noteExpired && !allowNewOnSlug)) return

    const interval = setInterval(() => {
      void loadNote(accessToken)
    }, 2000)
    return () => clearInterval(interval)
  }, [slug, loaded, needsAuth, isTyping, noteExpired, allowNewOnSlug, accessToken, loadNote])

  const saveToBackend: DebouncedFunc<(content: string) => void> = useMemo(
    () =>
      debounce((content: string) => {
        if (!slug || readOnly) return
        notaService
          .upsert(slug, content, { token: accessToken })
          .catch((err) => console.error("Falha ao salvar no banco:", err))
      }, AUTO_SAVE_DELAY),
    [slug, readOnly, accessToken]
  )

  useEffect(() => {
    return () => {
      saveToBackend.cancel()
    }
  }, [saveToBackend])

  const handleCreateNewOnSlug = () => {
    setAllowNewOnSlug(true)
    setNoteExpired(false)
    setReadOnly(false)
    setText("")
    settingsRef.current.ttlMinutes = null
    setNoteMeta({ ttlMinutes: null, expiresAt: null, isProtected: false })
    window.setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (readOnly) return
    const newText = e.target.value
    setText(newText)
    setIsTyping(true)

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
    }, INACTIVITY_TIMEOUT)

    saveToBackend(newText)
  }

  const handleAuthSubmit = async (token: string) => {
    if (!slug) return
    setAuthLoading(true)
    setAuthError(null)
    setText("")
    try {
      const nota = await notaService.getBySlug(slug, token)
      if (nota.expired) {
        setNoteExpired(true)
        setAllowNewOnSlug(false)
        setText("")
        setReadOnly(true)
        setNeedsAuth(false)
        setLoaded(true)
        return
      }
      if (nota.isProtected && nota.content === null) {
        setAuthError("Senha incorreta")
        setNeedsAuth(true)
        setReadOnly(true)
        return
      }
      setNoteExpired(false)
      setAccessToken(token)
      setNoteMeta({
        ttlMinutes: nota.ttlMinutes,
        expiresAt: nota.expiresAt,
        isProtected: nota.isProtected,
      })
      settingsRef.current.ttlMinutes = nota.ttlMinutes
      setNeedsAuth(false)
      setReadOnly(false)
      setText(nota.content ?? "")
      setLoaded(true)
    } catch (err) {
      setText("")
      setAccessToken(undefined)
      if (notaService.isForbidden(err)) {
        setAuthError("Senha incorreta")
      } else {
        setAuthError(notaService.getErrorMessage(err))
      }
      setNeedsAuth(true)
      setReadOnly(true)
    } finally {
      setAuthLoading(false)
    }
  }

  const handleSettingsApply = async (settings: NoteSettingsState) => {
    if (!slug) return

    const ttlMinutes = ttlMinutesFromParts(
      settings.expirationEnabled,
      settings.ttlValue,
      settings.ttlUnit
    )
    settingsRef.current.ttlMinutes = ttlMinutes

    let accessTokenPayload: string | null | undefined = undefined
    if (!settings.protectionEnabled) {
      if (noteMeta.isProtected) {
        accessTokenPayload = ""
      }
    } else if (settings.accessPassword.trim()) {
      accessTokenPayload = settings.accessPassword.trim()
    }

    const authToken =
      accessTokenPayload && accessTokenPayload.length > 0
        ? accessTokenPayload
        : accessToken

    if (noteMeta.isProtected && !authToken) {
      throw new Error("Esta nota está protegida. Informe a senha atual para alterar as configurações.")
    }

    try {
      await notaService.upsert(slug, text, {
        configureExpiration: true,
        ttlMinutes,
        accessToken: accessTokenPayload,
        token: authToken,
      })
    } catch (err) {
      throw new Error(notaService.getErrorMessage(err))
    }

    if (accessTokenPayload && accessTokenPayload.length > 0) {
      setAccessToken(accessTokenPayload)
    } else if (accessTokenPayload === "") {
      setAccessToken(undefined)
    }

    await loadNote(
      accessTokenPayload && accessTokenPayload.length > 0
        ? accessTokenPayload
        : accessToken
    )
  }

  useEffect(() => {
    const titleText = slug.substring(0, 10)
    document.title = titleText ? `${titleText} | escreveaqui` : "escreveaqui"
  }, [slug])

  if (!slug) {
    return null
  }

  return (
    <div className="w-full h-screen bg-background relative">
      <NoteSettings
        slug={slug}
        initialTtlMinutes={noteMeta.ttlMinutes}
        initialProtected={noteMeta.isProtected}
        expiresAt={noteMeta.expiresAt}
        disabled={noteExpired && !allowNewOnSlug}
        onApply={handleSettingsApply}
      />

      {noteMeta.isProtected && !needsAuth && !noteExpired && (
        <div
          className="fixed top-3 right-3 z-20 flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 shadow-sm backdrop-blur dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
          role="status"
          aria-label="Nota protegida por senha"
        >
          <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Protegida
        </div>
      )}

      <div className="absolute inset-0 flex flex-col pt-14">
        <div className="flex min-h-0 flex-1">
          {!needsAuth && !(noteExpired && !allowNewOnSlug) && (
            <div
              ref={gutterRef}
              className="shrink-0 overflow-hidden border-r border-border/30 bg-muted/20 py-5 pl-2.5 pr-1.5 text-right font-sans text-[11px] tabular-nums text-muted-foreground/70 select-none [scrollbar-width:none]"
            >
              <EditorLineGutter text={text} />
            </div>
          )}
          <Textarea
            ref={textareaRef}
            value={needsAuth ? "" : text}
            onChange={handleChange}
            onScroll={syncGutterScroll}
            placeholder={
              needsAuth
                ? "Informe a senha para editar esta nota"
                : noteExpired && !allowNewOnSlug
                  ? "Esta nota expirou"
                  : `Escrevendo em: ${slug}`
            }
            readOnly={readOnly || needsAuth || (noteExpired && !allowNewOnSlug)}
            autoFocus={!needsAuth && !(noteExpired && !allowNewOnSlug)}
            className="min-h-0 flex-1 h-full resize-none border-none rounded-none font-sans text-base leading-6 py-5 pl-3 pr-5 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/40 [scrollbar-width:thin] [scrollbar-color:hsl(var(--border))_transparent]"
            style={{ caretColor: CARET_COLORS[caretIndex] }}
          />
        </div>
      </div>

      <AccessDialog
        slug={slug}
        open={needsAuth}
        error={authError}
        loading={authLoading}
        onSubmit={handleAuthSubmit}
      />

      <ExpiredNoteDialog
        slug={slug}
        open={noteExpired && !allowNewOnSlug}
        onCreateNew={handleCreateNewOnSlug}
      />
    </div>
  )
}
