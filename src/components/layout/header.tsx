import { MobileSidebar } from "@/components/layout/mobile-sidebar"
import { GlobalSearch } from "@/components/layout/global-search"
import { NotificationsBell } from "@/components/layout/notifications-bell"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { UserMenu } from "@/components/layout/user-menu"

export function Header({ title }: { title?: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-sm">
      <MobileSidebar />
      {title && (
        <h1 className="hidden shrink-0 text-sm font-semibold md:block">{title}</h1>
      )}
      <div className="flex flex-1 justify-center md:justify-start">
        <GlobalSearch />
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <NotificationsBell />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  )
}
