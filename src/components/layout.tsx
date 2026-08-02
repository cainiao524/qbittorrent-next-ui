import * as React from "react"
import { Navbar } from "@/components/navbar"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { I18nProvider } from "@/lib/i18n-context"
import { SearchProvider } from "@/lib/search-context"
import { AppSettingsProvider } from "@/lib/app-settings-context"
import { Toaster } from "@/components/ui/sonner"
import { GlobalTorrentDropZone } from "@/components/global-torrent-drop-zone"

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-sans antialiased min-h-screen bg-background text-foreground">
      <ThemeProvider>
      <I18nProvider>
        <SearchProvider>
          <AppSettingsProvider>
            <GlobalTorrentDropZone />
            <TooltipProvider>
              <SidebarProvider className="bg-slate-50/50">
              <AppSidebar />
              <SidebarInset className="bg-background shadow-sm border-none md:m-2 md:rounded-xl overflow-clip">
                <Navbar />
                <main className="flex-1 overflow-visible p-4 md:p-6 lg:p-8">
                  {children}
                </main>
              </SidebarInset>
            </SidebarProvider>
          </TooltipProvider>
          </AppSettingsProvider>
        </SearchProvider>
      </I18nProvider>
      <Toaster position="top-center" />
    </ThemeProvider>
    </div>
  )
}
