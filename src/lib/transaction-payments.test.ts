import { describe, expect, it } from "vitest"
import { calculateRemainingAmount, deriveTransactionStatus } from "./transaction-payments"

describe("calculateRemainingAmount", () => {
  it("returns amount minus paid", () => {
    expect(calculateRemainingAmount(1000, 300)).toBe(700)
  })

  it("never goes negative when paid exceeds total", () => {
    expect(calculateRemainingAmount(100, 150)).toBe(0)
  })

  it("closes exactly at zero for a 3-way installment split (33.33+33.33+33.34)", () => {
    const paid = 33.33 + 33.33 + 33.34
    expect(calculateRemainingAmount(100, paid)).toBe(0)
  })

  it("is immune to the classic 0.1 + 0.2 float trap", () => {
    expect(calculateRemainingAmount(0.3, 0.1 + 0.2)).toBe(0)
  })

  it("handles a partial payment in cents correctly", () => {
    expect(calculateRemainingAmount(1999.99, 999.99)).toBe(1000)
  })
})

describe("deriveTransactionStatus", () => {
  it("is pendente with nothing paid", () => {
    expect(deriveTransactionStatus("despesa", 1000, 0, "pendente")).toBe("pendente")
  })

  it("is parcialmente_pago for a despesa with partial payment", () => {
    expect(deriveTransactionStatus("despesa", 1000, 300, "pendente")).toBe("parcialmente_pago")
  })

  it("is parcialmente_recebido for a receita with partial payment", () => {
    expect(deriveTransactionStatus("receita", 2000, 800, "pendente")).toBe(
      "parcialmente_recebido"
    )
  })

  it("is pago exactly at the boundary for a despesa", () => {
    expect(deriveTransactionStatus("despesa", 1000, 1000, "pendente")).toBe("pago")
  })

  it("is recebido exactly at the boundary for a receita", () => {
    expect(deriveTransactionStatus("receita", 1000, 1000, "pendente")).toBe("recebido")
  })

  it("still resolves to the terminal status if paidAmount is inconsistently larger than amount", () => {
    expect(deriveTransactionStatus("despesa", 1000, 1200, "pendente")).toBe("pago")
  })

  it("always preserves cancelado regardless of paid amount", () => {
    expect(deriveTransactionStatus("despesa", 1000, 500, "cancelado")).toBe("cancelado")
  })

  it("does not misfire on the 3-way installment split boundary", () => {
    const paid = 33.33 + 33.33 + 33.34
    expect(deriveTransactionStatus("despesa", 100, paid, "pendente")).toBe("pago")
  })
})
