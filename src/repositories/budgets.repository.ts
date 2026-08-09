import { supabase } from "@/lib/supabase"
import type { Budget } from "@/types"
import type { BudgetFormValues } from "@/schemas/budget.schema"

export const budgetsRepository = {
  /**
   * Retorna só `budgets` — a resolução de categoria (nome/ícone/cor) é
   * feita no hook a partir de `useCategoriesQuery()`, já em cache
   * compartilhado no app, em vez de um embed de banco novo (nenhum
   * outro repository deste projeto usa `select("*, rel(...)")`; o padrão
   * estabelecido é resolver relações no frontend a partir de listas já
   * buscadas, como em Metas/Investimentos).
   */
  async listByPeriod(userId: string, year: number, month: number): Promise<Budget[]> {
    const { data, error } = await supabase
      .from("budgets")
      .select("*")
      .eq("user_id", userId)
      .eq("year", year)
      .eq("month", month)
      .order("created_at", { ascending: true })
    if (error) throw error
    return data
  },

  /**
   * "Realizado" via `v_category_summary`, a mesma view usada no Dashboard —
   * ela já filtra `status in ('pago','recebido')`; como só é consultada
   * para `category_type = 'despesa'`, e `validate_transaction_references`
   * garante que uma categoria de despesa só é usada em transações
   * `type = 'despesa'`, o resultado é equivalente a `type='despesa' AND
   * status='pago'` — exatamente o filtro usado por `check_budget_alerts`.
   * Uma query só para todas as categorias do período, sem N+1.
   */
  async getSpentByCategory(userId: string, year: number, month: number): Promise<Map<string, number>> {
    const { data, error } = await supabase
      .from("v_category_summary")
      .select("category_id, total_amount")
      .eq("user_id", userId)
      .eq("year", year)
      .eq("month", month)
      .eq("category_type", "despesa")
    if (error) throw error
    return new Map(
      (data ?? [])
        .filter((row): row is typeof row & { category_id: string } => row.category_id !== null)
        .map((row) => [row.category_id, Number(row.total_amount)])
    )
  },

  async create(userId: string, values: BudgetFormValues): Promise<Budget> {
    const { data, error } = await supabase
      .from("budgets")
      .insert({
        user_id: userId,
        category_id: values.category_id,
        month: values.month,
        year: values.year,
        planned_amount: values.planned_amount,
      })
      .select("*")
      .single()
    if (error) throw error
    return data
  },

  /**
   * Não escreve as flags `alert_*_sent` — só `check_budget_alerts` as
   * grava (monotônico, nunca resetado por uma edição de orçamento).
   */
  async update(id: string, values: BudgetFormValues): Promise<Budget> {
    const { data, error } = await supabase
      .from("budgets")
      .update({
        category_id: values.category_id,
        month: values.month,
        year: values.year,
        planned_amount: values.planned_amount,
      })
      .eq("id", id)
      .select("*")
      .single()
    if (error) throw error
    return data
  },

  /** Exclusão física — `budgets` não tem `deleted_at`. */
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("budgets").delete().eq("id", id)
    if (error) throw error
  },
}
