import { useLayoutEffect, useRef, type RefObject } from "react"

// 只测量已渲染的行；使用独立 translate 属性，不覆盖现有入场 transform 动画。
export function useListMotion(container: RefObject<HTMLElement | null>, enabled: boolean) {
  const positions = useRef(new Map<string, { x: number; y: number }>())
  const animations = useRef<Animation[]>([])
  const order = useRef<string>("")
  useLayoutEffect(() => {
    const elements = Array.from(container.current?.querySelectorAll<HTMLElement>("[data-motion-id]") ?? [])
    const key = JSON.stringify([enabled, ...elements.map(element => element.dataset.motionId)])
    if (key === order.current) return
    order.current = key
    animations.current.forEach(animation => animation.cancel())
    animations.current = []
    const next = new Map<string, { x: number; y: number }>()
    const moves: Array<{ element: HTMLElement; x: number; y: number }> = []
    elements.forEach(element => {
      const id = element.dataset.motionId!
      const rect = element.getBoundingClientRect()
      const position = { x: rect.left + window.scrollX, y: rect.top + window.scrollY }
      const previous = positions.current.get(id)
      next.set(id, position)
      if (previous && enabled) moves.push({ element, x: previous.x - position.x, y: previous.y - position.y })
    })
    positions.current = next
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    for (const { element, x, y } of moves) {
      if ((x || y) && element.animate) animations.current.push(element.animate([
        { translate: `${x}px ${y}px` }, { translate: "0px 0px" },
      ], { duration: 180, easing: "cubic-bezier(0.2,0,0,1)" }))
    }
  })
  useLayoutEffect(() => () => animations.current.forEach(animation => animation.cancel()), [])
}
