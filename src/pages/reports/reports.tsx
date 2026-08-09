import { useMemo, useState } from "react"
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronLeft,
  ChevronRight,
  PiggyBank,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  ComposedChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  useMonthlySummariesQuery,
  useMonthRange,
  useCategorySummaryQuery,
  useCashFlowQuery,
  useNetWorthQuery,
  currentMonthPoint,
  monthsBack,
  shiftMonth,
  type MonthPoint,
} from "@/hooks/use-reports"
import { formatCurrency, formatDate, formatPercent, monthLabel } from "@/lib/format"
import { cn } from "@/lib/utils"
import { KpiCard } from "@/components/shared/kpi-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

function toMonthInputValue(p: MonthPoint): string {
  return `${p.year}-${String(p.month).padStart(2, "0")}`
}

function fromMonthInputValue(v: string): MonthPoint | null {
  const match = /^(\d{4})-(\d{2})$/.exec(v)
  if (!match) return null
  return { year: Number(match[1]), month: Number(match[2]) }
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function daysAgoIso(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export default function ReportsPage() {
  const today = currentMonthPoint()

  // "Evolução mensal" / KPIs — intervalo de mês/ano, padrão últimos 6 meses.
  const [rangeFrom, setRangeFrom] = useState<MonthPoint>(monthsBack(today, 6))
  const [rangeTo, setRangeTo] = useState<MonthPoint>(today)

  // "Despesas por categoria" — um único mês, navegador prev/próximo (mesmo padrão do Dashboard/Orçamento).
  const [categoryPeriod, setCategoryPeriod] = useState<MonthPoint>(today)
  const [categoryTab, setCategoryTab] = useState<"despesa" | "receita">("despesa")

  // "Fluxo de caixa" — intervalo de datas, padrão últimos 30 dias.
  const [cashFrom, setCashFrom] = useState(daysAgoIso(30))
  const [cashTo, setCashTo] = useState(todayIso())

  const { data: allMonthlySummaries, isLoading: loadingMonthly } = useMonthlySummariesQuery()
  const orderedRange = useMemo(() => {
    const [from, to] =
      rangeFrom.year * 12 + rangeFrom.month <= rangeTo.year * 12 + rangeTo.month
        ? [rangeFrom, rangeTo]
        : [rangeTo, rangeFrom]
    return { from, to }
  }, [rangeFrom, rangeTo])
  const monthlyRange = useMonthRange(allMonthlySummaries, orderedRange.from, orderedRange.to)

  const { data: categorySummary, isLoading: loadingCategory } = useCategorySummaryQuery(
    categoryPeriod,
    categoryTab
  )
  const { data: cashFlow, isLoading: loadingCashFlow } = useCashFlowQuery(cashFrom, cashTo)
  const { data: netWorth, isLoading: loadingNetWorth } = useNetWorthQuery()

  const totals = useMemo(() => {
    const income = monthlyRange.reduce((sum, m) => sum + Number(m.total_income ?? 0), 0)
    const expense = monthlyRange.reduce((sum, m) => sum + Number(m.total_expense ?? 0), 0)
    const balance = income - expense
    const savingsRate = income > 0 ? (balance / income) * 100 : 0
    return { income, expense, balance, savingsRate }
  }, [monthlyRange])

  const evolutionChartData = monthlyRange.map((m) => ({
    label: `${monthLabel(m.month ?? 1)}/${String(m.year ?? 0).slice(2)}`,
    receitas: Number(m.total_income ?? 0),
    despesas: Number(m.total_expense ?? 0),
  }))

  const categoryTotal = (categorySummary ?? []).reduce((sum, c) => sum + Number(c.total_amount ?? 0), 0)
  const pieColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"]
  const pieData = (categorySummary ?? []).map((c) => ({
    name: c.category_name ?? "Outros",
    value: Number(c.total_amount ?? 0),
  }))

  const cashFlowChartData = (cashFlow ?? []).map((c) => ({
    label: formatDate(c.date!).slice(0, 5),
    entradas: Number(c.inflow ?? 0),
    saidas: Number(c.outflow ?? 0),
    liquido: Number(c.net ?? 0),
  }))
  const cashFlowTotals = (cashFlow ?? []).reduce(
    (acc, c) => ({
      inflow: acc.inflow + Number(c.inflow ?? 0),
      outflow: acc.outflow + Number(c.outflow ?? 0),
    }),
    { inflow: 0, outflow: 0 }
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Relatórios</h1>
        <p className="text-sm text-muted-foreground">
          Visão consolidada da sua vida financeira — mesma fonte de dados do Dashboard
        </p>
      </div>

      {/* Visão geral / evolução mensal */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Visão geral do período</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">De</Label>
              <Input
                type="month"
                className="h-8 w-36"
                value={toMonthInputValue(rangeFrom)}
                onChange={(e) => {
                  const parsed = fromMonthInputValue(e.target.value)
                  if (parsed) setRangeFrom(parsed)
                }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Até</Label>
              <Input
                type="month"
                className="h-8 w-36"
                value={toMonthInputValue(rangeTo)}
                onChange={(e) => {
                  const parsed = fromMonthInputValue(e.target.value)
                  if (parsed) setRangeTo(parsed)
                }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Receitas no período"
              value={formatCurrency(totals.income)}
              icon={ArrowUpCircle}
              tone="success"
              loading={loadingMonthly}
            />
            <KpiCard
              label="Despesas no período"
              value={formatCurrency(totals.expense)}
              icon={ArrowDownCircle}
              tone="destructive"
              loading={loadingMonthly}
            />
            <KpiCard
              label="Resultado líquido"
              value={formatCurrency(totals.balance)}
              icon={PiggyBank}
              tone={totals.balance >= 0 ? "success" : "destructive"}
              loading={loadingMonthly}
            />
            <KpiCard
              label="Taxa de economia"
              value={formatPercent(totals.savingsRate, 1)}
              icon={totals.savingsRate >= 0 ? TrendingUp : TrendingDown}
              tone={totals.savingsRate >= 0 ? "success" : "destructive"}
              loading={loadingMonthly}
              hint="Resultado líquido sobre as receitas"
            />
          </div>

          <div className="h-72">
            {loadingMonthly ? (
              <Skeleton className="h-full w-full" />
            ) : evolutionChartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Sem dados no período selecionado
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={evolutionChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    tickFormatter={(v) => `R$${Math.round(v / 1000)}k`}
                  />
                  <RechartsTooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="receitas" fill="var(--success)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="despesas" fill="var(--destructive)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Despesas/receitas por categoria */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Por categoria</CardTitle>
          <div className="flex flex-wrap items-center gap-3">
            <Tabs value={categoryTab} onValueChange={(v) => setCategoryTab(v as "despesa" | "receita")}>
              <TabsList>
                <TabsTrigger value="despesa">Despesas</TabsTrigger>
                <TabsTrigger value="receita">Receitas</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-1 rounded-lg border p-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Mês anterior"
                onClick={() => setCategoryPeriod((p) => shiftMonth(p, -1))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="min-w-28 text-center text-sm font-medium">
                {monthLabel(categoryPeriod.month)} de {categoryPeriod.year}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Próximo mês"
                onClick={() => setCategoryPeriod((p) => shiftMonth(p, 1))}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingCategory ? (
            <Skeleton className="h-64 w-full" />
          ) : pieData.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              Sem {categoryTab === "despesa" ? "despesas" : "receitas"} neste período
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={pieColors[i % pieColors.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value) => formatCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 self-center">
                {(categorySummary ?? []).map((c, i) => {
                  const amount = Number(c.total_amount ?? 0)
                  const pct = categoryTotal > 0 ? (amount / categoryTotal) * 100 : 0
                  return (
                    <div key={c.category_id} className="flex items-center justify-between gap-2 text-sm">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: pieColors[i % pieColors.length] }}
                        />
                        <span className="truncate">{c.category_name}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 tabular-nums">
                        <span className="text-xs text-muted-foreground">{formatPercent(pct, 0)}</span>
                        <span className="font-medium">{formatCurrency(amount)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fluxo de caixa */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Fluxo de caixa</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">De</Label>
              <Input
                type="date"
                className="h-8 w-36"
                value={cashFrom}
                max={cashTo}
                onChange={(e) => setCashFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Até</Label>
              <Input
                type="date"
                className="h-8 w-36"
                value={cashTo}
                min={cashFrom}
                max={todayIso()}
                onChange={(e) => setCashTo(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiCard
              label="Entradas no período"
              value={formatCurrency(cashFlowTotals.inflow)}
              icon={ArrowUpCircle}
              tone="success"
              loading={loadingCashFlow}
            />
            <KpiCard
              label="Saídas no período"
              value={formatCurrency(cashFlowTotals.outflow)}
              icon={ArrowDownCircle}
              tone="destructive"
              loading={loadingCashFlow}
            />
            <KpiCard
              label="Líquido no período"
              value={formatCurrency(cashFlowTotals.inflow - cashFlowTotals.outflow)}
              icon={Wallet}
              tone={cashFlowTotals.inflow - cashFlowTotals.outflow >= 0 ? "success" : "destructive"}
              loading={loadingCashFlow}
            />
          </div>
          <div className="h-64">
            {loadingCashFlow ? (
              <Skeleton className="h-full w-full" />
            ) : cashFlowChartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Nenhuma movimentação liquidada neste período
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={cashFlowChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} interval="preserveStartEnd" />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    tickFormatter={(v) => `R$${Math.round(v / 1000)}k`}
                  />
                  <RechartsTooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="entradas" fill="var(--success)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="saidas" fill="var(--destructive)" radius={[3, 3, 0, 0]} />
                  <Line type="monotone" dataKey="liquido" stroke="var(--primary)" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Patrimônio */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Patrimônio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingNetWorth ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">Patrimônio líquido</p>
                <p
                  className={cn(
                    "mt-1 text-3xl font-semibold tabular-nums",
                    Number(netWorth?.net_worth ?? 0) >= 0 ? "text-success" : "text-destructive"
                  )}
                >
                  {formatCurrency(Number(netWorth?.net_worth ?? 0))}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Contas + investimentos + a receber − a pagar − financiamentos
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Contas</p>
                  <p className="font-medium tabular-nums">{formatCurrency(Number(netWorth?.total_accounts ?? 0))}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Investimentos</p>
                  <p className="font-medium tabular-nums">
                    {formatCurrency(Number(netWorth?.total_investments ?? 0))}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">A receber (empréstimos)</p>
                  <p className="font-medium tabular-nums">
                    {formatCurrency(Number(netWorth?.total_receivable_loans ?? 0))}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">A pagar (empréstimos)</p>
                  <p className="font-medium tabular-nums text-destructive">
                    {formatCurrency(Number(netWorth?.total_payable_loans ?? 0))}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Financiamentos</p>
                  <p className="font-medium tabular-nums text-destructive">
                    {formatCurrency(Number(netWorth?.total_financings ?? 0))}
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
