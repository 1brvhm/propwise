import { NextResponse } from 'next/server'

// Superseded by /api/onboarding
export async function POST() {
  return NextResponse.json({ error: 'Use /api/onboarding instead' }, { status: 410 })
}
