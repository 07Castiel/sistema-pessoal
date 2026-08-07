import {
  ArrowLeftRight,
  History,
  Paperclip,
  Scale,
  ShieldCheck,
} from "lucide-react"
import { useAccountHistory } from "@/hooks/use-account-history"
import { formatCurrency, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Account } from "@/types"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { AttachmentsPanel } from "@/components/shared/attachments-panel"

const AUDIT_ACTION_LABEL: Record<string, string> = {
  insert: "Conta criada",
  update: "Conta atualizada",
  delete: "Conta excluída",
}

export function AccountHistorySheet({
  open,
  onOpenChange,
  account,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: Account | null
}) {
  const { data: history, isLoading } = useAccountHistory(open ? (account?.id ?? null) : null)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="flex items-center gap-2">
            <History className="size-4" /> {account?.name}
          </SheetTitle>
          <SheetDescription>
            Histórico completo, reconciliações e anexos desta conta.
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="historico" className="flex-1 overflow-hidden">
          <TabsList className="mx-5 mt-3">
            <TabsTrigger value="historico">Histórico</TabsTrigger>
            <TabsTrigger value="anexos">
              <Paperclip className="size-3.5" /> Anexos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="historico" className="scrollbar-thin flex-1 overflow-y-auto px-5 pb-5">
            {isLoading ? (
              <div className="space-y-3 pt-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : !history || history.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Nenhuma movimentação registrada ainda.
              </p>
            ) : (
              <ul className="space-y-1 pt-3">
                {history.map((item, index) => (
                  <li key={`${item.kind}-${index}`} className="flex items-start gap-3 rounded-lg p-2 hover:bg-accent/40">
                    {item.kind === "transaction" && (
                      <>
                        <div
                          className={cn(
                            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                            item.data.type === "receita" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                          )}
                        >
                          {item.data.type === "receita" ? "+" : "−"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{item.data.description}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(item.data.date)}</p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 text-sm tabular-nums",
                            item.data.type === "receita" ? "text-success" : "text-destructive"
                          )}
                        >
                          {formatCurrency(Number(item.data.amount))}
                        </span>
                      </>
                    )}

                    {item.kind === "transfer" && (
                      <>
                        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-sky-500/10 text-sky-500">
                          <ArrowLeftRight className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {item.data.from_account_id === account?.id ? "Transferência enviada" : "Transferência recebida"}
                          </p>
                          <p className="text-xs text-muted-foreground">{formatDate(item.data.date)}</p>
                        </div>
                        <span className="shrink-0 text-sm tabular-nums">
                          {formatCurrency(Number(item.data.amount))}
                        </span>
                      </>
                    )}

                    {item.kind === "reconciliation" && (
                      <>
                        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Scale className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">Reconciliação</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(item.data.reconciled_at)} · Ajuste de{" "}
                            {formatCurrency(Number(item.data.difference))}
                          </p>
                        </div>
                      </>
                    )}

                    {item.kind === "audit" && (
                      <>
                        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <ShieldCheck className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">
                            {AUDIT_ACTION_LABEL[item.data.action] ?? item.data.action}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(item.data.created_at)}
                          </p>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="anexos" className="scrollbar-thin flex-1 overflow-y-auto px-5 pb-5 pt-3">
            {account && <AttachmentsPanel entityType="account" entityId={account.id} />}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
