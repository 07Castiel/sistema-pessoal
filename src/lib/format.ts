export function formatCurrency(value: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(value)
}

export function formatDate(date: string | Date) {
  const d =
    typeof date === "string" ? new Date(date.includes("T") ? date : date + "T00:00:00") : date
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(d)
}

export function formatDateTime(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(d)
}

export function formatPercent(value: number, digits = 0) {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value / 100)
}

const MONTH_LABELS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
]

export function monthLabel(month: number) {
  return MONTH_LABELS[month - 1] ?? String(month)
}
