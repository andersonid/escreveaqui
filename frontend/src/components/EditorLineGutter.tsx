import { useLayoutEffect, useMemo, useRef, useState } from "react"

/** Deve coincidir com leading-6 do textarea (24px). */
export const EDITOR_LINE_HEIGHT_PX = 24
const LINE_CLASS = "h-6 leading-6"

/** Classes de tipografia alinhadas ao Textarea do editor (text-base leading-6). */
export const EDITOR_WRAP_CLASS =
  "font-sans text-base leading-6 whitespace-pre-wrap break-words [overflow-wrap:anywhere]"

interface EditorLineGutterProps {
  text: string
  /** Largura interna do textarea; 0 até a primeira medição. */
  contentWidth: number
  className?: string
}

export function splitLogicalLines(text: string): string[] {
  if (text.length === 0) return [""]
  return text.split("\n")
}

export function lineCountFromText(text: string): number {
  return splitLogicalLines(text).length
}

export default function EditorLineGutter({
  text,
  contentWidth,
  className,
}: EditorLineGutterProps) {
  const lines = useMemo(() => splitLogicalLines(text), [text])
  const measureRefs = useRef<(HTMLDivElement | null)[]>([])
  const [lineHeights, setLineHeights] = useState<number[]>(() =>
    lines.map(() => EDITOR_LINE_HEIGHT_PX)
  )

  useLayoutEffect(() => {
    if (contentWidth <= 0) {
      setLineHeights(lines.map(() => EDITOR_LINE_HEIGHT_PX))
      return
    }
    setLineHeights(
      lines.map((_, i) => measureRefs.current[i]?.offsetHeight ?? EDITOR_LINE_HEIGHT_PX)
    )
  }, [text, lines, contentWidth])

  const lineCount = lines.length
  const widthCh = Math.max(2, String(lineCount).length)

  return (
    <>
      {/* Espelho invisível: mesma largura e wrap do textarea para altura por linha lógica. */}
      {contentWidth > 0 && (
        <div
          aria-hidden
          className="pointer-events-none invisible absolute left-0 top-0 -z-50 overflow-hidden"
          style={{ width: contentWidth }}
        >
          {lines.map((line, i) => (
            <div
              key={i}
              ref={(el) => {
                measureRefs.current[i] = el
              }}
              className={EDITOR_WRAP_CLASS}
            >
              {line.length === 0 ? "\u00a0" : line}
            </div>
          ))}
        </div>
      )}

      <div className={className} style={{ minWidth: `${widthCh + 1}ch` }} aria-hidden>
        {lines.map((_, i) => (
          <div
            key={i}
            className="pr-0.5 box-border"
            style={{ minHeight: lineHeights[i] ?? EDITOR_LINE_HEIGHT_PX }}
          >
            <div className={`${LINE_CLASS} text-right`}>{i + 1}</div>
          </div>
        ))}
      </div>
    </>
  )
}
