import { useLayoutEffect, useState, type RefObject } from "react"

/** Largura útil para quebra de linha (clientWidth menos padding horizontal). */
export function useTextareaContentWidth(
  textareaRef: RefObject<HTMLTextAreaElement | null>
): number {
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const el = textareaRef.current
    if (!el) return

    const measure = () => {
      const style = getComputedStyle(el)
      const pl = parseFloat(style.paddingLeft) || 0
      const pr = parseFloat(style.paddingRight) || 0
      setWidth(Math.max(0, el.clientWidth - pl - pr))
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener("resize", measure)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [textareaRef])

  return width
}
