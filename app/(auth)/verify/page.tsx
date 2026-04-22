'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Mail, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { OTPInput } from '@/components/ui/otp-input'
import { Spinner } from '@/components/ui/spinner'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { fadeUpVariants, staggerContainer } from '@/lib/utils/motion-variants'

type OtpType = 'signup' | 'recovery' | 'invite' | 'magiclink' | 'email'

function VerifyContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const email        = searchParams.get('email') ?? ''
  const type         = (searchParams.get('type') ?? 'signup') as OtpType

  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [resendTimer, setResendTimer] = useState(60)
  const [canResend,   setCanResend]   = useState(false)
  const [resending,   setResending]   = useState(false)

  const supabase = getSupabaseBrowserClient()

  // Countdown
  useEffect(() => {
    if (resendTimer <= 0) { setCanResend(true); return }
    const id = setTimeout(() => setResendTimer((t) => t - 1), 1000)
    return () => clearTimeout(id)
  }, [resendTimer])

  const handleComplete = useCallback(async (otp: string) => {
    setLoading(true)
    setError('')

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type,
    })

    if (verifyError) {
      setError(verifyError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }, [email, type, supabase, router])

  async function handleResend() {
    if (!canResend || resending) return
    setCanResend(false)
    setResendTimer(60)
    setError('')
    setResending(true)

    await supabase.auth.resend({ type: 'signup', email })

    setResending(false)
  }

  if (!email) {
    return (
      <div className="text-center text-slate-400 py-8">
        <p className="mb-4">No email address provided.</p>
        <Link href="/login" className="text-emerald-500 hover:text-emerald-400 text-sm">
          Back to login
        </Link>
      </div>
    )
  }

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
        {/* Back */}
        <motion.div variants={fadeUpVariants} custom={0} className="mb-6">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to login
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div variants={fadeUpVariants} custom={1} className="mb-8">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
            <Mail className="w-5 h-5 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-50 tracking-tight">
            Check your email
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            We sent an 8-digit code to{' '}
            <span className="text-emerald-400 font-medium">{email}</span>
          </p>
        </motion.div>

        {/* OTP Input */}
        <motion.div variants={fadeUpVariants} custom={2} className="mb-6">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <div className="flex items-center gap-3 text-slate-400">
                <Spinner size="sm" />
                <span className="text-sm">Verifying code...</span>
              </div>
            </div>
          ) : (
            <OTPInput
              length={8}
              onComplete={handleComplete}
              disabled={loading}
              error={!!error}
            />
          )}

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 text-sm text-red-400 text-center"
            >
              {error} — please try again.
            </motion.p>
          )}
        </motion.div>

        {/* Resend */}
        <motion.div variants={fadeUpVariants} custom={3} className="text-center">
          <p className="text-sm text-slate-500">
            Didn&apos;t receive a code?{' '}
            {canResend ? (
              <button
                onClick={handleResend}
                disabled={resending}
                className="text-emerald-500 hover:text-emerald-400 font-medium transition-colors disabled:opacity-50"
              >
                {resending ? 'Sending...' : 'Resend code'}
              </button>
            ) : (
              <span className="text-slate-600">
                Resend in{' '}
                <span className="text-gold-500 tabular-nums font-medium">{resendTimer}s</span>
              </span>
            )}
          </p>
        </motion.div>

        {/* Help text */}
        <motion.div
          variants={fadeUpVariants}
          custom={4}
          className="mt-6 p-3 bg-slate-800/50 rounded-lg"
        >
          <p className="text-xs text-slate-500 text-center">
            Check your spam folder if you don&apos;t see it within a minute.
            Codes expire after 1 hour.
          </p>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  )
}
