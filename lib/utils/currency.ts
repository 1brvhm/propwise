// ============================================================
// PropWise — Currency & Number Formatting Utilities
// ============================================================

const USD = new Intl.NumberFormat('en-US', {
  style:                 'currency',
  currency:              'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const USDCents = new Intl.NumberFormat('en-US', {
  style:                 'currency',
  currency:              'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const compact = new Intl.NumberFormat('en-US', {
  notation:              'compact',
  maximumFractionDigits: 1,
})

export function formatCurrency(value: number): string {
  return USD.format(value)
}

export function formatCurrencyCents(value: number): string {
  return USDCents.format(value)
}

export function formatCompact(value: number): string {
  return compact.format(value)
}

export function formatCurrencyCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${compact.format(value / 1_000_000)}M`
  if (Math.abs(value) >= 1_000)     return `$${compact.format(value / 1_000)}K`
  return formatCurrency(value)
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}
