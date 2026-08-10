import { useState } from "react"
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  PiggyBank,
  Wallet,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts"
import { useDashboard, currentPeriod, type DashboardPeriod } from "@/hooks/use-dashboard"
import { formatCurrency, formatDate, monthLabel } from "@/lib/format"
import { cn } from "@/lib/utils"
import { KpiCard } from "@/components/shared/kpi-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  pago: "Pago",
  recebido: "Recebido",
  cancelado: "Cancelado",
  atrasado: "Atrasado",
}

function shiftPeriod(period: DashboardPeriod, delta: number): DashboardPeriod {
  const date = new Date(period.year, period.month - 1 + delta, 1)
  return { year: date.getFullYear(), month: date.getMonth() + 1 }
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<DashboardPeriod>(currentPeriod())
  const isCurrentPeriod =
    period.year === currentPeriod().year && period.month === currentPeriod().month

  const {
    isLoading,
    accounts,
    netWorth,
    monthlySummaries,
    expenseByCategory,
    incomeByCategory,
    recentTransactions,
    upcomingBills,
    overdueBills,
    pendingSummary,
    periodIncome,
    periodExpense,
    periodBalance,
  } = useDashboard(period)

  const [categoryTab, setCategoryTab] = useState<"despesa" | "receita">("despesa")

  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.current_balance), 0)
  const savingsRate = periodIncome > 0 ? (periodBalance / periodIncome) * 100 : 0

  const chartData = monthlySummaries.map((m) => ({
    label: `${monthLabel(m.month ?? 1)}`,
    receitas: Number(m.total_income ?? 0),
    despesas: Number(m.total_expense ?? 0),
  }))

  const pieColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"]
  const activeCategoryData = categoryTab === "despesa" ? expenseByCategory : incomeByCategory
  const pieData = activeCategoryData.slice(0, 6).map((c) => ({
    name: c.category_name ?? "Outros",
    value: Number(c.total_amount ?? 0),
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Visão geral da sua vida financeira
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border p-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Período anterior"
            onClick={() => setPeriod((p) => shiftPeriod(p, -1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-32 text-center text-sm font-medium">
            {monthLabel(period.month)} de {period.year}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Próximo período"
            disabled={isCurrentPeriod}
            onClick={() => setPeriod((p) => shiftPeriod(p, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Saldo atual"
          value={formatCurrency(totalBalance)}
          icon={Wallet}
          loading={isLoading}
        />
        <KpiCard
          label="Receitas do período"
          value={formatCurrency(periodIncome)}
          icon={ArrowUpCircle}
          tone="success"
          loading={isLoading}
        />
        <KpiCard
          label="Despesas do período"
          value={formatCurrency(periodExpense)}
          icon={ArrowDownCircle}
          tone="destructive"
          loading={isLoading}
        />
        <KpiCard
          label="Resultado líquido"
          value={formatCurrency(periodBalance)}
          icon={PiggyBank}
          tone={periodBalance >= 0 ? "success" : "destructive"}
          loading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Contas a pagar"
          value={formatCurrency(pendingSummary.payable)}
          icon={ArrowDownCircle}
          loading={isLoading}
        />
        <KpiCard
          label="Contas a receber"
          value={formatCurrency(pendingSummary.receivable)}
          icon={ArrowUpCircle}
          loading={isLoading}
        />
        <KpiCard
          label="Despesas atrasadas"
          value={formatCurrency(pendingSummary.overdueExpense)}
          icon={Clock}
          tone={pendingSummary.overdueExpense > 0 ? "destructive" : "default"}
          loading={isLoading}
        />
        <KpiCard
          label="Receitas atrasadas"
          value={formatCurrency(pendingSummary.overdueIncome)}
          icon={Clock}
          tone={pendingSummary.overdueIncome > 0 ? "destructive" : "default"}
          loading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Receitas x Despesas (últimos 6 meses)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">Por categoria</CardTitle>
            <Tabs value={categoryTab} onValueChange={(v) => setCategoryTab(v as "despesa" | "receita")}>
              <TabsList>
                <TabsTrigger value="despesa">Despesas</TabsTrigger>
                <TabsTrigger value="receita">Receitas</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="h-72">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : pieData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Sem {categoryTab === "despesa" ? "despesas" : "receitas"} neste período
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={pieColors[i % pieColors.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
            ) : accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma conta cadastrada.</p>
            ) : (
              accounts.map((a) => (
                <div key={a.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: a.color }}
                    />
                    <span className="font-medium">{a.name}</span>
                  </div>
                  <span className="tabular-nums">{formatCurrency(Number(a.current_balance))}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Próximos vencimentos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingBills.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma conta a vencer.</p>
            ) : (
              upcomingBills.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{t.description}</p>
                    <p className="text-xs text-muted-foreground">
                      Vence em {t.due_date && formatDate(t.due_date)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "tabular-nums",
                      t.type === "receita" ? "text-success" : "text-destructive"
                    )}
                  >
                    {formatCurrency(Number(t.amount))}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Despesas e receitas atrasadas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overdueBills.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nada atrasado. 🎉</p>
            ) : (
              overdueBills.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{t.description}</p>
                    <p className="text-xs text-destructive">
                      Venceu em {t.due_date && formatDate(t.due_date)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "tabular-nums",
                      t.type === "receita" ? "text-success" : "text-destructive"
                    )}
                  >
                    {formatCurrency(Number(t.amount))}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Patrimônio líquido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-semibold tabular-nums">
              {formatCurrency(netWorth?.net_worth ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground">
              Contas + investimentos + a receber − a pagar − financiamentos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Taxa de economia do período</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-semibold tabular-nums">{savingsRate.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">Resultado líquido sobre as receitas</p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Últimas transações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
            ) : recentTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma transação ainda.</p>
            ) : (
              recentTransactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{t.description}</p>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs text-muted-foreground">{formatDate(t.date!)}</p>
                      <Badge variant="outline" className="h-4 px-1 text-[10px]">
                        {STATUS_LABEL[t.effective_status ?? "pendente"]}
                      </Badge>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "tabular-nums",
                      t.type === "receita" ? "text-success" : "text-destructive"
                    )}
                  >
                    {t.type === "receita" ? "+" : "-"}
                    {formatCurrency(Number(t.amount))}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
