import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ThemeProvider } from "@/providers/theme-provider"
import { QueryProvider } from "@/providers/query-provider"
import { AuthProvider } from "@/contexts/auth-context"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { GuestRoute } from "@/components/auth/guest-route"
import { AppLayout } from "@/layouts/app-layout"
import { AuthLayout } from "@/layouts/auth-layout"

import LoginPage from "@/pages/auth/login"
import RegisterPage from "@/pages/auth/register"
import ForgotPasswordPage from "@/pages/auth/forgot-password"
import ResetPasswordPage from "@/pages/auth/reset-password"

import DashboardPage from "@/pages/dashboard/dashboard"
import AccountsPage from "@/pages/accounts/accounts"
import CategoriesPage from "@/pages/categories/categories"
import TransactionsPage from "@/pages/transactions/transactions"
import CardsPage from "@/pages/cards/cards"
import RecurringPage from "@/pages/recurring/recurring"
import InvestmentsPage from "@/pages/investments/investments"
import LoansPage from "@/pages/loans/loans"
import GoalsPage from "@/pages/goals/goals"
import PlanningPage from "@/pages/planning/planning"
import CalendarPage from "@/pages/calendar/calendar"
import CostCentersPage from "@/pages/cost-centers/cost-centers"
import ReportsPage from "@/pages/reports/reports"
import SettingsPage from "@/pages/settings/settings"

export default function App() {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AuthProvider>
          <TooltipProvider delayDuration={200}>
            <BrowserRouter basename={import.meta.env.BASE_URL}>
              <Routes>
                <Route element={<GuestRoute />}>
                  <Route element={<AuthLayout />}>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/registrar" element={<RegisterPage />} />
                    <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
                  </Route>
                </Route>

                <Route path="/redefinir-senha" element={<AuthLayout />}>
                  <Route index element={<ResetPasswordPage />} />
                </Route>

                <Route element={<ProtectedRoute />}>
                  <Route element={<AppLayout />}>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/contas" element={<AccountsPage />} />
                    <Route path="/categorias" element={<CategoriesPage />} />
                    <Route path="/transacoes" element={<TransactionsPage />} />
                    <Route path="/cartoes" element={<CardsPage />} />
                    <Route path="/recorrencias" element={<RecurringPage />} />
                    <Route path="/investimentos" element={<InvestmentsPage />} />
                    <Route path="/emprestimos" element={<LoansPage />} />
                    <Route path="/metas" element={<GoalsPage />} />
                    <Route path="/planejamento" element={<PlanningPage />} />
                    <Route path="/calendario" element={<CalendarPage />} />
                    <Route path="/centro-de-custos" element={<CostCentersPage />} />
                    <Route path="/relatorios" element={<ReportsPage />} />
                    <Route path="/configuracoes" element={<SettingsPage />} />
                  </Route>
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
            <Toaster richColors position="top-right" />
          </TooltipProvider>
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  )
}
