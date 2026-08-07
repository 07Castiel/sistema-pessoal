import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Search } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { searchRepository } from "@/repositories/search.repository"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

const TYPE_LABEL: Record<string, string> = {
  transacao: "Transações",
  conta: "Contas",
  categoria: "Categorias",
  cartao: "Cartões",
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [term, setTerm] = useState("")
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  const { data: results = [] } = useQuery({
    queryKey: ["global-search", user?.id, term],
    queryFn: () => searchRepository.search(user!.id, term),
    enabled: !!user && term.trim().length > 1,
  })

  const grouped = results.reduce<Record<string, typeof results>>((acc, r) => {
    acc[r.type] = acc[r.type] ? [...acc[r.type], r] : [r]
    return acc
  }, {})

  return (
    <>
      <Button
        variant="outline"
        className="h-9 w-full max-w-sm justify-start gap-2 text-muted-foreground sm:pr-12"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" />
        <span className="hidden sm:inline">Buscar transações, contas, categorias...</span>
        <span className="sm:hidden">Buscar...</span>
        <kbd className="pointer-events-none absolute right-2 hidden h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium sm:flex">
          Ctrl K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Digite para buscar em toda a sua vida financeira..."
          value={term}
          onValueChange={setTerm}
        />
        <CommandList>
          <CommandEmpty>
            {term.trim().length > 1 ? "Nenhum resultado encontrado." : "Digite ao menos 2 caracteres."}
          </CommandEmpty>
          {Object.entries(grouped).map(([type, items]) => (
            <CommandGroup key={type} heading={TYPE_LABEL[type] ?? type}>
              {items.map((item) => (
                <CommandItem
                  key={`${item.type}-${item.id}`}
                  value={`${item.type}-${item.id}-${item.title}`}
                  onSelect={() => {
                    setOpen(false)
                    navigate(item.path)
                  }}
                >
                  <div className="flex flex-col">
                    <span>{item.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.subtitle}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  )
}
