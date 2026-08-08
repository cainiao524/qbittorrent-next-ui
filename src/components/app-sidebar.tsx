"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Activity,
  ArrowDownCircle,
  ArrowUpCircle,
  PauseCircle,
  Settings,
} from "lucide-react"

const Github = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
)

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { useLocation } from "react-router-dom"
import { useI18n } from "@/lib/i18n-context"
import { APP_CONFIG } from "@/lib/config"
import { useAppSettings, type SidebarItemId } from "@/lib/app-settings-context"

const data = {
  navMain: [
    {
      title: "All Torrents",
      url: "/",
      icon: LayoutDashboard,
      id: "all" as SidebarItemId,
    },
    {
      title: "Active",
      url: "/active",
      icon: Activity,
      id: "active" as SidebarItemId,
    },
    {
      title: "Downloading",
      url: "/downloading",
      icon: ArrowDownCircle,
      id: "downloading" as SidebarItemId,
    },
    {
      title: "Seeding",
      url: "/seeding",
      icon: ArrowUpCircle,
      id: "seeding" as SidebarItemId,
    },
    {
      title: "Paused",
      url: "/paused",
      icon: PauseCircle,
      id: "paused" as SidebarItemId,
    },
  ],
  secondary: [
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
      id: "settings" as SidebarItemId,
    },
  ],
}

import { Link } from "react-router-dom"

const SIDEBAR_ROW_HEIGHT = 48
const SIDEBAR_ROW_GAP = 4
const SIDEBAR_ROW_PITCH = SIDEBAR_ROW_HEIGHT + SIDEBAR_ROW_GAP

function SidebarActiveIndicator({ index }: { index: number }) {
  return (
    <div
      aria-hidden
      data-sidebar="active-indicator"
        className="pointer-events-none absolute top-1 right-3 left-3 z-0 h-10 rounded-lg bg-primary"
      style={{
        transform: `translateY(${Math.max(index, 0) * SIDEBAR_ROW_PITCH}px)`,
        opacity: index >= 0 ? 1 : 0,
      }}
    />
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { pathname } = useLocation()
  const { t } = useI18n()
  const { sidebarItems } = useAppSettings()

  const getTitle = (title: string) => {
    const keyMap: Record<string, string> = {
      "All Torrents": "common.all_torrents",
      "Active": "common.active",
      "Downloading": "common.downloading",
      "Seeding": "common.seeding",
      "Paused": "common.paused",
      "Settings": "common.settings"
    }
    return t(keyMap[title] || title)
  }

  const visibleMain = data.navMain.filter((item) => sidebarItems.includes(item.id))
  const activeMainIndex = visibleMain.findIndex((item) => pathname === item.url)
  const visibleSecondary = data.secondary.filter((item) => sidebarItems.includes(item.id))
  const activeSecondaryIndex = visibleSecondary.findIndex((item) => pathname === item.url)

  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      <SidebarHeader className="flex h-16 items-center border-b font-sans flex-row px-2 transition-[padding] duration-[var(--sidebar-motion-duration)] ease-[var(--sidebar-motion-ease)] group-data-[collapsible=icon]:px-0">
        <div className="flex min-w-0 flex-1 items-center transition-[padding] duration-[var(--sidebar-motion-duration)] ease-[var(--sidebar-motion-ease)] group-data-[collapsible=icon]:pl-1">
          <div className="flex h-12 w-14 shrink-0 items-center justify-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <span className="text-sm font-medium">{APP_CONFIG.name.charAt(0).toUpperCase()}</span>
            </div>
          </div>
          <span className="text-lg font-medium leading-none">{APP_CONFIG.name}</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="relative gap-1 px-2 transition-[padding] duration-[var(--sidebar-motion-duration)] ease-[var(--sidebar-motion-ease)] group-data-[collapsible=icon]:px-0">
              <SidebarActiveIndicator index={activeMainIndex} />
              {visibleMain.map((item) => {
                const isActive = pathname === item.url
                return (
                  <SidebarMenuItem key={item.title} className="relative z-10 transition-[padding] duration-[var(--sidebar-motion-duration)] ease-[var(--sidebar-motion-ease)] group-data-[collapsible=icon]:px-1">
                    <SidebarMenuButton
                      asChild
                      tooltip={getTitle(item.title)}
                      isActive={isActive}
                      className={cn(
                        "h-12 [&_svg]:size-5",
                        isActive
                          ? "text-primary-foreground hover:brightness-95"
                          : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <Link to={item.url} className="flex w-full items-center">
                        <span className="flex h-12 w-14 shrink-0 items-center justify-center">
                          <item.icon />
                        </span>
                        <span className="font-semibold">{getTitle(item.title)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="mt-auto border-t border-muted/30 pt-4">
          <SidebarGroupContent>
            <SidebarMenu className="relative gap-1 px-2 transition-[padding] duration-[var(--sidebar-motion-duration)] ease-[var(--sidebar-motion-ease)] group-data-[collapsible=icon]:px-0">
              <SidebarActiveIndicator index={activeSecondaryIndex} />
              {visibleSecondary.map((item) => {
                const isActive = pathname === item.url
                return (
                  <SidebarMenuItem key={item.title} className="relative z-10 transition-[padding] duration-[var(--sidebar-motion-duration)] ease-[var(--sidebar-motion-ease)] group-data-[collapsible=icon]:px-1">
                    <SidebarMenuButton
                      asChild
                      tooltip={getTitle(item.title)}
                      isActive={isActive}
                      className={cn(
                        "h-12 [&_svg]:size-5 group/item",
                        isActive
                          ? "text-primary-foreground hover:brightness-95"
                          : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <Link to={item.url} className="flex w-full items-center">
                        <span className="flex h-12 w-14 shrink-0 items-center justify-center">
                          <item.icon />
                        </span>
                        <span className="font-semibold">{getTitle(item.title)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="flex items-center border-t flex-row px-2 transition-[padding] duration-[var(--sidebar-motion-duration)] ease-[var(--sidebar-motion-ease)] group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:justify-center">
        <div className="flex h-12 w-14 shrink-0 items-center justify-center">
          <Link
            to={APP_CONFIG.githubUrl}
            target="_blank"
            title={t("ui.github_title")}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <Github className="size-5" />
          </Link>
        </div>
        <div className="flex min-w-0 items-center gap-2 group-data-[collapsible=icon]:w-0">
          <Link
            to={APP_CONFIG.githubUrl}
            target="_blank"
            className="text-primary/40 hover:text-primary transition-colors cursor-pointer"
            title={t("ui.github_title")}
          >
            <Github className="size-4" />
          </Link>
          <span className="text-sm font-semibold text-primary/80 tracking-tight">{APP_CONFIG.version}</span>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
