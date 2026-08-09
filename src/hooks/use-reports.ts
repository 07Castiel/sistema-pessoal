import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { reportsService } from "@/services/reports.service"
import { useAuth } from "@/hooks/use-auth"

const KEY = "reports"

export interface MonthPoint {
  year: number
  month: number
}

export function currentMonthPoint(): MonthPoint {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

function monthKey(p: MonthPoint) {
  return p.year * 12 + p.month
}

/** `n` meses terminando em `end` (inclusive), mais antigo primeiro. */
export function monthsBack(end: MonthPoint, n: number): MonthPoint {
  const date = new Date(end.year, end.month - 1 - (n - 1), 1)
  return { year: date.getFullYear(), month: date.getMonth() + 1 }
}

export function shiftMonth(p: MonthPoint, delta: number): MonthPoint {
  const date = new Date(p.year, p.month - 1 + delta, 1)
  return { year: date.getFullYear(), month: date.getMonth() + 1 }
}

/** Todos os meses com dado do usuário — o hook recorta o intervalo selecionado. */
export function useMonthlySummariesQuery() {
  const { user } = useAuth()
  return useQuery({
    queryKey: [KEY, "monthly-summaries", user?.id],
    queryFn: () => reportsService.getMonthlySummaries(user!.id),
    enabled: !!user,
  })
}

/** Recorta as linhas já buscadas para o intervalo [from, to], inclusive. */
export function useMonthRange<T extends { year: number | null; month: number | null }>(
  summaries: T[] | undefined,
  from: MonthPoint,
  to: MonthPoint
): T[] {
  return useMemo(() => {
    const fromKey = monthKey(from)
    const toKey = monthKey(to)
    return (summaries ?? []).filter((s) => {
      const k = (s.year ?? 0) * 12 + (s.month ?? 0)
      return k >= fromKey && k <= toKey
    })
  }, [summaries, from, to])
}

export function useCategorySummaryQuery(period: MonthPoint, type: "despesa" | "receita") {
  const { user } = useAuth()
  return useQuery({
    queryKey: [KEY, "category-summary", user?.id, period.year, period.month, type],
    queryFn: () => reportsService.getCategorySummary(user!.id, period.year, period.month, type),
    enabled: !!user,
  })
}

export function useCashFlowQuery(dateFrom: string, dateTo: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: [KEY, "cash-flow", user?.id, dateFrom, dateTo],
    queryFn: () => reportsService.getCashFlow(user!.id, dateFrom, dateTo),
    enabled: !!user && !!dateFrom && !!dateTo,
  })
}

export function useNetWorthQuery() {
  const { user } = useAuth()
  return useQuery({
    queryKey: [KEY, "net-worth", user?.id],
    queryFn: () => reportsService.getNetWorth(user!.id),
    enabled: !!user,
  })
}
