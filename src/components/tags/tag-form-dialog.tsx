import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { Loader2 } from "lucide-react"
import { tagSchema, type TagFormValues } from "@/schemas/tag.schema"
import { useCreateTag, useUpdateTag } from "@/hooks/use-tags"
import type { Tag } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ColorPicker } from "@/components/shared/color-picker"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

interface TagFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tag?: Tag | null
}

const DEFAULT_VALUES: TagFormValues = { name: "", color: "#6366f1" }

export function TagFormDialog({ open, onOpenChange, tag }: TagFormDialogProps) {
  const isEditing = !!tag
  const createTag = useCreateTag()
  const updateTag = useUpdateTag()
  const submitting = createTag.isPending || updateTag.isPending

  const form = useForm<TagFormValues>({
    resolver: zodResolver(tagSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onBlur",
    reValidateMode: "onChange",
  })
  const name = useWatch({ control: form.control, name: "name" })
  const color = useWatch({ control: form.control, name: "color" })

  useEffect(() => {
    if (!open) return
    form.reset(tag ? { name: tag.name, color: tag.color } : DEFAULT_VALUES)
  }, [open, tag, form])

  function onSubmit(values: TagFormValues) {
    if (isEditing) {
      updateTag.mutate({ id: tag.id, values }, { onSuccess: () => onOpenChange(false) })
    } else {
      createTag.mutate(values, { onSuccess: () => onOpenChange(false) })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar tag" : "Nova tag"}</DialogTitle>
          <DialogDescription>
            Tags ajudam a marcar e filtrar lançamentos livremente, além das categorias.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex items-end gap-3">
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
                      <Input placeholder="Ex: Viagem, Urgente..." autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {name && (
              <div>
                <p className="mb-1.5 text-xs text-muted-foreground">Pré-visualização</p>
                <Badge variant="outline" style={{ borderColor: `${color}66`, color }}>
                  {name}
                </Badge>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="size-4 animate-spin" />}
                {isEditing ? "Salvar alterações" : "Criar tag"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
