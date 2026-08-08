import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { Loader2 } from "lucide-react"
import { costCenterSchema, type CostCenterFormValues } from "@/schemas/cost-center.schema"
import { COST_CENTER_ICON_OPTIONS } from "@/constants/icon-registry"
import { useCreateCostCenter, useUpdateCostCenter } from "@/hooks/use-cost-centers"
import type { CostCenter } from "@/types"
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

interface CostCenterFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  costCenter?: CostCenter | null
}

const DEFAULT_VALUES: CostCenterFormValues = { name: "", icon: "folder", color: "#6366f1" }

export function CostCenterFormDialog({ open, onOpenChange, costCenter }: CostCenterFormDialogProps) {
  const isEditing = !!costCenter
  const createCostCenter = useCreateCostCenter()
  const updateCostCenter = useUpdateCostCenter()
  const submitting = createCostCenter.isPending || updateCostCenter.isPending

  const form = useForm<CostCenterFormValues>({
    resolver: zodResolver(costCenterSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onBlur",
    reValidateMode: "onChange",
  })
  const watchedColor = useWatch({ control: form.control, name: "color" })

  useEffect(() => {
    if (!open) return
    form.reset(
      costCenter
        ? { name: costCenter.name, icon: costCenter.icon, color: costCenter.color }
        : DEFAULT_VALUES
    )
  }, [open, costCenter, form])

  function onSubmit(values: CostCenterFormValues) {
    if (isEditing) {
      updateCostCenter.mutate({ id: costCenter.id, values }, { onSuccess: () => onOpenChange(false) })
    } else {
      createCostCenter.mutate(values, { onSuccess: () => onOpenChange(false) })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar centro de custo" : "Novo centro de custo"}</DialogTitle>
          <DialogDescription>
            Agrupe despesas por projeto, obra, pessoa ou qualquer outro critério seu.
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
                        options={COST_CENTER_ICON_OPTIONS}
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
                      <Input placeholder="Ex: Obra da casa, Projeto X..." autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="size-4 animate-spin" />}
                {isEditing ? "Salvar alterações" : "Criar centro de custo"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
