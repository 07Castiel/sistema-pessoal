import { auditLogsRepository } from "@/repositories/audit-logs.repository"

export const auditService = {
  listForRecord: auditLogsRepository.listForRecord,

  async logLogin(userId: string) {
    await auditLogsRepository.logEvent(userId, "login", "auth")
  },
  async logLogout(userId: string) {
    await auditLogsRepository.logEvent(userId, "logout", "auth")
  },
  async logPasswordResetRequested(userId: string) {
    await auditLogsRepository.logEvent(userId, "password_reset_requested", "auth")
  },
  async logPasswordChanged(userId: string) {
    await auditLogsRepository.logEvent(userId, "password_changed", "auth")
  },
}
