import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { calendarService } from "@/services/calendar.service"
import { useAuth } from "@/hooks/use-auth"
import { useCreditCardsQuery } from "@/hooks/use-credit-cards"
import { useLoansQuery } from "@/hooks/use-loans"
import { useFinancingsQuery } from "@/hooks/use-financings"
import { effectiveInvoiceStatus } from "@/lib/card-invoice"
import type { MonthPoint } from "@/hooks/use-reports"

const KEY = "calendar"

export type CalendarEventType = "transacao" | "fatura" | "emprestimo" | "financiamento" | "meta" | "recorrencia"

export interface CalendarEvent {
  id: string
  date: string
  type: CalendarEventType
  title: string
  subtitle: string | null
  amount: number | null
  isOverdue: boolean
  isDone: boolean
  href: string
}

function monthDateRange(period: MonthPoint) {
  const from = new Date(period.year, period.month - 1, 1)
  const to = new Date(period.year, period.month, 0)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { dateFrom: iso(from), dateTo: iso(to) }
}

/**
 * Sem tabela de eventos própria — combina 6 fontes já existentes num
 * único array em memória. Cada fonte é uma query por mês exibido (sem
 * N+1); nomes de cartão/empréstimo/financiamento são resolvidos das
 * listas já buscadas por `useCreditCardsQuery`/`useLoansQuery`/
 * `useFinancingsQuery` (cache compartilhado com Cartões/Empréstimos),
 * mesmo padrão já usado em Orçamento para resolver categoria.
 */
export function useCalendarEvents(period: MonthPoint) {
  const { user } = useAuth()
  const userId = user?.id
  const { dateFrom, dateTo } = monthDateRange(period)
  const today = new Date().toISOString().slice(0, 10)

  const transactionsQuery = useQuery({
    queryKey: [KEY, "transactions", userId, dateFrom, dateTo],
    queryFn: () => calendarService.getTransactionsByDueDate(userId!, dateFrom, dateTo),
    enabled: !!userId,
  })
  const invoicesQuery = useQuery({
    queryKey: [KEY, "invoices", userId, dateFrom, dateTo],
    queryFn: () => calendarService.getCardInvoicesByDueDate(userId!, dateFrom, dateTo),
    enabled: !!userId,
  })
  const loanInstallmentsQuery = useQuery({
    queryKey: [KEY, "loan-installments", userId, dateFrom, dateTo],
    queryFn: () => calendarService.getLoanInstallmentsByDueDate(userId!, dateFrom, dateTo),
    enabled: !!userId,
  })
  const financingInstallmentsQuery = useQuery({
    queryKey: [KEY, "financing-installments", userId, dateFrom, dateTo],
    queryFn: () => calendarService.getFinancingInstallmentsByDueDate(userId!, dateFrom, dateTo),
    enabled: !!userId,
  })
  const goalsQuery = useQuery({
    queryKey: [KEY, "goals", userId, dateFrom, dateTo],
    queryFn: () => calendarService.getGoalsByTargetDate(userId!, dateFrom, dateTo),
    enabled: !!userId,
  })
  const recurringQuery = useQuery({
    queryKey: [KEY, "recurring", userId, dateFrom, dateTo],
    queryFn: () => calendarService.getUpcomingRecurringRules(userId!, dateFrom, dateTo),
    enabled: !!userId,
  })

  const { data: creditCards } = useCreditCardsQuery()
  const { data: loans } = useLoansQuery()
  const { data: financings } = useFinancingsQuery()

  const events = useMemo<CalendarEvent[]>(() => {
    const list: CalendarEvent[] = []

    for (const t of transactionsQuery.data ?? []) {
      if (!t.due_date) continue
      list.push({
        id: `tx-${t.id}`,
        date: t.due_date,
        type: "transacao",
        title: t.description ?? "Lançamento sem descrição",
        subtitle: t.category_name,
        amount: t.type === "despesa" ? -Number(t.amount) || 0 : Number(t.amount),
        isOverdue: t.is_overdue ?? false,
        isDone: t.status === "pago" || t.status === "recebido",
        href: "/transacoes",
      })
    }

    const cardsById = new Map((creditCards ?? []).map((c) => [c.id, c]))
    for (const inv of invoicesQuery.data ?? []) {
      const card = cardsById.get(inv.card_id)
      const status = effectiveInvoiceStatus(inv)
      list.push({
        id: `inv-${inv.id}`,
        date: inv.due_date,
        type: "fatura",
        title: `Fatura ${card?.name ?? "do cartão"}`,
        subtitle: null,
        amount: -Number(inv.total_amount) || 0,
        isOverdue: status === "atrasada",
        isDone: status === "paga",
        href: "/cartoes",
      })
    }

    const loansById = new Map((loans ?? []).map((l) => [l.id, l]))
    for (const inst of loanInstallmentsQuery.data ?? []) {
      const loan = loansById.get(inst.loan_id)
      const overdue = inst.status === "atrasado" || (inst.status === "pendente" && inst.due_date < today)
      list.push({
        id: `loan-${inst.id}`,
        date: inst.due_date,
        type: "emprestimo",
        title: `Parcela ${inst.number} — ${loan?.person_name ?? "empréstimo"}`,
        subtitle: loan?.type === "concedido" ? "A receber" : "A pagar",
        amount: loan?.type === "concedido" ? Number(inst.amount) : -Number(inst.amount) || 0,
        isOverdue: overdue,
        isDone: inst.status === "pago",
        href: "/emprestimos",
      })
    }

    const financingsById = new Map((financings ?? []).map((f) => [f.id, f]))
    for (const inst of financingInstallmentsQuery.data ?? []) {
      const financing = financingsById.get(inst.financing_id)
      const overdue = inst.status === "atrasado" || (inst.status === "pendente" && inst.due_date < today)
      list.push({
        id: `fin-${inst.id}`,
        date: inst.due_date,
        type: "financiamento",
        title: `Parcela ${inst.number} — ${financing?.name ?? "financiamento"}`,
        subtitle: "A pagar",
        amount: -Number(inst.amount) || 0,
        isOverdue: overdue,
        isDone: inst.status === "pago",
        href: "/emprestimos",
      })
    }

    for (const g of goalsQuery.data ?? []) {
      if (!g.target_date) continue
      list.push({
        id: `goal-${g.id}`,
        date: g.target_date,
        type: "meta",
        title: g.name,
        subtitle: "Prazo da meta",
        amount: null,
        isOverdue: g.status === "em_andamento" && g.target_date < today,
        isDone: g.status === "concluida",
        href: "/metas",
      })
    }

    for (const r of recurringQuery.data ?? []) {
      if (!r.next_run_date) continue
      list.push({
        id: `rec-${r.id}`,
        date: r.next_run_date,
        type: "recorrencia",
        title: r.description,
        subtitle: "Próxima ocorrência",
        amount: r.type === "despesa" ? -Number(r.amount) || 0 : Number(r.amount),
        isOverdue: false,
        isDone: false,
        href: "/recorrencias",
      })
    }

    return list.sort((a, b) => a.date.localeCompare(b.date))
  }, [
    transactionsQuery.data,
    invoicesQuery.data,
    loanInstallmentsQuery.data,
    financingInstallmentsQuery.data,
    goalsQuery.data,
    recurringQuery.data,
    creditCards,
    loans,
    financings,
    today,
  ])

  const isLoading =
    transactionsQuery.isLoading ||
    invoicesQuery.isLoading ||
    loanInstallmentsQuery.isLoading ||
    financingInstallmentsQuery.isLoading ||
    goalsQuery.isLoading ||
    recurringQuery.isLoading

  return { events, isLoading }
}
