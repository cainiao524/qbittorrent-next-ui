import * as React from "react"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { I18nProvider } from "@/lib/i18n-context"
import { Dialog, DialogContent, DialogTitle } from "./dialog"

function DialogHarness() {
  const [open, setOpen] = React.useState(true)
  return (
    <I18nProvider>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Motion test</DialogTitle>
          <button type="button" onClick={() => setOpen(false)}>Close test dialog</button>
        </DialogContent>
      </Dialog>
    </I18nProvider>
  )
}

describe("Dialog exit motion", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  test("keeps content mounted until the closing animation finishes", async () => {
    render(<DialogHarness />)
    fireEvent.click(screen.getByRole("button", { name: "Close test dialog" }))

    await act(async () => vi.advanceTimersByTimeAsync(199))
    expect(screen.getByRole("dialog")).toHaveAttribute("data-closing", "true")

    await act(async () => vi.advanceTimersByTimeAsync(1))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})
