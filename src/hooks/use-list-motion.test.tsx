import { useRef } from "react"
import { act, render } from "@testing-library/react"
import { beforeEach, expect, test, vi } from "vitest"
import { useListMotion } from "./use-list-motion"

let rowHeight = 40
let visualOffset = 0
const cancel = vi.fn()
const animate = vi.fn((_frames: Keyframe[] | PropertyIndexedKeyframes | null, _options?: number | KeyframeAnimationOptions) => {
  void _frames; void _options
  return { cancel } as unknown as Animation
})

beforeEach(() => {
  rowHeight = 40
  visualOffset = 0
  cancel.mockClear()
  animate.mockClear()
  Object.defineProperty(HTMLElement.prototype, "animate", { configurable: true, writable: true, value: animate })
  vi.spyOn(HTMLElement.prototype, "offsetTop", "get").mockImplementation(function (this: HTMLElement) {
    return this.dataset.motionId ? Array.from(this.parentElement!.children).indexOf(this) * rowHeight : 0
  })
  vi.spyOn(window, "getComputedStyle").mockImplementation(element => ({
    translate: `0px ${element.getAttribute("data-motion-id") === "b" ? visualOffset : -visualOffset}px`,
  }) as CSSStyleDeclaration)
})

function List({ ids, enabled = true }: { ids: string[]; enabled?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useListMotion(ref, enabled)
  return <div ref={ref}>{ids.map(id => <div key={id} data-motion-id={id}>{id}</div>)}</div>
}

test("排序播放位置过渡，同序数据更新不打断动画，卸载释放动画", () => {
  const { rerender, unmount } = render(<List ids={["a", "b"]} />)
  expect(animate).not.toHaveBeenCalled()
  rerender(<List ids={["b", "a"]} />)
  expect(animate).toHaveBeenCalledTimes(2)
  expect(animate.mock.calls[0]).toEqual([
    [{ translate: "0px 40px" }, { translate: "0px 0px" }],
    { duration: 180, easing: "cubic-bezier(0.2,0,0,1)" },
  ])
  rerender(<List ids={["b", "a"]} />)
  expect(cancel).not.toHaveBeenCalled()
  unmount()
  expect(cancel).toHaveBeenCalledTimes(2)
})

test("快速连续排序从上一段动画的当前视觉位置接续", () => {
  const { rerender } = render(<List ids={["a", "b"]} />)
  rerender(<List ids={["b", "a"]} />)
  visualOffset = 15
  rerender(<List ids={["a", "b"]} />)
  expect(animate.mock.calls[2]).toEqual([
    [{ translate: "0px 25px" }, { translate: "0px 0px" }],
    { duration: 180, easing: "cubic-bezier(0.2,0,0,1)" },
  ])
  expect(cancel).toHaveBeenCalledTimes(2)
})

test("同序布局变化更新基线，不把旧行高带进下一次排序", () => {
  const { rerender } = render(<List ids={["a", "b"]} />)
  rowHeight = 70
  rerender(<List ids={["a", "b"]} />)
  expect(animate).not.toHaveBeenCalled()
  rerender(<List ids={["b", "a"]} />)
  expect(animate.mock.calls[0]?.[0]).toEqual([{ translate: "0px 70px" }, { translate: "0px 0px" }])
})

test("窗口尺寸变化无需数据刷新也会更新布局基线", () => {
  const { rerender } = render(<List ids={["a", "b"]} />)
  rowHeight = 60
  act(() => window.dispatchEvent(new Event("resize")))
  rerender(<List ids={["b", "a"]} />)
  expect(animate.mock.calls[0]?.[0]).toEqual([{ translate: "0px 60px" }, { translate: "0px 0px" }])
})

test("关闭排序动画会取消正在运行的过渡", () => {
  const { rerender } = render(<List ids={["a", "b"]} />)
  rerender(<List ids={["b", "a"]} />)
  rerender(<List ids={["b", "a"]} enabled={false} />)
  expect(cancel).toHaveBeenCalledTimes(2)
})

test("动态启用减少动态效果立即取消动画", () => {
  let changed = () => {}
  const media = { matches: false, addEventListener: vi.fn((_event, handler) => { changed = handler }), removeEventListener: vi.fn() }
  vi.spyOn(window, "matchMedia").mockReturnValue(media as unknown as MediaQueryList)
  render(<List ids={["a", "b"]} />).rerender(<List ids={["b", "a"]} />)
  media.matches = true
  act(() => changed())
  expect(cancel).toHaveBeenCalledTimes(2)
})
