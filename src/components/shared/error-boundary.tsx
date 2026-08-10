import { Component, type ErrorInfo, type ReactNode } from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Erro não tratado na aplicação:", error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-svh flex-col items-center justify-center gap-3 px-4 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10">
            <AlertTriangle className="size-6 text-destructive" />
          </div>
          <h1 className="font-medium">Algo deu errado</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            Ocorreu um erro inesperado. Tente recarregar a página — se o problema continuar, entre em
            contato com o suporte.
          </p>
          <Button className="mt-1" onClick={() => window.location.reload()}>
            Recarregar página
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
