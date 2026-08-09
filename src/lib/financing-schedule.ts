/**
 * Geração do cronograma de amortização (SAC/Price) para Financiamentos, e
 * do cronograma simples (parcelas fixas) para Empréstimos.
 *
 * Não existe RPC nem trigger no banco para isso — `financing_installments`
 * tem `amortization_amount`/`interest_amount`/`remaining_balance` por
 * parcela (populados por quem cria a parcela), mas nenhuma function gera
 * essas linhas automaticamente. Decisão de implementação desta sessão.
 *
 * `interest_rate` é tratado como percentual por período (ex.: 1.5 = 1,5%
 * ao mês) — decisão não determinável só pelo schema (`numeric(7,4)`, sem
 * unidade explícita); documentada como decisão em docs/MODULO_4.md.
 * Periodicidade assumida mensal (1 parcela por mês a partir de
 * `start_date`) — nem `loans` nem `financings` têm coluna de frequência
 * (diferente de `recurring_rules`), então não há como derivar do schema.
 */

export interface InstallmentScheduleRow {
  number: number
  dueDate: string
  amount: number
  amortizationAmount: number
  interestAmount: number
  remainingBalance: number
}

function addMonths(dateISO: string, months: number): string {
  const [y, m, d] = dateISO.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1 + months, d))
  return date.toISOString().slice(0, 10)
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/** Empréstimo simples: N parcelas iguais a `installmentAmount`, sem
 * detalhamento de juros (o schema de `loan_installments` não tem
 * `interest_amount`/`amortization_amount`). */
export function buildLoanSchedule(
  startDate: string,
  installmentsTotal: number,
  installmentAmount: number
): { number: number; dueDate: string; amount: number }[] {
  return Array.from({ length: installmentsTotal }, (_, i) => ({
    number: i + 1,
    dueDate: addMonths(startDate, i + 1),
    amount: installmentAmount,
  }))
}

/**
 * SAC — Sistema de Amortização Constante: amortização fixa a cada
 * período, juros decrescem sobre o saldo devedor restante.
 * A última parcela absorve o resíduo de arredondamento (mesmo padrão já
 * usado no parcelamento de cartão/transações: "última parcela ajustada").
 */
export function buildSacSchedule(
  startDate: string,
  principal: number,
  annualOrPeriodicRatePercent: number,
  installmentsTotal: number
): InstallmentScheduleRow[] {
  const i = annualOrPeriodicRatePercent / 100
  const baseAmortization = round2(principal / installmentsTotal)
  const rows: InstallmentScheduleRow[] = []
  let balance = principal

  for (let n = 1; n <= installmentsTotal; n++) {
    const isLast = n === installmentsTotal
    const amortization = isLast ? round2(balance) : baseAmortization
    const interest = round2(balance * i)
    const amount = round2(amortization + interest)
    balance = round2(balance - amortization)

    rows.push({
      number: n,
      dueDate: addMonths(startDate, n),
      amount,
      amortizationAmount: amortization,
      interestAmount: interest,
      remainingBalance: balance,
    })
  }
  return rows
}

/**
 * Price (Tabela Price / sistema francês): parcela fixa, amortização
 * cresce e juros decrescem ao longo do tempo. Se a taxa for 0%, cai para
 * parcelas iguais (evita divisão por zero). Resíduo de arredondamento
 * absorvido na última parcela, garantindo saldo final exatamente 0.
 */
export function buildPriceSchedule(
  startDate: string,
  principal: number,
  periodicRatePercent: number,
  installmentsTotal: number
): InstallmentScheduleRow[] {
  const i = periodicRatePercent / 100
  const pmt =
    i === 0
      ? round2(principal / installmentsTotal)
      : round2((principal * (i * Math.pow(1 + i, installmentsTotal))) / (Math.pow(1 + i, installmentsTotal) - 1))

  const rows: InstallmentScheduleRow[] = []
  let balance = principal

  for (let n = 1; n <= installmentsTotal; n++) {
    const isLast = n === installmentsTotal
    const interest = round2(balance * i)
    const amortization = isLast ? round2(balance) : round2(pmt - interest)
    const amount = isLast ? round2(amortization + interest) : pmt
    balance = round2(balance - amortization)

    rows.push({
      number: n,
      dueDate: addMonths(startDate, n),
      amount,
      amortizationAmount: amortization,
      interestAmount: interest,
      remainingBalance: balance,
    })
  }
  return rows
}

export function buildFinancingSchedule(
  amortization: "sac" | "price",
  startDate: string,
  principal: number,
  periodicRatePercent: number,
  installmentsTotal: number
): InstallmentScheduleRow[] {
  return amortization === "sac"
    ? buildSacSchedule(startDate, principal, periodicRatePercent, installmentsTotal)
    : buildPriceSchedule(startDate, principal, periodicRatePercent, installmentsTotal)
}
