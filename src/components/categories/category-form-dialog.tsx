import { useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { Loader2 } from "lucide-react"
import { categorySchema, CATEGORY_TYPE_OPTIONS, type CategoryFormValues } from "@/schemas/category.schema"
import { CATEGORY_ICON_OPTIONS } from "@/constants/icon-registry"
import { useCreateCategory, useUpdateCategory, useCategoryActiveChildren } from "@/hooks/use-categories"
import type { Category, CategoryType } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { IconPicker } from "@/components/shared/icon-picker"
import { ColorPicker } from "@/components/shared/color-picker"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface CategoryFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: Category | null
  categories: Category[]
  defaultType?: CategoryType
  defaultParentId?: string | null
}

function defaultValuesFor(
  category: Category | null | undefined,
  defaultType: CategoryType,
  defaultParentId: string | null
): CategoryFormValues {
  if (category) {
    return {
      name: category.name,
      type: category.type,
      icon: category.icon,
      color: category.color,
      parent_id: category.parent_id,
    }
  }
  return {
    name: "",
    type: defaultType,
    icon: "tag",
    color: "#6366f1",
    parent_id: defaultParentId,
  }
}

export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  categories,
  defaultType = "despesa",
  defaultParentId = null,
}: CategoryFormDialogProps) {
  const isEditing = !!category
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const submitting = createCategory.isPending || updateCategory.isPending

  const { data: activeChildrenCount = 0 } = useCategoryActiveChildren(open ? (category?.id ?? null) : null)
  const hasActiveChildren = isEditing && activeChildrenCount > 0

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: defaultValuesFor(category, defaultType, defaultParentId),
    mode: "onBlur",
    reValidateMode: "onChange",
  })
  const watchedColor = useWatch({ control: form.control, name: "color" })
  const watchedType = useWatch({ control: form.control, name: "type" })

  const parentOptions = useMemo(
    () =>
      categories.filter(
        (c) => c.type === watchedType && c.parent_id === null && c.id !== category?.id
      ),
    [categories, watchedType, category?.id]
  )

  function onSubmit(values: CategoryFormValues) {
    const payload: CategoryFormValues = hasActiveChildren
      ? { ...values, type: category!.type, parent_id: null }
      : values

    if (isEditing) {
      updateCategory.mutate({ id: category.id, values: payload }, { onSuccess: () => onOpenChange(false) })
    } else {
      createCategory.mutate(payload, { onSuccess: () => onOpenChange(false) })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar categoria" : "Nova categoria"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações desta categoria."
              : "Crie uma categoria ou subcategoria personalizada."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex items-end gap-3">
              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ícone</FormLabel>
                    <FormControl>
                      <IconPicker
                        value={field.value}
                        onChange={field.onChange}
                        options={CATEGORY_ICON_OPTIONS}
                        color={watchedColor}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cor</FormLabel>
                    <FormControl>
                      <ColorPicker value={field.value} onChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Alimentação, Streaming..." autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value)
                      form.setValue("parent_id", null)
                    }}
                    disabled={hasActiveChildren}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CATEGORY_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {hasActiveChildren && (
                    <FormDescription>
                      O tipo não pode ser alterado pois esta categoria possui subcategorias ativas.
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="parent_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria principal (opcional)</FormLabel>
                  <Select
                    value={field.value ?? "none"}
                    onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                    disabled={hasActiveChildren}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Nenhuma — categoria principal" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma — categoria principal</SelectItem>
                      {parentOptions.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>
                          {opt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {hasActiveChildren ? (
                    <FormDescription>
                      Esta categoria possui subcategorias e deve permanecer principal.
                    </FormDescription>
                  ) : (
                    <FormDescription>
                      Selecione para transformar esta categoria em uma subcategoria.
                    </FormDescription>
                  )}
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="size-4 animate-spin" />}
                {isEditing ? "Salvar alterações" : "Criar categoria"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
