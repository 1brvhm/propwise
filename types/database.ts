// ============================================================
// PropWise — Supabase Database Types  (Agency Schema v2)
// Regenerate: npx supabase gen types typescript --project-id coorxsixkfrpdgoubzjx > types/database.ts
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {

      // ── Agency core ──────────────────────────────────────────
      consulting_clients: {
        Row: {
          id:            string
          name:          string
          slug:          string
          contact_email: string | null
          contact_name:  string | null
          industry:      string
          status:        'active' | 'inactive' | 'trial' | 'churned'
          plan:          'standard' | 'professional' | 'enterprise'
          settings:      Json
          onboarded_at:  string | null
          created_at:    string
          updated_at:    string
        }
        Insert: {
          id?:           string
          name:          string
          slug:          string
          contact_email?: string | null
          contact_name?:  string | null
          industry?:      string
          status?:        'active' | 'inactive' | 'trial' | 'churned'
          plan?:          'standard' | 'professional' | 'enterprise'
          settings?:      Json
          onboarded_at?:  string | null
          created_at?:    string
          updated_at?:    string
        }
        Update: {
          id?:           string
          name?:         string
          slug?:         string
          contact_email?: string | null
          contact_name?:  string | null
          industry?:      string
          status?:        'active' | 'inactive' | 'trial' | 'churned'
          plan?:          'standard' | 'professional' | 'enterprise'
          settings?:      Json
          onboarded_at?:  string | null
          updated_at?:    string
        }
        Relationships: []
      }

      client_users: {
        Row: {
          id:                   string
          consulting_client_id: string
          user_id:              string
          role:                 'viewer' | 'manager' | 'admin'
          created_at:           string
        }
        Insert: {
          id?:                  string
          consulting_client_id: string
          user_id:              string
          role?:                'viewer' | 'manager' | 'admin'
          created_at?:          string
        }
        Update: {
          role?: 'viewer' | 'manager' | 'admin'
        }
        Relationships: [
          { foreignKeyName: 'client_users_consulting_client_id_fkey'; columns: ['consulting_client_id']; referencedRelation: 'consulting_clients'; referencedColumns: ['id'] }
        ]
      }

      deployed_agents: {
        Row: {
          id:                   string
          consulting_client_id: string
          agent_type:           'maintenance_triage' | 'tenant_retention' | 'contractor_dispatch' | 'cash_flow_forecasting'
          display_name:         string
          description:          string | null
          model:                string
          status:               'active' | 'paused' | 'error' | 'inactive'
          config:               Json
          schedule_cron:        string | null
          last_run_at:          string | null
          next_run_at:          string | null
          total_runs:           number
          total_cost_usd:       number
          created_at:           string
          updated_at:           string
        }
        Insert: {
          id?:                  string
          consulting_client_id: string
          agent_type:           'maintenance_triage' | 'tenant_retention' | 'contractor_dispatch' | 'cash_flow_forecasting'
          display_name:         string
          description?:         string | null
          model?:               string
          status?:              'active' | 'paused' | 'error' | 'inactive'
          config?:              Json
          schedule_cron?:       string | null
          last_run_at?:         string | null
          next_run_at?:         string | null
          total_runs?:          number
          total_cost_usd?:      number
          created_at?:          string
          updated_at?:          string
        }
        Update: {
          display_name?:   string
          description?:    string | null
          status?:         'active' | 'paused' | 'error' | 'inactive'
          config?:         Json
          schedule_cron?:  string | null
          last_run_at?:    string | null
          next_run_at?:    string | null
          total_runs?:     number
          total_cost_usd?: number
          updated_at?:     string
        }
        Relationships: [
          { foreignKeyName: 'deployed_agents_consulting_client_id_fkey'; columns: ['consulting_client_id']; referencedRelation: 'consulting_clients'; referencedColumns: ['id'] }
        ]
      }

      agent_runs: {
        Row: {
          id:                   string
          deployed_agent_id:    string
          consulting_client_id: string
          status:               'running' | 'completed' | 'failed' | 'cancelled'
          trigger_type:         'scheduled' | 'manual' | 'webhook' | 'event'
          started_at:           string
          completed_at:         string | null
          duration_ms:          number | null
          total_tokens:         number
          total_cost_usd:       number
          items_processed:      number
          items_actioned:       number
          error_message:        string | null
          summary:              string | null
          metadata:             Json
        }
        Insert: {
          id?:                  string
          deployed_agent_id:    string
          consulting_client_id: string
          status?:              'running' | 'completed' | 'failed' | 'cancelled'
          trigger_type?:        'scheduled' | 'manual' | 'webhook' | 'event'
          started_at?:          string
          completed_at?:        string | null
          total_tokens?:        number
          total_cost_usd?:      number
          items_processed?:     number
          items_actioned?:      number
          error_message?:       string | null
          summary?:             string | null
          metadata?:            Json
        }
        Update: {
          status?:          'running' | 'completed' | 'failed' | 'cancelled'
          completed_at?:    string | null
          total_tokens?:    number
          total_cost_usd?:  number
          items_processed?: number
          items_actioned?:  number
          error_message?:   string | null
          summary?:         string | null
        }
        Relationships: [
          { foreignKeyName: 'agent_runs_deployed_agent_id_fkey'; columns: ['deployed_agent_id']; referencedRelation: 'deployed_agents'; referencedColumns: ['id'] },
          { foreignKeyName: 'agent_runs_consulting_client_id_fkey'; columns: ['consulting_client_id']; referencedRelation: 'consulting_clients'; referencedColumns: ['id'] }
        ]
      }

      execution_logs: {
        Row: {
          id:                   string
          agent_run_id:         string
          consulting_client_id: string
          deployed_agent_id:    string
          sequence_num:         number
          log_level:            'debug' | 'info' | 'warn' | 'error' | 'success'
          event_type:           string
          message:              string
          entity_type:          string | null
          entity_id:            string | null
          entity_label:         string | null
          ai_model:             string | null
          prompt_tokens:        number | null
          completion_tokens:    number | null
          cost_usd:             number | null
          latency_ms:           number | null
          input_snapshot:       Json | null
          output_snapshot:      Json | null
          created_at:           string
        }
        Insert: {
          id?:                  string
          agent_run_id:         string
          consulting_client_id: string
          deployed_agent_id:    string
          sequence_num:         number
          log_level?:           'debug' | 'info' | 'warn' | 'error' | 'success'
          event_type:           string
          message:              string
          entity_type?:         string | null
          entity_id?:           string | null
          entity_label?:        string | null
          ai_model?:            string | null
          prompt_tokens?:       number | null
          completion_tokens?:   number | null
          cost_usd?:            number | null
          latency_ms?:          number | null
          input_snapshot?:      Json | null
          output_snapshot?:     Json | null
          created_at?:          string
        }
        Update: Record<string, never>
        Relationships: [
          { foreignKeyName: 'execution_logs_agent_run_id_fkey'; columns: ['agent_run_id']; referencedRelation: 'agent_runs'; referencedColumns: ['id'] },
          { foreignKeyName: 'execution_logs_deployed_agent_id_fkey'; columns: ['deployed_agent_id']; referencedRelation: 'deployed_agents'; referencedColumns: ['id'] }
        ]
      }

      pending_approvals: {
        Row: {
          id:                   string
          agent_run_id:         string
          consulting_client_id: string
          deployed_agent_id:    string
          approval_type:        'vendor_dispatch' | 'invoice_payment' | 'tenant_outreach' | 'maintenance_escalation' | 'budget_exception'
          title:                string
          description:          string
          ai_recommendation:    string
          ai_confidence:        number | null
          amount_usd:           number | null
          entity_type:          string | null
          entity_id:            string | null
          entity_label:         string | null
          payload:              Json
          status:               'pending' | 'approved' | 'rejected' | 'expired'
          reviewed_by:          string | null
          reviewed_at:          string | null
          review_note:          string | null
          expires_at:           string | null
          created_at:           string
          updated_at:           string
        }
        Insert: {
          id?:                  string
          agent_run_id:         string
          consulting_client_id: string
          deployed_agent_id:    string
          approval_type:        'vendor_dispatch' | 'invoice_payment' | 'tenant_outreach' | 'maintenance_escalation' | 'budget_exception'
          title:                string
          description:          string
          ai_recommendation:    string
          ai_confidence?:       number | null
          amount_usd?:          number | null
          entity_type?:         string | null
          entity_id?:           string | null
          entity_label?:        string | null
          payload?:             Json
          status?:              'pending' | 'approved' | 'rejected' | 'expired'
          reviewed_by?:         string | null
          reviewed_at?:         string | null
          review_note?:         string | null
          expires_at?:          string | null
        }
        Update: {
          status?:      'pending' | 'approved' | 'rejected' | 'expired'
          reviewed_by?: string | null
          reviewed_at?: string | null
          review_note?: string | null
        }
        Relationships: []
      }

      outcome_metrics: {
        Row: {
          id:                    string
          consulting_client_id:  string
          deployed_agent_id:     string
          period_start:          string
          period_end:            string
          metric_type:           string
          metric_value:          number
          metric_unit:           string | null
          compared_to_baseline:  number | null
          improvement_pct:       number | null
          created_at:            string
        }
        Insert: {
          id?:                   string
          consulting_client_id:  string
          deployed_agent_id:     string
          period_start:          string
          period_end:            string
          metric_type:           string
          metric_value:          number
          metric_unit?:          string | null
          compared_to_baseline?: number | null
          improvement_pct?:      number | null
          created_at?:           string
        }
        Update: {
          metric_value?:         number
          compared_to_baseline?: number | null
          improvement_pct?:      number | null
        }
        Relationships: []
      }

      // ── Property management data ─────────────────────────────
      properties: {
        Row: {
          id:                   string
          consulting_client_id: string
          name:                 string
          address:              string | null
          property_type:        'residential' | 'commercial' | 'mixed'
          unit_count:           number
          created_at:           string
          updated_at:           string
        }
        Insert: {
          id?:                  string
          consulting_client_id: string
          name:                 string
          address?:             string | null
          property_type?:       'residential' | 'commercial' | 'mixed'
          unit_count?:          number
          created_at?:          string
          updated_at?:          string
        }
        Update: {
          name?:          string
          address?:       string | null
          property_type?: 'residential' | 'commercial' | 'mixed'
          unit_count?:    number
          updated_at?:    string
        }
        Relationships: []
      }

      tenants: {
        Row: {
          id:                   string
          consulting_client_id: string
          property_id:          string | null
          first_name:           string
          last_name:            string
          email:                string
          phone:                string | null
          monthly_rent:         number | null
          health_score:         number
          payment_score:        number
          ticket_score:         number
          engagement_score:     number
          lease_age_score:      number
          lease_start_date:     string | null
          lease_end_date:       string | null
          status:               'active' | 'past' | 'prospect'
          created_at:           string
          updated_at:           string
        }
        Insert: {
          id?:                  string
          consulting_client_id: string
          property_id?:         string | null
          first_name:           string
          last_name:            string
          email:                string
          phone?:               string | null
          monthly_rent?:        number | null
          health_score?:        number
          payment_score?:       number
          ticket_score?:        number
          engagement_score?:    number
          lease_age_score?:     number
          lease_start_date?:    string | null
          lease_end_date?:      string | null
          status?:              'active' | 'past' | 'prospect'
          created_at?:          string
          updated_at?:          string
        }
        Update: {
          first_name?:       string
          last_name?:        string
          email?:            string
          phone?:            string | null
          monthly_rent?:     number | null
          health_score?:     number
          payment_score?:    number
          ticket_score?:     number
          engagement_score?: number
          lease_age_score?:  number
          lease_start_date?: string | null
          lease_end_date?:   string | null
          status?:           'active' | 'past' | 'prospect'
          updated_at?:       string
        }
        Relationships: []
      }

      payments: {
        Row: {
          id:         string
          tenant_id:  string
          amount:     number
          due_date:   string
          paid_date:  string | null
          days_late:  number | null
          status:     'pending' | 'paid' | 'partial' | 'late' | 'missed'
          created_at: string
        }
        Insert: {
          id?:        string
          tenant_id:  string
          amount:     number
          due_date:   string
          paid_date?: string | null
          status?:    'pending' | 'paid' | 'partial' | 'late' | 'missed'
          created_at?: string
        }
        Update: {
          paid_date?: string | null
          status?:    'pending' | 'paid' | 'partial' | 'late' | 'missed'
        }
        Relationships: []
      }

      tenant_engagement_events: {
        Row: {
          id:          string
          tenant_id:   string
          event_type:  string
          occurred_at: string
        }
        Insert: {
          id?:         string
          tenant_id:   string
          event_type:  string
          occurred_at?: string
        }
        Update: Record<string, never>
        Relationships: []
      }

      contractors: {
        Row: {
          id:                   string
          consulting_client_id: string
          company_name:         string
          contact_name:         string | null
          email:                string | null
          phone:                string | null
          trades:               string[]
          rating:               number | null
          total_jobs:           number
          insurance_expiry:     string | null
          status:               'active' | 'inactive'
          created_at:           string
          updated_at:           string
        }
        Insert: {
          id?:                  string
          consulting_client_id: string
          company_name:         string
          contact_name?:        string | null
          email?:               string | null
          phone?:               string | null
          trades?:              string[]
          rating?:              number | null
          total_jobs?:          number
          insurance_expiry?:    string | null
          status?:              'active' | 'inactive'
          created_at?:          string
          updated_at?:          string
        }
        Update: {
          company_name?:     string
          contact_name?:     string | null
          email?:            string | null
          phone?:            string | null
          trades?:           string[]
          rating?:           number | null
          total_jobs?:       number
          insurance_expiry?: string | null
          status?:           'active' | 'inactive'
          updated_at?:       string
        }
        Relationships: []
      }

      maintenance_tickets: {
        Row: {
          id:                   string
          consulting_client_id: string
          property_id:          string | null
          tenant_id:            string | null
          title:                string
          description:          string | null
          priority:             'P1' | 'P2' | 'P3' | 'P4'
          ai_priority:          'P1' | 'P2' | 'P3' | 'P4' | null
          ai_category:          string | null
          ai_reasoning:         string | null
          status:               'open' | 'in_progress' | 'dispatched' | 'resolved' | 'closed' | 'cancelled'
          metadata:             Json
          created_at:           string
          updated_at:           string
        }
        Insert: {
          id?:                  string
          consulting_client_id: string
          property_id?:         string | null
          tenant_id?:           string | null
          title:                string
          description?:         string | null
          priority?:            'P1' | 'P2' | 'P3' | 'P4'
          ai_priority?:         'P1' | 'P2' | 'P3' | 'P4' | null
          ai_category?:         string | null
          ai_reasoning?:        string | null
          status?:              'open' | 'in_progress' | 'dispatched' | 'resolved' | 'closed' | 'cancelled'
          metadata?:            Json
          created_at?:          string
          updated_at?:          string
        }
        Update: {
          title?:        string
          description?:  string | null
          priority?:     'P1' | 'P2' | 'P3' | 'P4'
          ai_priority?:  'P1' | 'P2' | 'P3' | 'P4' | null
          ai_category?:  string | null
          ai_reasoning?: string | null
          status?:       'open' | 'in_progress' | 'dispatched' | 'resolved' | 'closed' | 'cancelled'
          metadata?:     Json
          updated_at?:   string
        }
        Relationships: []
      }

    }
    Views:    Record<string, never>
    Functions: Record<string, never>
    Enums:    Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
