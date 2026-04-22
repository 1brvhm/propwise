import { NextResponse } from 'next/server'
import { z } from 'zod'
import { callClaudeJSON } from '@/lib/ai/claude'
import {
  MAINTENANCE_SYSTEM_PROMPT,
  buildMaintenanceTriageMessages,
} from '@/lib/ai/prompts/maintenance-triage'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import type { MaintenanceClassification } from '@/types/domain'

const schema = z.object({
  title:         z.string().min(1).max(200),
  description:   z.string().min(1).max(2000),
  property_type: z.string().optional(),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id }  = await params
    const body    = await request.json()
    const parsed  = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid request' },
        { status: 400 },
      )
    }

    const { title, description, property_type = 'residential' } = parsed.data

    const messages       = buildMaintenanceTriageMessages(title, description, property_type)
    const response       = await callClaudeJSON<MaintenanceClassification>(messages, {
      systemPrompt: MAINTENANCE_SYSTEM_PROMPT,
      maxTokens:    512,
      temperature:  0,
    })
    const classification = response.content

    const supabase = await getSupabaseServerClient()
    await supabase.from('maintenance_tickets').update({
      ai_category:  classification.category,
      ai_priority:  classification.priority as 'P1' | 'P2' | 'P3' | 'P4',
      ai_reasoning: classification.reasoning,
    }).eq('id', id)

    return NextResponse.json({
      data: {
        ticket_id: id,
        classification,
        usage: { model: response.model, costUsd: response.usage.costUsd, latencyMs: response.latencyMs },
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Classification failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
