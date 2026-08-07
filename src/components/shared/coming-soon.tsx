import type { LucideIcon } from "lucide-react"
import { Construction } from "lucide-react"

export function ComingSoon({
  title,
  description,
  icon: Icon = Construction,
}: {
  title: string
  description?: string
  icon?: LucideIcon
}) {
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
        <Icon className="size-6 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        {description ?? "Este módulo está em desenvolvimento e chegará em breve."}
      </p>
    </div>
  )
}
