import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import logo from '@/assets/miacargo-logo.svg'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { useAuth } from '@/contexts/AuthContext'
import { getHomePath } from '@/constants/navigation'
import { loginSchema, type LoginFormValues } from '@/schemas'
import type { UserRole } from '@/types'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'

export function LoginPage() {
  const { login, loginAsRole } = useAuth()
  const navigate = useNavigate()
  const [loadingRole, setLoadingRole] = useState<UserRole | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: 'admin',
      password: 'demo123',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      const session = await login(values.username, values.password)
      toast.success(`Bienvenido, ${session.name}`)
      navigate(getHomePath(session.role))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo iniciar sesión')
    }
  })

  const quickLogin = async (role: UserRole) => {
    try {
      setLoadingRole(role)
      const session = await loginAsRole(role)
      toast.success(`Sesión iniciada como ${session.name}`)
      navigate(getHomePath(session.role))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error de acceso')
    } finally {
      setLoadingRole(null)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-secondary px-4 py-10">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle className="border border-white/20 text-white hover:bg-white/10" />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(32,185,181,0.25),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(32,185,181,0.12),transparent_35%)]" />
      <div className="relative z-10 grid w-full max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="hidden text-white lg:flex lg:flex-col lg:justify-center">
          <div className="mb-6 flex h-20 items-center lg:h-24">
            <img
              src={logo}
              alt="Miacargo"
              className="h-12 w-auto max-w-[320px] object-contain object-left lg:h-14"
            />
          </div>
          <h1 className="text-4xl font-bold leading-tight">
            Operación logística
            <br />
            con trazabilidad total
          </h1>
          <p className="mt-4 max-w-md text-white/70">
            Paquetes, repartos, incidencias y entregas de última milla en un solo lugar.
          </p>
        </div>

        <Card className="animate-slide-up border-0 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-text-primary">Iniciar sesión</h2>
            <p className="mt-1 text-sm text-text-secondary">Ingresá con tu usuario y contraseña.</p>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            <Input label="Usuario" autoComplete="username" error={errors.username?.message} {...register('username')} />
            <Input
              label="Contraseña"
              type="password"
              error={errors.password?.message}
              {...register('password')}
            />
            <Button type="submit" className="w-full" loading={isSubmitting}>
              Ingresar
            </Button>
          </form>

          <div className="mt-6 space-y-2">
            <p className="text-xs font-semibold tracking-wide text-text-muted uppercase">
              Accesos rápidos
            </p>
            <Button
              variant="secondary"
              className="w-full"
              loading={loadingRole === 'admin'}
              onClick={() => void quickLogin('admin')}
            >
              Entrar como administrador
            </Button>
            <Button
              variant="outline"
              className="w-full"
              loading={loadingRole === 'operator'}
              onClick={() => void quickLogin('operator')}
            >
              Entrar como operador
            </Button>
            <Button
              variant="outline"
              className="w-full"
              loading={loadingRole === 'reader'}
              onClick={() => void quickLogin('reader')}
            >
              Entrar como lector
            </Button>
            <Button
              variant="outline"
              className="w-full"
              loading={loadingRole === 'driver'}
              onClick={() => void quickLogin('driver')}
            >
              Entrar como chofer
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
