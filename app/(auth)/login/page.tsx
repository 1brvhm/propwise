'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, ArrowRight, Shield, Zap, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { fadeUpVariants, staggerContainer } from '@/lib/utils/motion-variants'

type Mode = 'signin' | 'signup'

export default function LoginPage() {
  const router = useRouter()

  const [mode,            setMode]            = useState<Mode>('signin')
  const [email,           setEmail]           = useState('')
  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword,    setShowPassword]    = useState(false)
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState('')

  const supabase = getSupabaseBrowserClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      if (mode === 'signin') {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email:    email.trim().toLowerCase(),
          password,
        })
        if (authError) throw authError
        router.push('/dashboard')

      } else {
        const { error: authError } = await supabase.auth.signUp({
          email:    email.trim().toLowerCase(),
          password,
        })
        if (authError) throw authError
        router.push('/dashboard')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) { setError('Enter your email address first'); return }
    setLoading(true)
    await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    setError('')
    alert('Password reset link sent — check your inbox.')
  }

  function switchMode(newMode: Mode) {
    setMode(newMode)
    setError('')
    setPassword('')
    setConfirmPassword('')
  }

  const isSignUp = mode === 'signup'

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="w-full"
    >
      <motion.div
        variants={fadeUpVariants}
        className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-card-glow"
      >
        {/* Logo */}
        <motion.div variants={fadeUpVariants} custom={0} className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center shadow-card-glow">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
              <path d="M11 2L3 7v13h6v-7h4v7h6V7L11 2z" fill="white" fillOpacity="0.95" />
            </svg>
          </div>
          <div>
            <span className="text-xl font-bold text-gradient-brand">PropWise</span>
            <p className="text-xs text-slate-500 -mt-0.5">Property Intelligence Platform</p>
          </div>
        </motion.div>

        {/* Mode Toggle */}
        <motion.div variants={fadeUpVariants} custom={1} className="flex bg-slate-800 rounded-xl p-1 mb-6">
          {(['signin', 'signup'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                mode === m
                  ? 'bg-slate-700 text-slate-100 shadow-sm'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {m === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </motion.div>

        {/* Headline */}
        <motion.div variants={fadeUpVariants} custom={2} className="mb-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              <h1 className="text-2xl font-bold text-slate-50 tracking-tight">
                {isSignUp ? 'Create your account' : 'Welcome back'}
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                {isSignUp
                  ? 'Start managing your portfolio with AI.'
                  : 'Sign in to your PropWise dashboard.'}
              </p>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-slate-400 mb-1.5">
              Work email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              prefix={<Mail className="w-4 h-4" />}
              disabled={loading}
              autoComplete="email"
              autoFocus
              required
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-xs font-medium text-slate-400 mb-1.5">
              Password
            </label>
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder={isSignUp ? 'Min. 8 characters' : '••••••••'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              prefix={<Lock className="w-4 h-4" />}
              suffix={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="pointer-events-auto text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              disabled={loading}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              required
            />
          </div>

          {/* Confirm Password — sign up only */}
          <AnimatePresence>
            {isSignUp && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <label htmlFor="confirm" className="block text-xs font-medium text-slate-400 mb-1.5">
                  Confirm password
                </label>
                <Input
                  id="confirm"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  prefix={<Lock className="w-4 h-4" />}
                  error={!!confirmPassword && confirmPassword !== password}
                  disabled={loading}
                  autoComplete="new-password"
                />
                {confirmPassword && confirmPassword !== password && (
                  <p className="mt-1 text-xs text-red-400">Passwords do not match</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
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
            loading={loading}
            disabled={!email.trim() || !password || (isSignUp && !confirmPassword)}
            className="w-full"
          >
            {isSignUp ? 'Create account' : 'Sign in'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </Button>

          {!isSignUp && (
            <p className="text-center">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs text-slate-500 hover:text-emerald-500 transition-colors"
              >
                Forgot your password?
              </button>
            </p>
          )}
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-800" />
          <span className="text-xs text-slate-600">Enterprise-grade security</span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        {/* Feature pills */}
        <div className="flex items-center justify-center gap-4">
          {[
            { icon: Shield,     label: 'SOC 2 Ready'    },
            { icon: Zap,        label: 'AI-Powered'     },
            { icon: TrendingUp, label: 'Live Forecasts' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-1.5 text-xs text-slate-500">
              <Icon className="w-3.5 h-3.5 text-emerald-600" />
              {label}
            </div>
          ))}
        </div>
      </motion.div>

      <p className="text-center text-xs text-slate-600 mt-4">
        By continuing you agree to our{' '}
        <span className="text-emerald-700 cursor-pointer hover:text-emerald-500 transition-colors">
          Terms of Service
        </span>{' '}
        and{' '}
        <span className="text-emerald-700 cursor-pointer hover:text-emerald-500 transition-colors">
          Privacy Policy
        </span>
      </p>
    </motion.div>
  )
}
