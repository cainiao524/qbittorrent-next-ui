import { useLayoutEffect, useRef, type RefObject } from "react"

type Position = { x: number; y: number }
type Motion = { element: HTMLElement; animation: Animation }

// offset 坐标不含入场 transform 或排序 translate，也不受页面滚动影响。
function layoutPosition(element: HTMLElement): Position {
  let x = 0
  let y = 0
  let current: HTMLElement | null = element
  while (current) {
    x += current.offsetLeft
    y += current.offsetTop
    current = current.offsetParent as HTMLElement | null
  }
  return { x, y }
}

export function useListMotion(container: RefObject<HTMLElement | null>, enabled: boolean) {
  const positions = useRef(new Map<string, Position>())
  const animations = useRef(new Map<string, Motion>())
  const order = useRef("")

  useLayoutEffect(() => {
    const elements = Array.from(container.current?.querySelectorAll<HTMLElement>("[data-motion-id]") ?? [])
    const key = JSON.stringify(elements.map(element => element.dataset.motionId))
    const reordered = key !== order.current
    order.current = key
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const next = new Map<string, Position>()
    const moves: Array<{ element: HTMLElement; id: string; x: number; y: number }> = []
    const origin = container.current ? layoutPosition(container.current) : { x: 0, y: 0 }

    // 集中读取布局和上一段动画的当前偏移，再统一取消/写入，避免读写交错。
    for (const element of elements) {
      const id = element.dataset.motionId!
      const absolute = layoutPosition(element)
      const position = { x: absolute.x - origin.x, y: absolute.y - origin.y }
      const previous = positions.current.get(id)
      next.set(id, position)
      if (!reordered || !previous || !enabled || reduced) continue
      const motion = animations.current.get(id)
      const translate = motion?.element === element ? getComputedStyle(element).translate.split(/\s+/) : []
      moves.push({ element, id,
        x: previous.x - position.x + (parseFloat(translate[0]) || 0),
        y: previous.y - position.y + (parseFloat(translate[1]) || 0),
      })
    }
    positions.current = next
    for (const [id, motion] of animations.current) {
      if (reordered || !enabled || reduced || !next.has(id)) {
        motion.animation.cancel()
        animations.current.delete(id)
      }
    }
    for (const { element, id, x, y } of moves) {
      if (!(x || y) || !element.animate) continue
      const animation = element.animate([
        { translate: `${x}px ${y}px` }, { translate: "0px 0px" },
      ], { duration: 180, easing: "cubic-bezier(0.2,0,0,1)" })
      animations.current.set(id, { element, animation })
      animation.onfinish = () => {
        if (animations.current.get(id)?.animation === animation) animations.current.delete(id)
      }
    }
  })

  useLayoutEffect(() => {
    const motions = animations.current
    const updateLayout = () => {
      const root = container.current
      if (!root) return
      const origin = layoutPosition(root)
      root.querySelectorAll<HTMLElement>("[data-motion-id]").forEach(element => {
        const position = layoutPosition(element)
        positions.current.set(element.dataset.motionId!, { x: position.x - origin.x, y: position.y - origin.y })
      })
    }
    const observer = new ResizeObserver(updateLayout)
    if (container.current) observer.observe(container.current)
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)")
    const onMotionPreference = () => {
      if (!reduced.matches) return
      motions.forEach(({ animation }) => animation.cancel())
      motions.clear()
    }
    reduced.addEventListener("change", onMotionPreference)
    window.addEventListener("resize", updateLayout)
    return () => {
      observer.disconnect()
      reduced.removeEventListener("change", onMotionPreference)
      window.removeEventListener("resize", updateLayout)
      motions.forEach(({ animation }) => animation.cancel())
      motions.clear()
    }
  }, [container])
}
