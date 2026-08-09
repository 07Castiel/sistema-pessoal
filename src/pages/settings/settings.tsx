import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { useTheme } from "next-themes"
import { Coins, Globe, Loader2, Monitor, Moon, Sun, Target } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useUpdateProfile, useUpdateFinancialGoals, useUpdatePassword } from "@/hooks/use-settings"
import { useMonthlySummariesQuery, currentMonthPoint } from "@/hooks/use-reports"
import { profileSchema, financialGoalsSchema, type ProfileFormValues, type FinancialGoalsFormValues } from "@/schemas/profile.schema"
import { resetPasswordSchema, type ResetPasswordFormValues } from "@/schemas/auth.schema"
import { formatCurrency, formatPercent, monthLabel } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CurrencyInput } from "@/components/shared/currency-input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

function getInitials(name: string | null | undefined, email: string | undefined) {
  if (name) {
    return name.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase()
  }
  return email?.slice(0, 2).toUpperCase() ?? "US"
}

const THEME_OPTIONS = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Automático", icon: Monitor },
] as const

export default function SettingsPage() {
  const { user, profile } = useAuth()
  const { theme, setTheme } = useTheme()

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: "", avatar_url: null },
    mode: "onBlur",
  })
  const updateProfile = useUpdateProfile()

  useEffect(() => {
    if (profile) {
      profileForm.reset({ full_name: profile.full_name ?? "", avatar_url: profile.avatar_url })
    }
  }, [profile, profileForm])

  const goalsForm = useForm<FinancialGoalsFormValues>({
    resolver: zodResolver(financialGoalsSchema),
    defaultValues: { monthly_goal: null, annual_goal: null },
  })
  const updateGoals = useUpdateFinancialGoals()

  useEffect(() => {
    if (profile) {
      goalsForm.reset({
        monthly_goal: profile.monthly_goal !== null ? Number(profile.monthly_goal) : null,
        annual_goal: profile.annual_goal !== null ? Number(profile.annual_goal) : null,
      })
    }
  }, [profile, goalsForm])

  const passwordForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  })
  const updatePassword = useUpdatePassword()

  const { data: monthlySummaries } = useMonthlySummariesQuery()
  const period = currentMonthPoint()
  const currentMonthSummary = (monthlySummaries ?? []).find(
    (m) => m.year === period.year && m.month === period.month
  )
  const monthlyGoal = profile?.monthly_goal !== null && profile?.monthly_goal !== undefined ? Number(profile.monthly_goal) : 0
  const monthlyResult = currentMonthSummary ? Number(currentMonthSummary.balance ?? 0) : 0
  const monthlyProgress = monthlyGoal > 0 ? Math.min(100, Math.max(0, (monthlyResult / monthlyGoal) * 100)) : 0

  function onSubmitProfile(values: ProfileFormValues) {
    updateProfile.mutate(values)
  }

  function onSubmitGoals(values: FinancialGoalsFormValues) {
    updateGoals.mutate(values)
  }

  function onSubmitPassword(values: ResetPasswordFormValues) {
    updatePassword.mutate(values.password, { onSuccess: () => passwordForm.reset() })
  }

  const watchedAvatar = useWatch({ control: profileForm.control, name: "avatar_url" })
  const watchedName = useWatch({ control: profileForm.control, name: "full_name" })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Perfil, preferências e segurança da conta</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Perfil</CardTitle>
          <CardDescription>Como seu nome e foto aparecem no sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar size="lg">
                  <AvatarImage src={watchedAvatar ?? undefined} />
                  <AvatarFallback>{getInitials(watchedName, user?.email)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{user?.email}</p>
                  <p className="text-xs text-muted-foreground">E-mail da conta (não editável aqui)</p>
                </div>
              </div>

              <FormField
                control={profileForm.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Seu nome" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={profileForm.control}
                name="avatar_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL da foto (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://..."
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={updateProfile.isPending}>
                {updateProfile.isPending && <Loader2 className="size-4 animate-spin" />}
                Salvar perfil
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aparência</CardTitle>
          <CardDescription>Tema visual do sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {THEME_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                type="button"
                variant={theme === opt.value ? "default" : "outline"}
                onClick={() => setTheme(opt.value)}
              >
                <opt.icon className="size-4" />
                {opt.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Metas financeiras</CardTitle>
          <CardDescription>Referências opcionais de quanto você pretende guardar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Form {...goalsForm}>
            <form onSubmit={goalsForm.handleSubmit(onSubmitGoals)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={goalsForm.control}
                  name="monthly_goal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta mensal</FormLabel>
                      <FormControl>
                        <CurrencyInput
                          value={field.value ?? 0}
                          onChange={(v) => field.onChange(v > 0 ? v : null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={goalsForm.control}
                  name="annual_goal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta anual</FormLabel>
                      <FormControl>
                        <CurrencyInput
                          value={field.value ?? 0}
                          onChange={(v) => field.onChange(v > 0 ? v : null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" disabled={updateGoals.isPending}>
                {updateGoals.isPending && <Loader2 className="size-4 animate-spin" />}
                Salvar metas
              </Button>
            </form>
          </Form>

          {monthlyGoal > 0 && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Target className="size-4 text-primary" />
                Progresso de {monthLabel(period.month)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Resultado líquido do mês: {formatCurrency(monthlyResult)} de {formatCurrency(monthlyGoal)}{" "}
                ({formatPercent(monthlyProgress, 0)})
              </p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-primary/20">
                <div
                  className={cn("h-full rounded-full", monthlyResult >= monthlyGoal ? "bg-success" : "bg-primary")}
                  style={{ width: `${monthlyProgress}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Segurança</CardTitle>
          <CardDescription>Alterar a senha da sua conta</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={passwordForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nova senha</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar nova senha</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" disabled={updatePassword.isPending}>
                {updatePassword.isPending && <Loader2 className="size-4 animate-spin" />}
                Alterar senha
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Outras preferências</CardTitle>
          <CardDescription>Sem personalização disponível nesta versão</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <Coins className="size-4" /> Moeda: Real brasileiro (BRL) — fixo, sem suporte a múltiplas moedas ainda.
          </p>
          <p className="flex items-center gap-2">
            <Globe className="size-4" /> Idioma: Português (Brasil) — fixo, sem suporte a outros idiomas ainda.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
