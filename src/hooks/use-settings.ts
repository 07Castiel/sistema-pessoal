import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { settingsService } from "@/services/settings.service"
import { auditService } from "@/services/audit.service"
import { useAuth } from "@/hooks/use-auth"
import { getErrorMessage } from "@/lib/errors"
import type { ProfileFormValues, FinancialGoalsFormValues } from "@/schemas/profile.schema"

/**
 * `profile` não vive no cache do TanStack Query — é estado do
 * `AuthProvider` (carregado uma vez por sessão). Por isso a invalidação
 * aqui é `refreshProfile()`, não `queryClient.invalidateQueries`.
 */
export function useUpdateProfile() {
  const { user, refreshProfile } = useAuth()

  return useMutation({
    mutationFn: (values: ProfileFormValues) => settingsService.updateProfile(user!.id, values),
    onSuccess: async () => {
      await refreshProfile()
      toast.success("Perfil atualizado com sucesso!")
    },
    onError: (error) => {
      toast.error("Não foi possível atualizar o perfil", { description: getErrorMessage(error) })
    },
  })
}

export function useUpdateFinancialGoals() {
  const { user, refreshProfile } = useAuth()

  return useMutation({
    mutationFn: (values: FinancialGoalsFormValues) =>
      settingsService.updateFinancialGoals(user!.id, values),
    onSuccess: async () => {
      await refreshProfile()
      toast.success("Metas financeiras atualizadas com sucesso!")
    },
    onError: (error) => {
      toast.error("Não foi possível atualizar as metas", { description: getErrorMessage(error) })
    },
  })
}

export function useUpdatePassword() {
  const { user, updatePassword } = useAuth()

  return useMutation({
    mutationFn: (password: string) => updatePassword(password),
    onSuccess: ({ error }) => {
      if (error) {
        toast.error("Não foi possível alterar a senha", { description: error })
        return
      }
      if (user) auditService.logPasswordChanged(user.id).catch(() => {})
      toast.success("Senha alterada com sucesso!")
    },
    onError: (error) => {
      toast.error("Não foi possível alterar a senha", { description: getErrorMessage(error) })
    },
  })
}
