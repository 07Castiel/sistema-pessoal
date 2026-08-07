import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ReactNode } from "react"

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    // disableTransitionOnChange suppresses CSS transitions while the theme
    // class swaps. Without it, elements using `transition-colors` stay painted
    // with the previous theme's color because the browser cannot interpolate a
    // background-color whose value comes from a custom property that changed.
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}
