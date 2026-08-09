/**
 * Maps database unique-constraint names to user-facing Portuguese messages.
 * Business rules raised with `raise exception` in PL/pgSQL are already written
 * in Portuguese, so they pass straight through.
 */
const CONSTRAINT_MESSAGES: Record<string, string> = {
  uq_accounts_user_name_active: "Você já tem uma conta ativa com esse nome.",
  uq_categories_user_type_parent_name_active:
    "Já existe uma categoria ativa com esse nome neste tipo. Escolha outro nome.",
  tags_user_id_name_key: "Você já tem uma tag com esse nome.",
  card_invoices_card_id_reference_month_key: "Já existe uma fatura para esse cartão neste mês.",
}

export function getErrorMessage(error: unknown, fallback = "Ocorreu um erro inesperado"): string {
  if (!error || typeof error !== "object" || !("message" in error)) return fallback

  const message = String((error as { message?: unknown }).message ?? "")
  if (!message) return fallback

  if (message.includes("duplicate key value")) {
    for (const [constraint, friendly] of Object.entries(CONSTRAINT_MESSAGES)) {
      if (message.includes(constraint)) return friendly
    }
    return "Já existe um registro com esses dados."
  }

  return message
}
