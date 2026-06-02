import { useEffect, useRef, useCallback } from "react"
import { EditorView, lineNumbers, drawSelection, placeholder as cmPlaceholder, keymap } from "@codemirror/view"
import { EditorState, Compartment } from "@codemirror/state"
import { indentWithTab } from "@codemirror/language"

const CARET_COLORS = ["#c9190b", "#ffdf00", "#002776"]

const escreveaquiTheme = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "16px",
    fontFamily: '"Red Hat Text", system-ui, sans-serif',
    backgroundColor: "hsl(40 14% 97%)",
    color: "hsl(0 0% 11%)",
  },
  "&.cm-focused": {
    outline: "none",
  },
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
  ".cm-line": {
    padding: "0",
  },
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
  ".cm-activeLine": {
    backgroundColor: "transparent",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "transparent",
    color: "hsl(0 0% 45%)",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: "rgba(201, 25, 11, 0.2) !important",
  },
  ".cm-cursor": {
    borderLeftWidth: "2px",
  },
  ".cm-placeholder": {
    color: "hsl(0 0% 45% / 0.4)",
    fontStyle: "normal",
  },
})

interface CodeEditorProps {
  value: string
  onChange?: (value: string) => void
  readOnly?: boolean
  placeholder?: string
  autoFocus?: boolean
}

export default function CodeEditor({
  value,
  onChange,
  readOnly = false,
  placeholder = "",
  autoFocus = false,
}: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const readOnlyComp = useRef(new Compartment())
  const editableComp = useRef(new Compartment())

  const caretIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const caretIndexRef = useRef(0)

  const createView = useCallback(() => {
    const parent = containerRef.current
    if (!parent) return

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && onChangeRef.current) {
        onChangeRef.current(update.state.doc.toString())
      }
    })

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        drawSelection(),
        cmPlaceholder(placeholder),
        EditorView.lineWrapping,
        readOnlyComp.current.of(EditorState.readOnly.of(readOnly)),
        editableComp.current.of(EditorView.editable.of(!readOnly)),
        keymap.of([indentWithTab]),
        escreveaquiTheme,
        updateListener,
      ],
    })

    const view = new EditorView({ state, parent })
    viewRef.current = view

    if (autoFocus) {
      requestAnimationFrame(() => view.focus())
    }

    caretIntervalRef.current = setInterval(() => {
      caretIndexRef.current = (caretIndexRef.current + 1) % CARET_COLORS.length
      const color = CARET_COLORS[caretIndexRef.current]
      const content = parent.querySelector(".cm-content") as HTMLElement | null
      if (content) content.style.caretColor = color
    }, 800)
  }, [])

  useEffect(() => {
    createView()
    return () => {
      viewRef.current?.destroy()
      viewRef.current = null
      if (caretIntervalRef.current) clearInterval(caretIntervalRef.current)
    }
  }, [createView])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== value) {
      const scrollTop = view.scrollDOM.scrollTop
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      })
      requestAnimationFrame(() => {
        view.scrollDOM.scrollTop = scrollTop
      })
    }
  }, [value])

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

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
    />
  )
}
