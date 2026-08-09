import { supabase } from "@/lib/supabase"
import type {
  TransactionEnriched,
  CardInvoice,
  LoanInstallment,
  FinancingInstallment,
  Goal,
  RecurringRule,
} from "@/types"

/**
 * Nenhuma tabela de eventos própria — cada método busca da fonte de
 * verdade já existente, filtrada por intervalo de data (o mês exibido),
 * uma query por fonte. Sem N+1: o hook combina os 6 resultados em
 * memória, nada é buscado por item individual.
 */
export const calendarRepository = {
  /** Transações com vencimento no período (pendentes/pagas/recebidas — não canceladas). */
  async getTransactionsByDueDate(
    userId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<TransactionEnriched[]> {
    const { data, error } = await supabase
      .from("v_transactions_enriched")
      .select("*")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .neq("status", "cancelado")
      .not("due_date", "is", null)
      .gte("due_date", dateFrom)
      .lte("due_date", dateTo)
    if (error) throw error
    return data ?? []
  },

  async getCardInvoicesByDueDate(userId: string, dateFrom: string, dateTo: string): Promise<CardInvoice[]> {
    const { data, error } = await supabase
      .from("card_invoices")
      .select("*")
      .eq("user_id", userId)
      .gte("due_date", dateFrom)
      .lte("due_date", dateTo)
    if (error) throw error
    return data ?? []
  },

  async getLoanInstallmentsByDueDate(
    userId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<LoanInstallment[]> {
    const { data, error } = await supabase
      .from("loan_installments")
      .select("*")
      .eq("user_id", userId)
      .gte("due_date", dateFrom)
      .lte("due_date", dateTo)
    if (error) throw error
    return data ?? []
  },

  async getFinancingInstallmentsByDueDate(
    userId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<FinancingInstallment[]> {
    const { data, error } = await supabase
      .from("financing_installments")
      .select("*")
      .eq("user_id", userId)
      .gte("due_date", dateFrom)
      .lte("due_date", dateTo)
    if (error) throw error
    return data ?? []
  },

  /** Metas com prazo no período — exclui canceladas, sem relevância como evento futuro. */
  async getGoalsByTargetDate(userId: string, dateFrom: string, dateTo: string): Promise<Goal[]> {
    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", userId)
      .neq("status", "cancelada")
      .not("target_date", "is", null)
      .gte("target_date", dateFrom)
      .lte("target_date", dateTo)
    if (error) throw error
    return data ?? []
  },

  /**
   * Só a próxima ocorrência já calculada e armazenada
   * (`recurring_rules.next_run_date`) — não projeta ocorrências futuras
   * além dela. Projetar exigiria simular `_next_recurrence_date` no
   * frontend, arriscando divergir da lógica real do banco; decisão
   * documentada em `docs/MODULO_4.md`.
   */
  async getUpcomingRecurringRules(
    userId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<RecurringRule[]> {
    const { data, error } = await supabase
      .from("recurring_rules")
      .select("*")
      .eq("user_id", userId)
      .eq("active", true)
      .gte("next_run_date", dateFrom)
      .lte("next_run_date", dateTo)
    if (error) throw error
    return data ?? []
  },
}
