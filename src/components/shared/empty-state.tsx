import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmptyStateAction {
  label: string
  onClick: () => void
}

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: EmptyStateAction
  tone?: "default" | "primary"
}

export function EmptyState({ icon: Icon, title, description, action, tone = "default" }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div
        className={
          tone === "primary"
            ? "flex size-14 items-center justify-center rounded-2xl bg-primary/10"
            : "flex size-14 items-center justify-center rounded-2xl bg-muted"
        }
      >
        <Icon className={tone === "primary" ? "size-6 text-primary" : "size-6 text-muted-foreground"} />
      </div>
      <h3 className="font-medium">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && (
        <Button onClick={action.onClick} className="mt-1">
          {action.label}
        </Button>
      )}
    </div>
  )
}
