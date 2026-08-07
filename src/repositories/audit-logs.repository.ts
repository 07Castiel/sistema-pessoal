import { supabase } from "@/lib/supabase"
import type { AuditLog } from "@/types"

export const auditLogsRepository = {
  async listForRecord(tableName: string, recordId: string): Promise<AuditLog[]> {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("table_name", tableName)
      .eq("record_id", recordId)
      .order("created_at", { ascending: false })
    if (error) throw error
    return data
  },

  async logEvent(
    userId: string,
    action: string,
    tableName: string,
    recordId?: string
  ): Promise<void> {
    const { error } = await supabase.from("audit_logs").insert({
      user_id: userId,
      action,
      table_name: tableName,
      record_id: recordId ?? null,
      user_agent: navigator.userAgent,
    })
    if (error) throw error
  },
}
