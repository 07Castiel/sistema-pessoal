import { attachmentsRepository } from "@/repositories/attachments.repository"

export const attachmentsService = {
  list: attachmentsRepository.list,
  upload: attachmentsRepository.upload,
  getSignedUrl: attachmentsRepository.getSignedUrl,
  remove: attachmentsRepository.remove,
}
