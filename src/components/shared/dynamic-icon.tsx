import { memo, type CSSProperties } from "react"
import { getIcon } from "@/constants/icon-registry"
import { cn } from "@/lib/utils"

interface DynamicIconProps {
  name: string | null | undefined
  className?: string
  style?: CSSProperties
}

export const DynamicIcon = memo(function DynamicIcon({ name, className, style }: DynamicIconProps) {
  const Icon = getIcon(name)
  return <Icon className={cn("size-4", className)} style={style} />
})
