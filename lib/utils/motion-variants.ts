import type { Variants } from 'framer-motion'

// ============================================================
// PropWise — Shared Framer Motion Variants
// ============================================================

export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.4,
      ease: 'easeOut',
    },
  }),
}

export const staggerContainer: Variants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.08 } },
}

export const scaleIn: Variants = {
  hidden:  { opacity: 0, scale: 0.94 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: [0.34, 1.56, 0.64, 1] },
  },
}

export const slideInLeft: Variants = {
  hidden:  { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

export const slideInRight: Variants = {
  hidden:  { opacity: 0, x: 16 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

/** Used in dashboard layout's AnimatePresence for page transitions */
export const pageVariants: Variants = {
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  exit:    { opacity: 0, x:  8, transition: { duration: 0.2 } },
}

/** OTP digit box stagger */
export const otpContainerVariants: Variants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.05 } },
}

export const otpItemVariants: Variants = {
  hidden:  { opacity: 0, y: 20, scale: 0.9 },
  visible: { opacity: 1, y: 0,  scale: 1, transition: { duration: 0.3, ease: 'backOut' } },
}

/** Card hover — subtle lift */
export const cardHover = {
  y: -2,
  transition: { duration: 0.15, ease: 'easeOut' as const },
} as const

/** Button press */
export const buttonTap = { scale: 0.97 } as const
