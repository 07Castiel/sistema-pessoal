import { useMemo, useState } from "react"
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import { useNavigate } from "react-router-dom"
import {
  AlertTriangle,
  Banknote,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  HandCoins,
  Landmark,
  Repeat,
  Target,
} from "lucide-react"
import { useCalendarEvents, type CalendarEvent, type CalendarEventType } from "@/hooks/use-calendar"
import { currentMonthPoint, shiftMonth, type MonthPoint } from "@/hooks/use-reports"
import { formatCurrency, formatDate, monthLabel } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/empty-state"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

const EVENT_META: Record<CalendarEventType, { label: string; icon: typeof Banknote; color: string }> = {
  transacao: { label: "Transação", icon: Banknote, color: "var(--primary)" },
  fatura: { label: "Fatura de cartão", icon: CreditCard, color: "var(--warning)" },
  emprestimo: { label: "Empréstimo", icon: HandCoins, color: "var(--destructive)" },
  financiamento: { label: "Financiamento", icon: Landmark, color: "var(--chart-4)" },
  meta: { label: "Meta", icon: Target, color: "var(--success)" },
  recorrencia: { label: "Recorrência", icon: Repeat, color: "var(--chart-5)" },
}

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

export default function CalendarPage() {
  const [period, setPeriod] = useState<MonthPoint>(currentMonthPoint())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const { events, isLoading } = useCalendarEvents(period)
  const navigate = useNavigate()

  const days = useMemo(() => {
    const monthStart = new Date(period.year, period.month - 1, 1)
    const gridStart = startOfWeek(startOfMonth(monthStart), { weekStartsOn: 0 })
    const gridEnd = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 0 })
    return eachDayOfInterval({ start: gridStart, end: gridEnd })
  }, [period])

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const event of events) {
      const list = map.get(event.date) ?? []
      list.push(event)
      map.set(event.date, list)
    }
    return map
  }, [events])

  const selectedEvents = selectedDate ? (eventsByDate.get(selectedDate) ?? []) : []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendário Financeiro</h1>
          <p className="text-sm text-muted-foreground">
            Vencimentos, faturas, parcelas, metas e recorrências em um só lugar
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border p-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Mês anterior"
            onClick={() => setPeriod((p) => shiftMonth(p, -1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-32 text-center text-sm font-medium">
            {monthLabel(period.month)} de {period.year}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Próximo mês"
            onClick={() => setPeriod((p) => shiftMonth(p, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {(Object.entries(EVENT_META) as [CalendarEventType, (typeof EVENT_META)[CalendarEventType]][]).map(
          ([type, meta]) => (
            <div key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-2 rounded-full" style={{ backgroundColor: meta.color }} />
              {meta.label}
            </div>
          )
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-[560px] w-full rounded-xl" />
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <div className="grid grid-cols-7 border-b bg-muted/30">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="p-2 text-center text-xs font-medium text-muted-foreground">
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const iso = format(day, "yyyy-MM-dd")
              const dayEvents = eventsByDate.get(iso) ?? []
              const inMonth = isSameMonth(day, new Date(period.year, period.month - 1, 1))
              const hasOverdue = dayEvents.some((e) => e.isOverdue)
              const visibleEvents = dayEvents.slice(0, 3)
              const overflow = dayEvents.length - visibleEvents.length

              return (
                <button
                  key={iso}
                  type="button"
                  disabled={dayEvents.length === 0}
                  onClick={() => setSelectedDate(iso)}
                  className={cn(
                    "flex min-h-20 flex-col gap-1 border-r border-b p-1.5 text-left last:border-r-0 sm:min-h-24 sm:p-2",
                    !inMonth && "bg-muted/20 text-muted-foreground/50",
                    dayEvents.length > 0 && "cursor-pointer hover:bg-accent/40",
                    dayEvents.length === 0 && "cursor-default"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full text-xs",
                      isToday(day) && "bg-primary font-semibold text-primary-foreground",
                      hasOverdue && !isToday(day) && "text-destructive font-semibold"
                    )}
                  >
                    {day.getDate()}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {visibleEvents.map((event) => (
                      <span
                        key={event.id}
                        className={cn("size-1.5 rounded-full", event.isDone && "opacity-40")}
                        style={{ backgroundColor: EVENT_META[event.type].color }}
                      />
                    ))}
                    {overflow > 0 && (
                      <span className="text-[10px] leading-none text-muted-foreground">+{overflow}</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {!isLoading && events.length === 0 && (
        <EmptyState
          icon={Target}
          title="Nenhum evento neste mês"
          description="Contas a vencer, faturas, parcelas, metas e recorrências deste mês aparecerão aqui."
        />
      )}

      <Sheet open={!!selectedDate} onOpenChange={(open) => !open && setSelectedDate(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{selectedDate && formatDate(selectedDate)}</SheetTitle>
            <SheetDescription>
              {selectedEvents.length} {selectedEvents.length === 1 ? "evento" : "eventos"} neste dia
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-2 overflow-y-auto px-4 pb-4">
            {selectedEvents.map((event) => {
              const meta = EVENT_META[event.type]
              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => navigate(event.href)}
                  className="flex w-full items-start justify-between gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent/40"
                >
                  <div className="flex min-w-0 items-start gap-2.5">
                    <div
                      className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted"
                      style={{ color: meta.color }}
                    >
                      <meta.icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{event.title}</p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">{meta.label}</span>
                        {event.subtitle && (
                          <span className="text-xs text-muted-foreground">· {event.subtitle}</span>
                        )}
                        {event.isOverdue && (
                          <Badge variant="outline" className="h-4 gap-0.5 border-destructive/40 bg-destructive/10 px-1 text-[10px] text-destructive">
                            <AlertTriangle className="size-2.5" /> Atrasado
                          </Badge>
                        )}
                        {event.isDone && (
                          <Badge variant="outline" className="h-4 border-success/40 bg-success/10 px-1 text-[10px] text-success">
                            Concluído
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {event.amount !== null && (
                    <span
                      className={cn(
                        "shrink-0 text-sm font-medium tabular-nums",
                        event.amount >= 0 ? "text-success" : "text-destructive"
                      )}
                    >
                      {event.amount >= 0 ? "+" : ""}
                      {formatCurrency(event.amount)}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
