'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Building2, User, ArrowRight, CheckCircle2, Bot, Zap, TrendingUp, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const AGENTS = [
  { label: 'Maintenance Triage',    color: 'text-red-400',     dot: 'bg-red-500'     },
  { label: 'Tenant Retention',      color: 'text-emerald-400', dot: 'bg-emerald-500' },
  { label: 'Contractor Dispatch',   color: 'text-yellow-400',  dot: 'bg-yellow-500'  },
  { label: 'Cash Flow Forecasting', color: 'text-blue-400',    dot: 'bg-blue-500'    },
]

type Step = 'form' | 'loading' | 'done'

export default function OnboardingPage() {
  const router = useRouter()

  const [step,        setStep]        = useState<Step>('form')
  const [companyName, setCompanyName] = useState('')
  const [fullName,    setFullName]    = useState('')
  const [error,       setError]       = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!companyName.trim()) return
    setError('')
    setStep('loading')

    try {
      const res = await fetch('/api/onboarding', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ companyName: companyName.trim(), fullName: fullName.trim() || undefined }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Something went wrong')
        setStep('form')
        return
      }

      setStep('done')
      setTimeout(() => router.push('/dashboard'), 2000)

    } catch {
      setError('Network error — please try again')
      setStep('form')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden">

      {/* Ambient glows */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #047857 0%, transparent 70%)' }} />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #b45309 0%, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(16,185,129,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.5) 1px, transparent 1px)',
            backgroundSize:  '48px 48px',
          }} />
      </div>

      <div className="relative z-10 w-full max-w-lg px-4">
        <AnimatePresence mode="wait">

          {/* ── Form step ─────────────────────────────────────── */}
          {step === 'form' && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
            >
              {/* Logo */}
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-yellow-600 flex items-center justify-center shadow-lg">
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <path d="M11 2L3 7v13h6v-7h4v7h6V7L11 2z" fill="white" fillOpacity="0.95" />
                  </svg>
                </div>
                <div>
                  <span className="text-xl font-bold text-slate-50">PropWise</span>
                  <p className="text-xs text-slate-500 -mt-0.5">AI Command Center</p>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-[0_0_0_1px_rgba(16,185,129,0.1),0_8px_32px_rgba(0,0,0,0.4)]">

                {/* Header */}
                <div className="mb-8">
                  <h1 className="text-2xl font-bold text-slate-50 tracking-tight">
                    Set up your workspace
                  </h1>
                  <p className="text-slate-400 text-sm mt-1.5">
                    This takes 30 seconds. Your AI agents will be ready instantly.
                  </p>
                </div>

                {/* Agent preview */}
                <div className="mb-8 grid grid-cols-2 gap-2">
                  {AGENTS.map((a) => (
                    <div key={a.label} className="flex items-center gap-2 bg-slate-800/60 rounded-lg px-3 py-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${a.dot} animate-pulse`} />
                      <span className={`text-xs font-medium ${a.color}`}>{a.label}</span>
                    </div>
                  ))}
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Your name
                    </label>
                    <Input
                      placeholder="Jane Smith"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      prefix={<User className="w-4 h-4" />}
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Company name <span className="text-red-400">*</span>
                    </label>
                    <Input
                      placeholder="Acme Property Management"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      prefix={<Building2 className="w-4 h-4" />}
                      required
                    />
                    <p className="text-xs text-slate-600 mt-1.5">
                      This is the name shown on your dashboard.
                    </p>
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
                      >
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <Button
                    type="submit"
                    size="lg"
                    disabled={!companyName.trim()}
                    className="w-full mt-2"
                  >
                    Launch my command center
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </form>
              </div>

              {/* Trust signals */}
              <div className="flex items-center justify-center gap-6 mt-5">
                {[
                  { icon: Shield,     label: 'End-to-end encrypted' },
                  { icon: Bot,        label: '4 AI agents included'  },
                  { icon: Zap,        label: 'Live in seconds'        },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-1.5 text-xs text-slate-600">
                    <Icon className="w-3.5 h-3.5 text-emerald-700" />
                    {label}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Loading step ──────────────────────────────────── */}
          {step === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
                <Bot className="w-7 h-7 text-emerald-400 animate-pulse" />
              </div>
              <h2 className="text-xl font-bold text-slate-50 mb-2">Setting up your workspace…</h2>
              <p className="text-slate-500 text-sm mb-8">Deploying your AI agents</p>
              <div className="flex flex-col gap-2 w-64">
                {AGENTS.map((a, i) => (
                  <motion.div
                    key={a.label}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.18 }}
                    className="flex items-center gap-2.5 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2"
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${a.dot} animate-pulse`} />
                    <span className={`text-xs font-medium ${a.color}`}>{a.label}</span>
                    <TrendingUp className="w-3 h-3 text-slate-600 ml-auto" />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Done step ─────────────────────────────────────── */}
          {step === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-6"
              >
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </motion.div>
              <h2 className="text-2xl font-bold text-slate-50 mb-2">You&apos;re all set!</h2>
              <p className="text-slate-400 text-sm">Taking you to your dashboard…</p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
