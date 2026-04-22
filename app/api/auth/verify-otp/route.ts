// OTP verification is handled client-side via supabase.auth.verifyOtp()
// This route is kept as a no-op for backwards compatibility.
import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: 'Use the Supabase client directly for OTP verification' },
    { status: 410 },
  )
}
