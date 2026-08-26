"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n-context"

const DialogMotionContext = React.createContext(false)

type DialogProps = React.ComponentProps<typeof DialogPrimitive.Root> & {
  onCloseComplete?: () => void
}

function Dialog({ open, defaultOpen, onOpenChange, onCloseComplete, ...props }: DialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen ?? false)
  const requestedOpen = open ?? uncontrolledOpen
  const [renderedOpen, setRenderedOpen] = React.useState(requestedOpen)
  const [closing, setClosing] = React.useState(false)

  React.useEffect(() => {
    let exitTimer: ReturnType<typeof setTimeout> | undefined
    const stateTimer = setTimeout(() => {
      if (requestedOpen) {
        setRenderedOpen(true)
        setClosing(false)
      } else if (renderedOpen) {
        setClosing(true)
        exitTimer = setTimeout(() => {
          setRenderedOpen(false)
          setClosing(false)
          onCloseComplete?.()
        }, 200)
      }
    }, 0)

    return () => {
      clearTimeout(stateTimer)
      if (exitTimer) clearTimeout(exitTimer)
    }
  }, [onCloseComplete, renderedOpen, requestedOpen])

  const handleOpenChange = (next: boolean) => {
    if (open === undefined) setUncontrolledOpen(next)
    setClosing(!next)
    onOpenChange?.(next)
  }

  return (
    <DialogMotionContext.Provider value={closing}>
      <DialogPrimitive.Root data-slot="dialog" open={renderedOpen} onOpenChange={handleOpenChange} {...props} />
    </DialogMotionContext.Provider>
  )
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  const closing = React.useContext(DialogMotionContext)
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      data-closing={closing}
      className={cn(
        "fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[closing=false]:animate-in data-[closing=false]:fade-in-0 data-[closing=true]:animate-out data-[closing=true]:fade-out-0 duration-200 motion-reduce:animate-none",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  const { t } = useI18n()
  const closing = React.useContext(DialogMotionContext)
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        data-closing={closing}
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-2xl border bg-background p-6 shadow-2xl sm:max-w-[480px] data-[closing=false]:animate-in data-[closing=false]:fade-in-0 data-[closing=false]:zoom-in-95 data-[closing=true]:animate-out data-[closing=true]:fade-out-0 data-[closing=true]:zoom-out-95 duration-200 motion-reduce:animate-none",
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className="absolute top-4 right-4 rounded-full opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-state=open:bg-accent data-state=open:text-muted-foreground"
          asChild
        >
          <div className="p-1 hover:bg-muted rounded-full cursor-pointer">
            <X className="h-4 w-4" />
            <span className="sr-only">{t("ui.close")}</span>
          </div>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1.5 p-0", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2",
        className
      )}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-xl font-black leading-none tracking-tight", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
