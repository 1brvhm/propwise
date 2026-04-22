import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { classifyMaintenanceRequest } from '@/lib/ai'
import { AgentRunner } from '@/lib/ai/agent-runner'

const BodySchema = z.object({
  request_text:         z.string().min(5).max(2000),
  deployed_agent_id:    z.string().uuid(),
  consulting_client_id: z.string().uuid(),
})

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-agent-secret')
  if (secret !== process.env.AGENTS_SECRET_KEY) {
    if (!req.cookies.get('sb-access-token') && !req.cookies.get('sb-auth-token')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { request_text, deployed_agent_id, consulting_client_id } = parsed.data

  const runner = new AgentRunner({
    deployedAgentId:    deployed_agent_id,
    consultingClientId: consulting_client_id,
    triggerType:        'webhook',
  })

  try {
    await runner.start()

    await runner.log(
      'info',
      'webhook_received',
      `Received: "${request_text.slice(0, 80)}${request_text.length > 80 ? '…' : ''}"`,
    )

    const analysis = await classifyMaintenanceRequest(request_text)

    const level =
      analysis.urgency === 'P1' ? 'error' :
      analysis.urgency === 'P2' ? 'warn'  : 'success'

    await runner.log(
      level,
      'triage_complete',
      `${analysis.urgency} · ${analysis.category} — ${analysis.action_taken}`,
    )

    await runner.complete(`${analysis.urgency} ${analysis.category}: ${analysis.action_taken}`)

    return NextResponse.json({ success: true, analysis, runId: runner.runIdOrNull })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    await runner.fail(msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
