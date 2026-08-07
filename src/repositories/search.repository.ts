import { supabase } from "@/lib/supabase"

export interface SearchResult {
  id: string
  type: "transacao" | "conta" | "categoria" | "cartao"
  title: string
  subtitle: string
  path: string
}

export const searchRepository = {
  async search(userId: string, term: string): Promise<SearchResult[]> {
    const like = `%${term}%`

    const [transactions, accounts, categories, cards] = await Promise.all([
      supabase
        .from("transactions")
        .select("id, description, amount, date")
        .eq("user_id", userId)
        .or(`description.ilike.${like},supplier.ilike.${like},notes.ilike.${like}`)
        .order("date", { ascending: false })
        .limit(6),
      supabase
        .from("accounts")
        .select("id, name, bank")
        .eq("user_id", userId)
        .ilike("name", like)
        .limit(4),
      supabase
        .from("categories")
        .select("id, name, type")
        .eq("user_id", userId)
        .ilike("name", like)
        .limit(4),
      supabase
        .from("credit_cards")
        .select("id, name, bank")
        .eq("user_id", userId)
        .ilike("name", like)
        .limit(4),
    ])

    const results: SearchResult[] = []

    for (const t of transactions.data ?? []) {
      results.push({
        id: t.id,
        type: "transacao",
        title: t.description,
        subtitle: `R$ ${Number(t.amount).toFixed(2)} · ${t.date}`,
        path: "/transacoes",
      })
    }
    for (const a of accounts.data ?? []) {
      results.push({
        id: a.id,
        type: "conta",
        title: a.name,
        subtitle: a.bank ?? "Conta",
        path: "/contas",
      })
    }
    for (const c of categories.data ?? []) {
      results.push({
        id: c.id,
        type: "categoria",
        title: c.name,
        subtitle: c.type,
        path: "/categorias",
      })
    }
    for (const c of cards.data ?? []) {
      results.push({
        id: c.id,
        type: "cartao",
        title: c.name,
        subtitle: c.bank ?? "Cartão",
        path: "/cartoes",
      })
    }

    return results
  },
}
