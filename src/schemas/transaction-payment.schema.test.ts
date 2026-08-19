import { describe, expect, it } from "vitest"
import { buildTransactionPaymentSchema } from "./transaction-payment.schema"

const base = { date: "2026-08-18", payment_method: "pix" as const, notes: null }

describe("buildTransactionPaymentSchema", () => {
  it("rejects amount <= 0", () => {
    const schema = buildTransactionPaymentSchema(1000)
    expect(schema.safeParse({ ...base, amount: 0 }).success).toBe(false)
    expect(schema.safeParse({ ...base, amount: -10 }).success).toBe(false)
  })

  it("accepts amount below the remaining balance", () => {
    const schema = buildTransactionPaymentSchema(1000)
    expect(schema.safeParse({ ...base, amount: 400 }).success).toBe(true)
  })

  it("accepts amount exactly equal to the remaining balance", () => {
    const schema = buildTransactionPaymentSchema(1000)
    expect(schema.safeParse({ ...base, amount: 1000 }).success).toBe(true)
  })

  it("rejects amount above the remaining balance, with a friendly message on the amount field", () => {
    const schema = buildTransactionPaymentSchema(1000)
    const result = schema.safeParse({ ...base, amount: 1000.01 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["amount"])
      expect(result.error.issues[0]?.message).toBe(
        "O valor informado excede o saldo restante deste lançamento."
      )
    }
  })

  it("allows payment_method and notes to be null", () => {
    const schema = buildTransactionPaymentSchema(1000)
    expect(
      schema.safeParse({ amount: 100, date: "2026-08-18", payment_method: null, notes: null })
        .success
    ).toBe(true)
  })

  it("rejects a malformed date", () => {
    const schema = buildTransactionPaymentSchema(1000)
    expect(schema.safeParse({ ...base, amount: 100, date: "18/08/2026" }).success).toBe(false)
  })
})
