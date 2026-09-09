'use client'

import { useEffect, useState } from 'react'
import { signIn } from 'next-auth/react'
import { Building2, CheckCircle2, Loader2, Warehouse } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { COPYRIGHT_NOTICE } from '@/lib/ownership'

interface Props { token: string }

const emptyForm = {
  empresaNombre: '', nit: '', direccion: '', telefono: '', empresaEmail: '',
  adminNombre: '', adminEmail: '', password: '', confirmPassword: '',
}

export function CompanyRegistrationPage({ token }: Props) {
  const [form, setForm] = useState(emptyForm)
  const [plan, setPlan] = useState('')
  const [checking, setChecking] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [invalid, setInvalid] = useState('')
  const [error, setError] = useState('')
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    fetch(`/api/auth/company-registration?token=${encodeURIComponent(token)}`)
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error)
        setPlan(data.plan)
      })
      .catch((err) => setInvalid(err.message || 'El enlace no es válido'))
      .finally(() => setChecking(false))
  }, [token])

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }
    setSubmitting(true)
    try {
      const response = await fetch('/api/auth/company-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, token }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo completar el registro')
      setCompleted(true)
      const login = await signIn('credentials', { email: form.adminEmail, password: form.password, redirect: false })
      if (!login?.error) window.location.href = '/'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar el registro')
    } finally {
      setSubmitting(false)
    }
  }

  if (checking) return <RegistrationShell><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /><p>Validando invitación...</p></RegistrationShell>
  if (invalid) return <RegistrationShell><p className="font-semibold text-red-600">Enlace no disponible</p><p className="text-sm text-muted-foreground text-center">{invalid}</p><Button variant="outline" onClick={() => { window.location.href = '/' }}>Ir al inicio</Button></RegistrationShell>
  if (completed) return <RegistrationShell><CheckCircle2 className="h-12 w-12 text-emerald-600" /><p className="font-semibold">Empresa registrada correctamente</p><p className="text-sm text-muted-foreground">Iniciando sesión...</p></RegistrationShell>

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-emerald-50/30 to-teal-50/40 dark:via-emerald-950/10 dark:to-teal-950/20 p-4 py-8">
      <Card className="mx-auto max-w-2xl shadow-xl border-border/50 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />
        <CardContent className="p-6 sm:p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600"><Warehouse className="h-7 w-7 text-white" /></div>
            <h1 className="text-2xl font-bold">Registra tu empresa</h1>
            <p className="mt-1 text-sm text-muted-foreground">Completa el registro para comenzar a usar WMS Repuestos.</p>
            <p className="mt-2 text-sm font-medium capitalize text-emerald-700 dark:text-emerald-300">Plan asignado: {plan}</p>
          </div>
          <form onSubmit={submit} className="space-y-5">
            <section className="space-y-4 rounded-xl border p-4">
              <h2 className="flex items-center gap-2 font-semibold"><Building2 className="h-4 w-4" /> Datos de la empresa</h2>
              <Field label="Nombre de la empresa *"><Input value={form.empresaNombre} onChange={(e) => update('empresaNombre', e.target.value)} required minLength={2} /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="NIT"><Input value={form.nit} onChange={(e) => update('nit', e.target.value)} /></Field>
                <Field label="Email empresarial"><Input type="email" value={form.empresaEmail} onChange={(e) => update('empresaEmail', e.target.value)} /></Field>
                <Field label="Dirección"><Input value={form.direccion} onChange={(e) => update('direccion', e.target.value)} /></Field>
                <Field label="Teléfono"><Input value={form.telefono} onChange={(e) => update('telefono', e.target.value)} /></Field>
              </div>
            </section>
            <section className="space-y-4 rounded-xl border p-4">
              <h2 className="font-semibold">Cuenta del propietario</h2>
              <Field label="Nombre completo *"><Input value={form.adminNombre} onChange={(e) => update('adminNombre', e.target.value)} required minLength={2} /></Field>
              <Field label="Email de acceso *"><Input type="email" value={form.adminEmail} onChange={(e) => update('adminEmail', e.target.value)} required /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Contraseña *"><Input type="password" value={form.password} onChange={(e) => update('password', e.target.value)} required minLength={8} /></Field>
                <Field label="Confirmar contraseña *"><Input type="password" value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} required minLength={8} /></Field>
              </div>
            </section>
            {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{submitting ? 'Creando empresa...' : 'Finalizar registro'}</Button>
          </form>
          <p className="mt-6 text-center text-[11px] text-muted-foreground">{COPYRIGHT_NOTICE}</p>
        </CardContent>
      </Card>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>
}

function RegistrationShell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex items-center justify-center p-4"><Card className="w-full max-w-md"><CardContent className="p-8 flex flex-col items-center gap-4">{children}</CardContent></Card></div>
}

