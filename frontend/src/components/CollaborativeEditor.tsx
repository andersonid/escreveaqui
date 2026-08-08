import { useEffect, useRef, useCallback } from "react"
import * as Y from "yjs"
import { WebsocketProvider } from "y-websocket"
import { yCollab } from "y-codemirror.next"
import {
  EditorView,
  lineNumbers,
  drawSelection,
  placeholder as cmPlaceholder,
  keymap,
} from "@codemirror/view"
import { EditorState, Compartment } from "@codemirror/state"
import {
  defaultKeymap,
  indentWithTab,
  history,
  historyKeymap,
} from "@codemirror/commands"

const USER_COLORS = [
  { color: "#30bced", light: "#30bced33" },
  { color: "#6eeb83", light: "#6eeb8333" },
  { color: "#ffbc42", light: "#ffbc4233" },
  { color: "#e84855", light: "#e8485533" },
  { color: "#8b5cf6", light: "#8b5cf633" },
  { color: "#ec4899", light: "#ec489933" },
  { color: "#14b8a6", light: "#14b8a633" },
  { color: "#f97316", light: "#f9731633" },
]

const escreveaquiTheme = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "16px",
    fontFamily: '"Red Hat Text", system-ui, sans-serif',
    backgroundColor: "hsl(40 14% 97%)",
    color: "hsl(0 0% 11%)",
  },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": {
    overflow: "auto",
    lineHeight: "1.5",
    fontFamily: "inherit",
    scrollbarWidth: "thin",
    scrollbarColor: "hsl(0 0% 89%) transparent",
  },
  ".cm-content": {
    padding: "20px 20px 20px 12px",
    caretColor: "#c9190b",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    overflowWrap: "anywhere",
  },
  ".cm-line": { padding: "0" },
  ".cm-gutters": {
    backgroundColor: "hsl(0 0% 96% / 0.2)",
    borderRight: "1px solid hsl(0 0% 89% / 0.3)",
    color: "hsl(0 0% 45% / 0.7)",
    fontFamily: '"Red Hat Text", system-ui, sans-serif',
    fontSize: "11px",
    paddingLeft: "10px",
    paddingRight: "6px",
    userSelect: "none",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    paddingTop: "0",
    paddingBottom: "0",
    minWidth: "2ch",
    textAlign: "right",
  },
  ".cm-activeLine": { backgroundColor: "transparent" },
  ".cm-activeLineGutter": {
    backgroundColor: "transparent",
    color: "hsl(0 0% 45%)",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: "rgba(201, 25, 11, 0.2) !important",
  },
  ".cm-cursor": { borderLeftWidth: "2px" },
  ".cm-placeholder": {
    color: "hsl(0 0% 45% / 0.4)",
    fontStyle: "normal",
  },
  ".cm-ySelectionInfo": {
    fontSize: "11px",
    fontFamily: '"Red Hat Text", system-ui, sans-serif',
    padding: "1px 4px",
    borderRadius: "3px",
    opacity: "0.9",
    transitionDelay: "2s",
    transitionProperty: "opacity",
  },
})

const WS_BASE_URL =
  import.meta.env.VITE_YWS_URL ??
  `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws`

interface CollaborativeEditorProps {
  slug: string
  token?: string
  readOnly?: boolean
  placeholder?: string
  autoFocus?: boolean
  onFallback: () => void
  onContentChange?: (content: string) => void
  onPresenceChange?: (count: number) => void
}

export default function CollaborativeEditor({
  slug,
  token,
  readOnly = false,
  placeholder = "",
  autoFocus = false,
  onFallback,
  onContentChange,
  onPresenceChange,
}: CollaborativeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const providerRef = useRef<WebsocketProvider | null>(null)
  const ydocRef = useRef<Y.Doc | null>(null)
  const onFallbackRef = useRef(onFallback)
  onFallbackRef.current = onFallback
  const onContentChangeRef = useRef(onContentChange)
  onContentChangeRef.current = onContentChange
  const onPresenceChangeRef = useRef(onPresenceChange)
  onPresenceChangeRef.current = onPresenceChange

  const readOnlyComp = useRef(new Compartment())
  const editableComp = useRef(new Compartment())

  const setup = useCallback(() => {
    const parent = containerRef.current
    if (!parent) return

    const ydoc = new Y.Doc()
    ydocRef.current = ydoc
    const ytext = ydoc.getText("content")

    const wsUrl = token ? `${WS_BASE_URL}/${slug}?token=${encodeURIComponent(token)}` : `${WS_BASE_URL}/${slug}`
    const parsedUrl = new URL(wsUrl)
    const wsBase = `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname.split('/').slice(0, -1).join('/')}`
    const roomName = parsedUrl.pathname.split('/').pop() || slug

    const provider = new WebsocketProvider(
      wsBase,
      roomName,
      ydoc,
      {
        connect: true,
        params: token ? { token } : {},
      }
    )
    providerRef.current = provider

    const userColor = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)]
    provider.awareness.setLocalStateField("user", {
      name: "Autor " + Math.floor(Math.random() * 100),
      color: userColor.color,
      colorLight: userColor.light,
    })

    let failCount = 0
    const MAX_FAILS = 3

    provider.on("status", ({ status }: { status: string }) => {
      if (status === "disconnected") {
        failCount++
        if (failCount >= MAX_FAILS) {
          onFallbackRef.current()
        }
      } else if (status === "connected") {
        failCount = 0
      }
    })

    const updatePresence = () => {
      const states = provider.awareness.getStates()
      const count = Array.from(states.values()).filter(
        (s) => s.user != null
      ).length
      onPresenceChangeRef.current?.(count)
    }
    provider.awareness.on("change", updatePresence)
    updatePresence()

    ytext.observe(() => {
      onContentChangeRef.current?.(ytext.toString())
    })

    const undoManager = new Y.UndoManager(ytext)

    const state = EditorState.create({
      doc: ytext.toString(),
      extensions: [
        lineNumbers(),
        drawSelection(),
        cmPlaceholder(placeholder),
        EditorView.lineWrapping,
        readOnlyComp.current.of(EditorState.readOnly.of(readOnly)),
        editableComp.current.of(EditorView.editable.of(!readOnly)),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        yCollab(ytext, provider.awareness, { undoManager }),
        escreveaquiTheme,
      ],
    })

    const view = new EditorView({ state, parent })
    viewRef.current = view

    if (autoFocus) {
      requestAnimationFrame(() => view.focus())
    }
  }, [slug, token, readOnly, placeholder, autoFocus])

  useEffect(() => {
    setup()
    return () => {
      viewRef.current?.destroy()
      viewRef.current = null
      providerRef.current?.destroy()
      providerRef.current = null
      ydocRef.current?.destroy()
      ydocRef.current = null
    }
  }, [setup])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: [
        readOnlyComp.current.reconfigure(EditorState.readOnly.of(readOnly)),
        editableComp.current.reconfigure(EditorView.editable.of(!readOnly)),
      ],
    })
  }, [readOnly])

  return <div ref={containerRef} className="h-full w-full" />
}
