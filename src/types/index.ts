import type { Database } from "./database.types"

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"]

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"]

export type Views<T extends keyof Database["public"]["Views"]> =
  Database["public"]["Views"][T]["Row"]

export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T]

export type Profile = Tables<"profiles">
export type Account = Tables<"accounts">
export type Category = Tables<"categories">
export type CostCenter = Tables<"cost_centers">
export type Tag = Tables<"tags">
export type CreditCard = Tables<"credit_cards">
export type CardInvoice = Tables<"card_invoices">
export type RecurringRule = Tables<"recurring_rules">
export type Transaction = Tables<"transactions">
export type Transfer = Tables<"transfers">
export type Subscription = Tables<"subscriptions">
export type Investment = Tables<"investments">
export type InvestmentMovement = Tables<"investment_movements">
export type Loan = Tables<"loans">
export type LoanInstallment = Tables<"loan_installments">
export type Financing = Tables<"financings">
export type FinancingInstallment = Tables<"financing_installments">
export type Goal = Tables<"goals">
export type GoalContribution = Tables<"goal_contributions">
export type Budget = Tables<"budgets">
export type Notification = Tables<"notifications">
export type Attachment = Tables<"attachments">
export type AccountReconciliation = Tables<"account_reconciliations">
export type AuditLog = Tables<"audit_logs">

export type MonthlySummary = Views<"v_monthly_summary">
export type CategorySummary = Views<"v_category_summary">
export type NetWorth = Views<"v_net_worth">
export type CardUsage = Views<"v_card_usage">
export type TransactionEnriched = Views<"v_transactions_enriched">
export type CashFlowDaily = Views<"v_cash_flow_daily">
export type PendingByDueDate = Views<"v_pending_by_due_date">

/** Status derivado exibido na UI: o banco nunca grava "atrasado". */
export type EffectiveStatus = "pendente" | "pago" | "recebido" | "cancelado" | "atrasado"

export type AccountType = Enums<"account_type">
export type AccountStatus = Enums<"account_status">
export type CategoryType = Enums<"category_type">
export type TransactionType = Enums<"transaction_type">
export type TransactionStatus = Enums<"transaction_status">
export type PaymentMethod = Enums<"payment_method">
export type RecurrenceFrequency = Enums<"recurrence_frequency">
export type PriorityLevel = Enums<"priority_level">
export type CardBrand = Enums<"card_brand">
export type InvoiceStatus = Enums<"invoice_status">
export type BillingCycle = Enums<"billing_cycle">
export type InvestmentType = Enums<"investment_type">
export type InvestmentMovementType = Enums<"investment_movement_type">
export type LoanType = Enums<"loan_type">
export type LoanStatus = Enums<"loan_status">
export type GoalStatus = Enums<"goal_status">
export type InstallmentStatus = Enums<"installment_status">
export type AmortizationType = Enums<"amortization_type">
export type NotificationType = Enums<"notification_type">
