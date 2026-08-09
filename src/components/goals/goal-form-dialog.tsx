import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { useQuery } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { goalSchema, PRIORITY_OPTIONS, type GoalFormValues } from "@/schemas/goal.schema"
import { GOAL_ICON_OPTIONS } from "@/constants/icon-registry"
import { useCreateGoal, useUpdateGoal } from "@/hooks/use-goals"
import { useAuth } from "@/hooks/use-auth"
import { categoriesService } from "@/services/categories.service"
import type { Goal } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CurrencyInput } from "@/components/shared/currency-input"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface GoalFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal?: Goal | null
}

const DEFAULT_VALUES: GoalFormValues = {
  name: "",
  target_amount: 0,
  target_date: null,
  priority: "media",
  category_id: null,
  color: "#6366f1",
  icon: "target",
}

export function GoalFormDialog({ open, onOpenChange, goal }: GoalFormDialogProps) {
  const isEditing = !!goal
  const { user } = useAuth()
  const createGoal = useCreateGoal()
  const updateGoal = useUpdateGoal()
  const submitting = createGoal.isPending || updateGoal.isPending

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", "list", user?.id],
    queryFn: () => categoriesService.list(user!.id),
    enabled: !!user && open,
  })
  const activeCategories = categories.filter((c) => c.deleted_at === null)

  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onBlur",
    reValidateMode: "onChange",
  })
  const watchedColor = useWatch({ control: form.control, name: "color" })

  useEffect(() => {
    if (!open) return
    if (goal) {
      form.reset({
        name: goal.name,
        target_amount: Number(goal.target_amount),
        target_date: goal.target_date,
        priority: goal.priority,
        category_id: goal.category_id,
        color: goal.color,
        icon: goal.icon,
      })
    } else {
      form.reset(DEFAULT_VALUES)
    }
  }, [open, goal, form])

  function onSubmit(values: GoalFormValues) {
    if (isEditing) {
      updateGoal.mutate({ id: goal.id, values }, { onSuccess: () => onOpenChange(false) })
    } else {
      createGoal.mutate(values, { onSuccess: () => onOpenChange(false) })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar meta" : "Nova meta"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações desta meta."
              : "Defina um objetivo financeiro para acompanhar o progresso."}
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
                        options={GOAL_ICON_OPTIONS}
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
                      <Input placeholder="Ex: Viagem para a praia" autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="target_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor da meta</FormLabel>
                    <FormControl>
                      <CurrencyInput value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="target_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prazo (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PRIORITY_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria (opcional)</FormLabel>
                    <Select
                      value={field.value ?? "nenhuma"}
                      onValueChange={(v) => field.onChange(v === "nenhuma" ? null : v)}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="nenhuma">Nenhuma</SelectItem>
                        {activeCategories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                {isEditing ? "Salvar alterações" : "Criar meta"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
