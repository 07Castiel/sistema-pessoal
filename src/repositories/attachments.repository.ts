import { supabase } from "@/lib/supabase"
import type { Attachment } from "@/types"

export type AttachmentEntityType =
  | "transaction"
  | "account"
  | "card_invoice"
  | "loan"
  | "financing"
  | "goal"
  | "recurring_rule"
  | "investment"

const BUCKET = "attachments"

export const attachmentsRepository = {
  async list(entityType: AttachmentEntityType, entityId: string): Promise<Attachment[]> {
    const { data, error } = await supabase
      .from("attachments")
      .select("*")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: false })
    if (error) throw error
    return data
  },

  async upload(
    userId: string,
    entityType: AttachmentEntityType,
    entityId: string,
    file: File
  ): Promise<Attachment> {
    const ext = file.name.split(".").pop()
    const path = `${userId}/${entityType}/${entityId}/${crypto.randomUUID()}.${ext}`

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    })
    if (uploadError) throw uploadError

    const { data, error } = await supabase
      .from("attachments")
      .insert({
        user_id: userId,
        entity_type: entityType,
        entity_id: entityId,
        file_url: path,
        file_name: file.name,
        file_size: file.size,
      })
      .select("*")
      .single()

    if (error) {
      await supabase.storage.from(BUCKET).remove([path])
      throw error
    }

    return data
  },

  async getSignedUrl(path: string): Promise<string> {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 300)
    if (error) throw error
    return data.signedUrl
  },

  async remove(attachment: Attachment): Promise<void> {
    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove([attachment.file_url])
    if (storageError) throw storageError

    const { error } = await supabase.from("attachments").delete().eq("id", attachment.id)
    if (error) throw error
  },
}
