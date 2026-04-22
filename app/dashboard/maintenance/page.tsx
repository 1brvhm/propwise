'use client'

import { useState, useEffect, useCallback } from 'react'
import { Wrench, Plus, Clock, CheckCircle, Loader2, Pencil, Trash2, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { MetricCard } from '@/components/dashboard/metric-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NewTicketModal } from '@/components/maintenance/new-ticket-modal'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { getOrgId } from '@/lib/org/get-org'
import { scaleIn } from '@/lib/utils/motion-variants'
import type { TicketFormData } from '@/components/maintenance/new-ticket-modal'

type Ticket = {
  id:          string
  title:       string
  priority:    string
  ai_priority: string | null
  ai_category: string | null
  status:      string
  created_at:  string
  metadata:    Record<string, string> | null
}

const PRIORITY_VARIANT: Record<string, 'red' | 'orange' | 'gold' | 'slate'> = {
  P1: 'red', P2: 'orange', P3: 'gold', P4: 'slate',
}

const STATUS_OPTIONS = ['open', 'in_progress', 'dispatched', 'resolved', 'closed', 'cancelled']
const PRIORITY_OPTIONS = ['P1', 'P2', 'P3', 'P4']

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function EditTicketModal({
  ticket,
  onClose,
  onSave,
}: {
  ticket: Ticket
  onClose: () => void
  onSave: (id: string, status: string, priority: string) => Promise<void>
}) {
  const [status,   setStatus]   = useState(ticket.status)
  const [priority, setPriority] = useState(ticket.priority)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await onSave(ticket.id, status, priority)
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update ticket')
    } finally {
      setLoading(false)
    }
  }

  const statusColors: Record<string, string> = {
    open:        'border-emerald-500 text-emerald-400 bg-emerald-500/10',
    in_progress: 'border-blue-500   text-blue-400   bg-blue-500/10',
    dispatched:  'border-purple-500 text-purple-400 bg-purple-500/10',
    resolved:    'border-slate-500  text-slate-300  bg-slate-500/10',
    closed:      'border-slate-600  text-slate-500  bg-slate-600/10',
    cancelled:   'border-red-500    text-red-400    bg-red-500/10',
  }

  const priorityColors: Record<string, string> = {
    P1: 'border-red-500    text-red-400    bg-red-500/10',
    P2: 'border-orange-500 text-orange-400 bg-orange-500/10',
    P3: 'border-gold-500   text-gold-400   bg-gold-500/10',
    P4: 'border-slate-500  text-slate-400  bg-slate-500/10',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        variants={scaleIn} initial="hidden" animate="visible" exit="hidden"
        className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-card-glow overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Wrench className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Edit Ticket</h2>
              <p className="text-xs text-slate-500 truncate max-w-48">{ticket.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Status</label>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_OPTIONS.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`px-2 py-2 rounded-lg border text-xs font-medium transition-all capitalize ${
                    status === s
                      ? (statusColors[s] ?? 'border-emerald-500 text-emerald-400 bg-emerald-500/10')
                      : 'border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-400'
                  }`}
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Priority</label>
            <div className="grid grid-cols-4 gap-2">
              {PRIORITY_OPTIONS.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`px-2 py-2 rounded-lg border text-xs font-medium transition-all ${
                    priority === p
                      ? (priorityColors[p] ?? 'border-slate-500 text-slate-400')
                      : 'border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-400'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex items-center gap-3 pt-1">
            <Button type="button" variant="secondary" size="md" className="flex-1" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" size="md" loading={loading} className="flex-1">
              Save Changes
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export default function MaintenancePage() {
  const [tickets,       setTickets]       = useState<Ticket[]>([])
  const [loading,       setLoading]       = useState(true)
  const [modalOpen,     setModalOpen]     = useState(false)
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null)
  const [deletingId,    setDeletingId]    = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const loadTickets = useCallback(async () => {
    const supabase = getSupabaseBrowserClient()
    const { data } = await supabase
      .from('maintenance_tickets')
      .select('id, title, priority, ai_priority, ai_category, status, created_at, metadata')
      .order('created_at', { ascending: false })
    setTickets((data as Ticket[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadTickets() }, [loadTickets])

  const openCount   = tickets.filter(t => ['open','in_progress','dispatched'].includes(t.status)).length
  const p1Count     = tickets.filter(t => (t.ai_priority ?? t.priority) === 'P1' && t.status !== 'resolved' && t.status !== 'closed').length
  const p2Count     = tickets.filter(t => (t.ai_priority ?? t.priority) === 'P2' && t.status !== 'resolved' && t.status !== 'closed').length
  const resolved30d = tickets.filter(t => {
    if (!['resolved','closed'].includes(t.status)) return false
    return new Date(t.created_at) >= new Date(Date.now() - 30 * 86400_000)
  }).length

  async function handleCreateTicket(data: TicketFormData) {
    const supabase = getSupabaseBrowserClient()
    const orgId    = await getOrgId()

    const propertyName = data.property.trim()
    let propertyId: string

    const { data: existing } = await supabase
      .from('properties')
      .select('id')
      .eq('consulting_client_id', orgId)
      .ilike('name', propertyName)
      .maybeSingle()

    if (existing) {
      propertyId = existing.id
    } else {
      const { data: newProp, error: propErr } = await supabase
        .from('properties')
        .insert({ consulting_client_id: orgId, name: propertyName })
        .select('id')
        .single()
      if (propErr || !newProp) throw new Error(propErr?.message ?? 'Failed to save property')
      propertyId = newProp.id
    }

    const { data: ticket, error: ticketErr } = await supabase
      .from('maintenance_tickets')
      .insert({
        consulting_client_id: orgId,
        property_id:          propertyId,
        title:                data.title,
        description:          data.description,
        priority:             data.priority as 'P1' | 'P2' | 'P3' | 'P4',
        metadata:             { property_name: propertyName, unit: data.unit },
      })
      .select('id')
      .single()

    if (ticketErr || !ticket) throw new Error(ticketErr?.message ?? 'Failed to create ticket')
    await loadTickets()
  }

  async function handleSaveTicket(id: string, status: string, priority: string) {
    const supabase = getSupabaseBrowserClient()
    const { error } = await supabase
      .from('maintenance_tickets')
      .update({
        status:   status   as 'open' | 'in_progress' | 'dispatched' | 'resolved' | 'closed' | 'cancelled',
        priority: priority as 'P1' | 'P2' | 'P3' | 'P4',
      })
      .eq('id', id)
    if (error) throw new Error(error.message)
    await loadTickets()
  }

  async function handleDelete(id: string) {
    setDeleteLoading(true)
    const supabase = getSupabaseBrowserClient()
    const { error } = await supabase.from('maintenance_tickets').delete().eq('id', id)
    setDeleteLoading(false)
    setDeletingId(null)
    if (!error) await loadTickets()
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Maintenance Triage</h1>
          <p className="text-sm text-slate-400 mt-1">AI-powered classification and vendor dispatch.</p>
        </div>
        <Button size="md" onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4" />
          New Ticket
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard title="Open Tickets"   value={openCount}    icon={Wrench}      iconColor="emerald" index={0} loading={loading} />
        <MetricCard title="P1 Emergencies" value={p1Count}      icon={Wrench}      iconColor="red"     index={1} loading={loading} />
        <MetricCard title="P2 Urgent"      value={p2Count}      icon={Clock}       iconColor="gold"    index={2} loading={loading} />
        <MetricCard title="Resolved (30d)" value={resolved30d}  icon={CheckCircle} iconColor="emerald" index={3} loading={loading} />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-slate-100">All Tickets</h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-slate-600 animate-spin" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-5 text-center">
            <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center mb-4">
              <Wrench className="w-6 h-6 text-slate-600" />
            </div>
            <p className="text-sm font-medium text-slate-300">No maintenance tickets yet</p>
            <p className="text-xs text-slate-500 mt-1 mb-5 max-w-xs">
              Create your first ticket and let AI classify the priority and recommend the right contractor.
            </p>
            <Button size="md" onClick={() => setModalOpen(true)}>
              <Plus className="w-4 h-4" />
              Create first ticket
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {tickets.map(t => {
              const displayPriority = t.ai_priority ?? t.priority
              const meta = t.metadata as { property_name?: string; unit?: string } | null
              return (
                <div key={t.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant={PRIORITY_VARIANT[displayPriority] ?? 'slate'}>
                        {displayPriority}
                        {t.ai_priority && t.ai_priority !== t.priority ? ' (AI)' : ''}
                      </Badge>
                      {t.ai_category && (
                        <Badge variant="slate">{t.ai_category}</Badge>
                      )}
                      <Badge variant={t.status === 'open' ? 'emerald' : 'slate'}>
                        {t.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-slate-100 truncate">{t.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {meta?.property_name ?? 'Unknown property'}
                      {meta?.unit ? ` · ${meta.unit}` : ''}
                      {' · '}
                      {timeAgo(t.created_at)}
                    </p>
                  </div>

                  {deletingId === t.id ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-red-400">Delete?</span>
                      <button
                        onClick={() => handleDelete(t.id)}
                        disabled={deleteLoading}
                        className="text-xs font-medium text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setDeletingId(null)}
                        className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setEditingTicket(t)}
                        className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-all"
                        title="Edit ticket"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingId(t.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                        title="Delete ticket"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <NewTicketModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreateTicket}
      />

      <AnimatePresence>
        {editingTicket && (
          <EditTicketModal
            ticket={editingTicket}
            onClose={() => setEditingTicket(null)}
            onSave={handleSaveTicket}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
