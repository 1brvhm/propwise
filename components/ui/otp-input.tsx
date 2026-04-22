'use client'

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { otpContainerVariants, otpItemVariants } from '@/lib/utils/motion-variants'
import { cn } from '@/lib/utils/cn'

interface OTPInputProps {
  length?:    number
  onComplete: (otp: string) => void
  disabled?:  boolean
  error?:     boolean
}

export function OTPInput({ length = 6, onComplete, disabled = false, error = false }: OTPInputProps) {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(''))
  const inputRefs           = useRef<(HTMLInputElement | null)[]>([])

  function handleChange(index: number, value: string) {
    // Only accept single digit
    const digit = value.replace(/\D/g, '').slice(-1)
    if (!digit) return

    const next = [...digits]
    next[index] = digit
    setDigits(next)

    // Auto-focus next
    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }

    // Trigger onComplete when all filled
    if (next.every((d) => d !== '')) {
      onComplete(next.join(''))
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const next = [...digits]
      if (next[index]) {
        next[index] = ''
        setDigits(next)
      } else if (index > 0) {
        next[index - 1] = ''
        setDigits(next)
        inputRefs.current[index - 1]?.focus()
      }
    }
    if (e.key === 'ArrowLeft'  && index > 0)          inputRefs.current[index - 1]?.focus()
    if (e.key === 'ArrowRight' && index < length - 1) inputRefs.current[index + 1]?.focus()
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    const next   = [...digits]
    pasted.split('').forEach((char, i) => { next[i] = char })
    setDigits(next)
    const lastFilled = Math.min(pasted.length, length - 1)
    inputRefs.current[lastFilled]?.focus()
    if (next.every((d) => d !== '')) onComplete(next.join(''))
  }

  const isCompact = length > 6

  return (
    <motion.div
      className={cn('flex w-full', isCompact ? 'gap-1.5' : 'gap-3')}
      variants={otpContainerVariants}
      initial="hidden"
      animate="visible"
    >
      {digits.map((digit, index) => (
        <motion.input
          key={index}
          ref={(el) => { inputRefs.current[index] = el }}
          variants={otpItemVariants}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={index === 0 ? handlePaste : undefined}
          className={cn(
            'flex-1 min-w-0 text-center font-bold rounded-xl',
            'bg-slate-800 border-2 transition-all duration-150 outline-none',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            isCompact ? 'h-12 text-lg' : 'h-14 text-xl',
            error
              ? 'border-red-500 text-red-400'
              : digit
              ? 'border-emerald-500 text-emerald-400'
              : 'border-slate-700 text-slate-100 focus:border-emerald-500',
          )}
          aria-label={`OTP digit ${index + 1}`}
        />
      ))}
    </motion.div>
  )
}
