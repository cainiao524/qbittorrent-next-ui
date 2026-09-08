import { useRef } from "react"
import { render } from "@testing-library/react"
import { expect, test, vi } from "vitest"
import { useListMotion } from "./use-list-motion"

test("排序播放位置过渡，同序数据更新不打断动画，卸载释放动画", () => {
  const cancel = vi.fn()
  const animate = vi.fn((_frames: Keyframe[] | PropertyIndexedKeyframes | null, _options?: number | KeyframeAnimationOptions) => {
    void _frames; void _options
    return { cancel } as unknown as Animation
  })
  vi.stubGlobal("Animation", class {})
  const original = HTMLElement.prototype.animate
  HTMLElement.prototype.animate = animate
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const top = Array.from(this.parentElement?.children ?? []).indexOf(this) * 40
    return { x: 0, y: top, left: 0, top, right: 100, bottom: top + 40, width: 100, height: 40, toJSON() {} }
  })
  function List({ ids }: { ids: string[] }) {
    const ref = useRef<HTMLDivElement>(null)
    useListMotion(ref, true)
    return <div ref={ref}>{ids.map(id => <div key={id} data-motion-id={id}>{id}</div>)}</div>
  }
  try {
    const { rerender, unmount } = render(<List ids={["a", "b"]} />)
    expect(animate).not.toHaveBeenCalled()
    rerender(<List ids={["b", "a"]} />)
    expect(animate).toHaveBeenCalledTimes(2)
    expect(animate.mock.calls[0][0]).toEqual([{ translate: "0px 40px" }, { translate: "0px 0px" }])
    rerender(<List ids={["b", "a"]} />)
    expect(cancel).not.toHaveBeenCalled()
    unmount()
    expect(cancel).toHaveBeenCalledTimes(2)
  } finally {
    HTMLElement.prototype.animate = original
    vi.unstubAllGlobals()
  }
})
