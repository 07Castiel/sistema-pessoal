import { Outlet } from "react-router-dom"
import { Wallet2 } from "lucide-react"
import { ThemeToggle } from "@/components/layout/theme-toggle"

export function AuthLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-muted/30">
      <header className="flex h-14 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wallet2 className="size-4" />
          </div>
          <span className="text-sm font-semibold">Meu Financeiro</span>
        </div>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center p-4">
        <Outlet />
      </main>
    </div>
  )
}
