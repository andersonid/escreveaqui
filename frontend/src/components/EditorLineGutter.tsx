import { useMemo } from "react"

/** Deve coincidir com leading-6 do textarea (24px). */
const LINE_CLASS = "h-6 leading-6"

interface EditorLineGutterProps {
  text: string
  className?: string
}

export function lineCountFromText(text: string): number {
  if (text.length === 0) return 1
  return text.split("\n").length
}

export default function EditorLineGutter({ text, className }: EditorLineGutterProps) {
  const lineCount = useMemo(() => lineCountFromText(text), [text])
  const widthCh = Math.max(2, String(lineCount).length)

  return (
    <div className={className} style={{ minWidth: `${widthCh + 1}ch` }} aria-hidden>
      {Array.from({ length: lineCount }, (_, i) => (
        <div key={i} className={`${LINE_CLASS} pr-0.5`}>
          {i + 1}
        </div>
      ))}
    </div>
  )
}
