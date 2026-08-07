import {
  ArrowDownCircle,
  ArrowUpCircle,
  Landmark,
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
import { useDashboard } from "@/hooks/use-dashboard"
import { formatCurrency, formatDate, monthLabel } from "@/lib/format"
import { cn } from "@/lib/utils"
import { KpiCard } from "@/components/shared/kpi-card"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  pago: "Pago",
  recebido: "Recebido",
  cancelado: "Cancelado",
  atrasado: "Atrasado",
}

export default function DashboardPage() {
  const {
    isLoading,
    accounts,
    netWorth,
    monthlySummaries,
    categorySummary,
    recentTransactions,
    upcomingBills,
    overdueBills,
    currentMonthIncome,
    currentMonthExpense,
    currentMonthBalance,
  } = useDashboard()

  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.current_balance), 0)
  const savingsRate =
    currentMonthIncome > 0 ? (currentMonthBalance / currentMonthIncome) * 100 : 0

  const chartData = monthlySummaries.map((m) => ({
    label: `${monthLabel(m.month ?? 1)}`,
    receitas: Number(m.total_income ?? 0),
    despesas: Number(m.total_expense ?? 0),
  }))

  const pieColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"]
  const pieData = categorySummary.slice(0, 6).map((c) => ({
    name: c.category_name ?? "Outros",
    value: Number(c.total_amount ?? 0),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Visão geral da sua vida financeira
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Saldo atual"
          value={formatCurrency(totalBalance)}
          icon={Wallet}
          loading={isLoading}
        />
        <KpiCard
          label="Receitas do mês"
          value={formatCurrency(currentMonthIncome)}
          icon={ArrowUpCircle}
          tone="success"
          loading={isLoading}
        />
        <KpiCard
          label="Despesas do mês"
          value={formatCurrency(currentMonthExpense)}
          icon={ArrowDownCircle}
          tone="destructive"
          loading={isLoading}
        />
        <KpiCard
          label="Patrimônio líquido"
          value={formatCurrency(netWorth?.net_worth ?? 0)}
          icon={Landmark}
          loading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Lucro do mês"
          value={formatCurrency(currentMonthBalance)}
          icon={PiggyBank}
          tone={currentMonthBalance >= 0 ? "success" : "destructive"}
          loading={isLoading}
        />
        <KpiCard
          label="Taxa de economia"
          value={`${savingsRate.toFixed(1)}%`}
          icon={PiggyBank}
          loading={isLoading}
        />
        <KpiCard
          label="Total investido"
          value={formatCurrency(netWorth?.total_investments ?? 0)}
          icon={Landmark}
          loading={isLoading}
        />
        <KpiCard
          label="Contas atrasadas"
          value={String(overdueBills.length)}
          icon={ArrowDownCircle}
          tone={overdueBills.length > 0 ? "destructive" : "default"}
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
          <CardHeader>
            <CardTitle className="text-base">Despesas por categoria</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : pieData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Sem despesas neste mês
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
            <CardTitle className="text-base">Próximas contas</CardTitle>
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
                  <span className="tabular-nums text-destructive">
                    {formatCurrency(Number(t.amount))}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transações recentes</CardTitle>
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
                      <p className="text-xs text-muted-foreground">{formatDate(t.date)}</p>
                      <Badge variant="outline" className="h-4 px-1 text-[10px]">
                        {STATUS_LABEL[t.status]}
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
