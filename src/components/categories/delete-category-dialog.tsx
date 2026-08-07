import { Loader2 } from "lucide-react"
import { useCategoryUsage, useCategoryActiveChildren, useSoftDeleteCategory } from "@/hooks/use-categories"
import type { Category } from "@/types"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function DeleteCategoryDialog({
  category,
  onOpenChange,
}: {
  category: Category | null
  onOpenChange: (open: boolean) => void
}) {
  const { data: usageCount = 0, isLoading: loadingUsage } = useCategoryUsage(category?.id ?? null)
  const { data: activeChildren = 0, isLoading: loadingChildren } = useCategoryActiveChildren(
    category?.id ?? null
  )
  const softDelete = useSoftDeleteCategory()
  const blocked = activeChildren > 0
  const loading = loadingUsage || loadingChildren

  return (
    <AlertDialog open={!!category} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir categoria</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                Tem certeza que deseja excluir <strong>{category?.name}</strong>? Ela será movida
                para a lixeira e poderá ser restaurada depois.
              </p>
              {loading ? (
                <span className="flex items-center gap-1.5 text-xs">
                  <Loader2 className="size-3 animate-spin" /> Verificando uso da categoria...
                </span>
              ) : (
                <>
                  {blocked && (
                    <p className="text-sm font-medium text-destructive">
                      Esta categoria possui {activeChildren}{" "}
                      {activeChildren === 1 ? "subcategoria ativa" : "subcategorias ativas"}.
                      Exclua ou mova as subcategorias antes de continuar.
                    </p>
                  )}
                  {!blocked && usageCount > 0 && (
                    <p className="text-sm text-warning">
                      Esta categoria está associada a {usageCount}{" "}
                      {usageCount === 1 ? "transação" : "transações"}. Elas continuarão existindo,
                      mas a categoria não aparecerá mais para novos lançamentos.
                    </p>
                  )}
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={softDelete.isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={softDelete.isPending || loading || blocked}
            onClick={(e) => {
              e.preventDefault()
              if (!category) return
              softDelete.mutate(category.id, { onSuccess: () => onOpenChange(false) })
            }}
            className={cn(buttonVariants({ variant: "destructive" }))}
          >
            {softDelete.isPending && <Loader2 className="size-4 animate-spin" />}
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
