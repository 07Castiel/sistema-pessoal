import type { LucideIcon } from "lucide-react"
import {
  LayoutDashboard,
  Wallet,
  Tags,
  ArrowLeftRight,
  CreditCard,
  Repeat,
  TrendingUp,
  HandCoins,
  Target,
  NotebookTabs,
  CalendarDays,
  FileBarChart,
  FolderKanban,
  Settings,
} from "lucide-react"

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
}

export interface NavGroup {
  title: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Visão Geral",
    items: [{ label: "Dashboard", path: "/", icon: LayoutDashboard }],
  },
  {
    title: "Movimentação",
    items: [
      { label: "Contas", path: "/contas", icon: Wallet },
      { label: "Categorias", path: "/categorias", icon: Tags },
      { label: "Transações", path: "/transacoes", icon: ArrowLeftRight },
      { label: "Cartões", path: "/cartoes", icon: CreditCard },
      { label: "Recorrências", path: "/recorrencias", icon: Repeat },
    ],
  },
  {
    title: "Patrimônio",
    items: [
      { label: "Investimentos", path: "/investimentos", icon: TrendingUp },
      { label: "Empréstimos e Financiamentos", path: "/emprestimos", icon: HandCoins },
      { label: "Metas", path: "/metas", icon: Target },
    ],
  },
  {
    title: "Planejamento",
    items: [
      { label: "Orçamento e Fluxo de Caixa", path: "/planejamento", icon: NotebookTabs },
      { label: "Calendário", path: "/calendario", icon: CalendarDays },
      { label: "Centro de Custos", path: "/centro-de-custos", icon: FolderKanban },
    ],
  },
  {
    title: "Análise",
    items: [{ label: "Relatórios", path: "/relatorios", icon: FileBarChart }],
  },
  {
    title: "Sistema",
    items: [{ label: "Configurações", path: "/configuracoes", icon: Settings }],
  },
]
