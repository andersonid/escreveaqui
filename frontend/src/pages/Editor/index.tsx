import { useParams } from "react-router-dom"
import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { Lock } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { notaService } from "@/services/notaService"
import NoteSettings, { ttlMinutesFromParts, type NoteSettingsState } from "@/components/NoteSettings"
import AccessDialog from "@/components/AccessDialog"
import type { Nota } from "@/interface/nota"
import debounce from "lodash.debounce"
import type { DebouncedFunc } from "lodash"

const BR_COLORS = ["#009c3b", "#ffdf00", "#002776"]
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

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const settingsRef = useRef({ ttlMinutes: null as number | null, accessToken: undefined as string | undefined })

  useEffect(() => {
    const interval = setInterval(() => {
      setCaretIndex((prev) => (prev + 1) % BR_COLORS.length)
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
    [slug]
  )

  useEffect(() => {
    if (!slug) return
    sessionStorage.removeItem(`escreveaqui:token:${slug}`)
    setAccessToken(undefined)
    setLoaded(false)
    void loadNote()
  }, [slug, loadNote])

  useEffect(() => {
    if (!slug || !loaded || needsAuth || isTyping) return

    const interval = setInterval(() => {
      void loadNote(accessToken)
    }, 2000)
    return () => clearInterval(interval)
  }, [slug, loaded, needsAuth, isTyping, accessToken, loadNote])

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
      if (nota.isProtected && nota.content === null) {
        setAuthError("Senha incorreta")
        setNeedsAuth(true)
        setReadOnly(true)
        return
      }
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
      accessTokenPayload = ""
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
        onApply={handleSettingsApply}
      />

      {noteMeta.isProtected && !needsAuth && (
        <div className="fixed top-3 left-3 z-20 flex items-center gap-1 rounded-md border bg-background/80 px-2 py-1 text-xs text-muted-foreground backdrop-blur">
          <Lock className="h-3 w-3" />
          Protegida
        </div>
      )}

      <Textarea
        value={needsAuth ? "" : text}
        onChange={handleChange}
        placeholder={
          needsAuth
            ? "Informe a senha para editar esta nota"
            : `Escrevendo em: ${slug}`
        }
        readOnly={readOnly || needsAuth}
        autoFocus={!needsAuth}
        className="w-full h-full resize-none border-none rounded-none font-mono text-[18px] leading-6 p-5 pt-14 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/40 [scrollbar-width:thin] [scrollbar-color:hsl(var(--border))_transparent]"
        style={{ caretColor: BR_COLORS[caretIndex] }}
      />

      <AccessDialog
        slug={slug}
        open={needsAuth}
        error={authError}
        loading={authLoading}
        onSubmit={handleAuthSubmit}
      />
    </div>
  )
}
