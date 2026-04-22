-- ============================================================
-- PropWise Command Center — Consulting Agency Schema v2.0
-- Agency model: consulting_clients, deployed_agents, execution_logs
--
-- This script is idempotent — drops and recreates everything.
-- Paste the ENTIRE file into the Supabase SQL Editor and run.
-- ============================================================

-- ============================================================
-- RESET
-- Triggers are dropped automatically via CASCADE on their tables.
-- Functions must be dropped before tables that reference them.
-- ============================================================
DROP TABLE IF EXISTS outcome_metrics            CASCADE;
DROP TABLE IF EXISTS pending_approvals          CASCADE;
DROP TABLE IF EXISTS execution_logs             CASCADE;
DROP TABLE IF EXISTS agent_runs                 CASCADE;
DROP TABLE IF EXISTS deployed_agents            CASCADE;
DROP TABLE IF EXISTS client_users               CASCADE;
DROP TABLE IF EXISTS consulting_clients         CASCADE;
DROP TABLE IF EXISTS tenant_engagement_events   CASCADE;
DROP TABLE IF EXISTS payments                   CASCADE;
DROP TABLE IF EXISTS maintenance_tickets        CASCADE;
DROP TABLE IF EXISTS contractors                CASCADE;
DROP TABLE IF EXISTS tenants                    CASCADE;
DROP TABLE IF EXISTS properties                 CASCADE;

DROP FUNCTION IF EXISTS update_agent_stats_on_run_complete() CASCADE;
DROP FUNCTION IF EXISTS set_updated_at()                     CASCADE;
DROP FUNCTION IF EXISTS is_client_manager(UUID)              CASCADE;
DROP FUNCTION IF EXISTS is_client_member(UUID)               CASCADE;

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- CONSULTING CLIENTS  (the property management firms)
-- ============================================================
CREATE TABLE consulting_clients (
  id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT          NOT NULL,
  slug          TEXT          UNIQUE NOT NULL,
  contact_email TEXT,
  contact_name  TEXT,
  industry      TEXT          NOT NULL DEFAULT 'property_management',
  status        TEXT          NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active', 'inactive', 'trial', 'churned')),
  plan          TEXT          NOT NULL DEFAULT 'standard'
                              CHECK (plan IN ('standard', 'professional', 'enterprise')),
  settings      JSONB         NOT NULL DEFAULT '{}',
  onboarded_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CLIENT USERS  (users who belong to a consulting client)
-- ============================================================
CREATE TABLE client_users (
  id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  consulting_client_id UUID        NOT NULL REFERENCES consulting_clients(id) ON DELETE CASCADE,
  user_id              UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role                 TEXT        NOT NULL DEFAULT 'viewer'
                                   CHECK (role IN ('viewer', 'manager', 'admin')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (consulting_client_id, user_id)
);

CREATE INDEX idx_client_users_user_id   ON client_users(user_id);
CREATE INDEX idx_client_users_client_id ON client_users(consulting_client_id);

-- ============================================================
-- DEPLOYED AGENTS  (which AI agents are active for each client)
-- ============================================================
CREATE TABLE deployed_agents (
  id                   UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  consulting_client_id UUID          NOT NULL REFERENCES consulting_clients(id) ON DELETE CASCADE,
  agent_type           TEXT          NOT NULL
                                     CHECK (agent_type IN (
                                       'maintenance_triage',
                                       'tenant_retention',
                                       'contractor_dispatch',
                                       'cash_flow_forecasting'
                                     )),
  display_name         TEXT          NOT NULL,
  description          TEXT,
  model                TEXT          NOT NULL DEFAULT 'claude-3-5-sonnet-20241022',
  status               TEXT          NOT NULL DEFAULT 'active'
                                     CHECK (status IN ('active', 'paused', 'error', 'inactive')),
  config               JSONB         NOT NULL DEFAULT '{}',
  schedule_cron        TEXT,
  last_run_at          TIMESTAMPTZ,
  next_run_at          TIMESTAMPTZ,
  total_runs           INTEGER       NOT NULL DEFAULT 0,
  total_cost_usd       NUMERIC(10,4) NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (consulting_client_id, agent_type)
);

CREATE INDEX idx_deployed_agents_client_id ON deployed_agents(consulting_client_id);
CREATE INDEX idx_deployed_agents_status    ON deployed_agents(status);

-- ============================================================
-- AGENT RUNS  (each execution instance of an agent)
-- ============================================================
CREATE TABLE agent_runs (
  id                   UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  deployed_agent_id    UUID          NOT NULL REFERENCES deployed_agents(id) ON DELETE CASCADE,
  consulting_client_id UUID          NOT NULL REFERENCES consulting_clients(id) ON DELETE CASCADE,
  status               TEXT          NOT NULL DEFAULT 'running'
                                     CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  trigger_type         TEXT          NOT NULL DEFAULT 'scheduled'
                                     CHECK (trigger_type IN ('scheduled', 'manual', 'webhook', 'event')),
  started_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  completed_at         TIMESTAMPTZ,
  duration_ms          INTEGER       GENERATED ALWAYS AS (
                          CASE WHEN completed_at IS NOT NULL
                            THEN EXTRACT(EPOCH FROM (completed_at - started_at))::INTEGER * 1000
                          ELSE NULL END
                        ) STORED,
  total_tokens         INTEGER       NOT NULL DEFAULT 0,
  total_cost_usd       NUMERIC(10,6) NOT NULL DEFAULT 0,
  items_processed      INTEGER       NOT NULL DEFAULT 0,
  items_actioned       INTEGER       NOT NULL DEFAULT 0,
  error_message        TEXT,
  summary              TEXT,
  metadata             JSONB         NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_agent_runs_agent_id   ON agent_runs(deployed_agent_id);
CREATE INDEX idx_agent_runs_client_id  ON agent_runs(consulting_client_id);
CREATE INDEX idx_agent_runs_started_at ON agent_runs(started_at DESC);
CREATE INDEX idx_agent_runs_status     ON agent_runs(status);

-- ============================================================
-- EXECUTION LOGS  (step-by-step log of every AI action)
-- ============================================================
CREATE TABLE execution_logs (
  id                   UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_run_id         UUID          NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  consulting_client_id UUID          NOT NULL REFERENCES consulting_clients(id) ON DELETE CASCADE,
  deployed_agent_id    UUID          NOT NULL REFERENCES deployed_agents(id) ON DELETE CASCADE,
  sequence_num         INTEGER       NOT NULL,
  log_level            TEXT          NOT NULL DEFAULT 'info'
                                     CHECK (log_level IN ('debug', 'info', 'warn', 'error', 'success')),
  event_type           TEXT          NOT NULL,
  message              TEXT          NOT NULL,
  entity_type          TEXT,
  entity_id            UUID,
  entity_label         TEXT,
  ai_model             TEXT,
  prompt_tokens        INTEGER,
  completion_tokens    INTEGER,
  cost_usd             NUMERIC(10,6),
  latency_ms           INTEGER,
  input_snapshot       JSONB,
  output_snapshot      JSONB,
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_execution_logs_run_id     ON execution_logs(agent_run_id);
CREATE INDEX idx_execution_logs_client_id  ON execution_logs(consulting_client_id);
CREATE INDEX idx_execution_logs_agent_id   ON execution_logs(deployed_agent_id);
CREATE INDEX idx_execution_logs_created_at ON execution_logs(created_at DESC);
CREATE INDEX idx_execution_logs_level      ON execution_logs(log_level);

-- ============================================================
-- PENDING APPROVALS  (AI actions requiring a human sign-off)
-- ============================================================
CREATE TABLE pending_approvals (
  id                   UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_run_id         UUID          NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  consulting_client_id UUID          NOT NULL REFERENCES consulting_clients(id) ON DELETE CASCADE,
  deployed_agent_id    UUID          NOT NULL REFERENCES deployed_agents(id) ON DELETE CASCADE,
  approval_type        TEXT          NOT NULL
                                     CHECK (approval_type IN (
                                       'vendor_dispatch',
                                       'invoice_payment',
                                       'tenant_outreach',
                                       'maintenance_escalation',
                                       'budget_exception'
                                     )),
  title                TEXT          NOT NULL,
  description          TEXT          NOT NULL,
  ai_recommendation    TEXT          NOT NULL,
  ai_confidence        NUMERIC(3,2),
  amount_usd           NUMERIC(10,2),
  entity_type          TEXT,
  entity_id            UUID,
  entity_label         TEXT,
  payload              JSONB         NOT NULL DEFAULT '{}',
  status               TEXT          NOT NULL DEFAULT 'pending'
                                     CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  reviewed_by          UUID          REFERENCES auth.users(id),
  reviewed_at          TIMESTAMPTZ,
  review_note          TEXT,
  expires_at           TIMESTAMPTZ,
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pending_approvals_client_id  ON pending_approvals(consulting_client_id);
CREATE INDEX idx_pending_approvals_status     ON pending_approvals(status);
CREATE INDEX idx_pending_approvals_created_at ON pending_approvals(created_at DESC);

-- ============================================================
-- OUTCOME METRICS  (saved KPIs per agent per period)
-- ============================================================
CREATE TABLE outcome_metrics (
  id                   UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  consulting_client_id UUID          NOT NULL REFERENCES consulting_clients(id) ON DELETE CASCADE,
  deployed_agent_id    UUID          NOT NULL REFERENCES deployed_agents(id) ON DELETE CASCADE,
  period_start         DATE          NOT NULL,
  period_end           DATE          NOT NULL,
  metric_type          TEXT          NOT NULL,
  metric_value         NUMERIC(14,4) NOT NULL,
  metric_unit          TEXT,
  compared_to_baseline NUMERIC(14,4),
  improvement_pct      NUMERIC(6,2),
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (consulting_client_id, deployed_agent_id, period_start, metric_type)
);

CREATE INDEX idx_outcome_metrics_client_id ON outcome_metrics(consulting_client_id);
CREATE INDEX idx_outcome_metrics_period    ON outcome_metrics(period_start DESC);

-- ============================================================
-- TRIGGER FUNCTION — updated_at maintenance
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_consulting_clients_updated_at
  BEFORE UPDATE ON consulting_clients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_deployed_agents_updated_at
  BEFORE UPDATE ON deployed_agents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_pending_approvals_updated_at
  BEFORE UPDATE ON pending_approvals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TRIGGER FUNCTION — update agent stats on run completion
-- ============================================================
CREATE OR REPLACE FUNCTION update_agent_stats_on_run_complete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IN ('completed', 'failed') AND OLD.status = 'running' THEN
    UPDATE deployed_agents
    SET
      last_run_at    = NEW.completed_at,
      total_runs     = total_runs + 1,
      total_cost_usd = total_cost_usd + NEW.total_cost_usd,
      status         = CASE WHEN NEW.status = 'failed' THEN 'error' ELSE 'active' END,
      updated_at     = NOW()
    WHERE id = NEW.deployed_agent_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_agent_run_complete
  AFTER UPDATE ON agent_runs
  FOR EACH ROW EXECUTE FUNCTION update_agent_stats_on_run_complete();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE consulting_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_users       ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployed_agents    ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_approvals  ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_metrics    ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_client_member(p_client_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM client_users
    WHERE consulting_client_id = p_client_id
    AND   user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION is_client_manager(p_client_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM client_users
    WHERE consulting_client_id = p_client_id
    AND   user_id = auth.uid()
    AND   role IN ('manager', 'admin')
  );
$$;

-- consulting_clients: read-only for members
CREATE POLICY "clients_select" ON consulting_clients
  FOR SELECT USING (is_client_member(id));

-- client_users: members can see their own client's users
CREATE POLICY "client_users_select" ON client_users
  FOR SELECT USING (is_client_member(consulting_client_id));

-- deployed_agents: all members view; managers can pause/resume
CREATE POLICY "agents_select" ON deployed_agents
  FOR SELECT USING (is_client_member(consulting_client_id));
CREATE POLICY "agents_update" ON deployed_agents
  FOR UPDATE USING (is_client_manager(consulting_client_id));

-- agent_runs: all members view
CREATE POLICY "runs_select" ON agent_runs
  FOR SELECT USING (is_client_member(consulting_client_id));

-- execution_logs: all members view (insert via service role only)
CREATE POLICY "logs_select" ON execution_logs
  FOR SELECT USING (is_client_member(consulting_client_id));

-- pending_approvals: view for all; approve/reject for managers
CREATE POLICY "approvals_select" ON pending_approvals
  FOR SELECT USING (is_client_member(consulting_client_id));
CREATE POLICY "approvals_update" ON pending_approvals
  FOR UPDATE USING (is_client_manager(consulting_client_id));

-- outcome_metrics: all members view
CREATE POLICY "metrics_select" ON outcome_metrics
  FOR SELECT USING (is_client_member(consulting_client_id));

-- ============================================================
-- PROPERTY MANAGEMENT DATA TABLES
-- These are the source data the AI agents read and write.
-- All are scoped to consulting_client_id.
-- ============================================================

CREATE TABLE properties (
  id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  consulting_client_id UUID        NOT NULL REFERENCES consulting_clients(id) ON DELETE CASCADE,
  name                 TEXT        NOT NULL,
  address              TEXT,
  property_type        TEXT        NOT NULL DEFAULT 'residential'
                                   CHECK (property_type IN ('residential', 'commercial', 'mixed')),
  unit_count           INTEGER     NOT NULL DEFAULT 1,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tenants (
  id                   UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  consulting_client_id UUID          NOT NULL REFERENCES consulting_clients(id) ON DELETE CASCADE,
  property_id          UUID          REFERENCES properties(id) ON DELETE SET NULL,
  first_name           TEXT          NOT NULL,
  last_name            TEXT          NOT NULL,
  email                TEXT          NOT NULL,
  phone                TEXT,
  monthly_rent         NUMERIC(10,2),
  health_score         INTEGER       NOT NULL DEFAULT 50 CHECK (health_score BETWEEN 0 AND 100),
  payment_score        INTEGER       NOT NULL DEFAULT 50,
  ticket_score         INTEGER       NOT NULL DEFAULT 100,
  engagement_score     INTEGER       NOT NULL DEFAULT 50,
  lease_age_score      INTEGER       NOT NULL DEFAULT 40,
  lease_start_date     DATE,
  lease_end_date       DATE,
  status               TEXT          NOT NULL DEFAULT 'active'
                                     CHECK (status IN ('active', 'past', 'prospect')),
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_client_id ON tenants(consulting_client_id);
CREATE INDEX idx_tenants_status    ON tenants(status);

CREATE TABLE payments (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  amount      NUMERIC(10,2) NOT NULL,
  due_date    DATE          NOT NULL,
  paid_date   DATE,
  days_late   INTEGER       GENERATED ALWAYS AS (
                CASE WHEN paid_date IS NOT NULL AND paid_date > due_date
                  THEN (paid_date - due_date)
                ELSE 0 END
              ) STORED,
  status      TEXT          NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'paid', 'partial', 'late', 'missed')),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX idx_payments_due_date  ON payments(due_date DESC);

CREATE TABLE tenant_engagement_events (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type  TEXT        NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_engagement_tenant_id ON tenant_engagement_events(tenant_id);
CREATE INDEX idx_engagement_occurred  ON tenant_engagement_events(occurred_at DESC);

CREATE TABLE contractors (
  id                   UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  consulting_client_id UUID          NOT NULL REFERENCES consulting_clients(id) ON DELETE CASCADE,
  company_name         TEXT          NOT NULL,
  contact_name         TEXT,
  email                TEXT,
  phone                TEXT,
  trades               TEXT[]        NOT NULL DEFAULT '{}',
  rating               NUMERIC(3,1)  CHECK (rating BETWEEN 0 AND 5),
  total_jobs           INTEGER       NOT NULL DEFAULT 0,
  insurance_expiry     DATE,
  status               TEXT          NOT NULL DEFAULT 'active'
                                     CHECK (status IN ('active', 'inactive')),
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contractors_client_id ON contractors(consulting_client_id);
CREATE INDEX idx_contractors_trades    ON contractors USING GIN(trades);

CREATE TABLE maintenance_tickets (
  id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  consulting_client_id UUID        NOT NULL REFERENCES consulting_clients(id) ON DELETE CASCADE,
  property_id          UUID        REFERENCES properties(id) ON DELETE SET NULL,
  tenant_id            UUID        REFERENCES tenants(id) ON DELETE SET NULL,
  title                TEXT        NOT NULL,
  description          TEXT,
  priority             TEXT        NOT NULL DEFAULT 'P3'
                                   CHECK (priority IN ('P1', 'P2', 'P3', 'P4')),
  ai_priority          TEXT        CHECK (ai_priority IN ('P1', 'P2', 'P3', 'P4')),
  ai_category          TEXT,
  ai_reasoning         TEXT,
  status               TEXT        NOT NULL DEFAULT 'open'
                                   CHECK (status IN ('open', 'in_progress', 'dispatched', 'resolved', 'closed', 'cancelled')),
  metadata             JSONB       NOT NULL DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tickets_client_id ON maintenance_tickets(consulting_client_id);
CREATE INDEX idx_tickets_priority  ON maintenance_tickets(priority);
CREATE INDEX idx_tickets_status    ON maintenance_tickets(status);

-- updated_at triggers for PM tables
CREATE TRIGGER trg_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_maintenance_tickets_updated_at
  BEFORE UPDATE ON maintenance_tickets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS for PM tables
ALTER TABLE properties               ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_engagement_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractors              ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_tickets      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "properties_select" ON properties
  FOR SELECT USING (is_client_member(consulting_client_id));
CREATE POLICY "properties_all" ON properties
  FOR ALL USING (is_client_manager(consulting_client_id));

CREATE POLICY "tenants_select" ON tenants
  FOR SELECT USING (is_client_member(consulting_client_id));
CREATE POLICY "tenants_all" ON tenants
  FOR ALL USING (is_client_manager(consulting_client_id));

CREATE POLICY "payments_select" ON payments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM tenants t WHERE t.id = tenant_id AND is_client_member(t.consulting_client_id))
  );

CREATE POLICY "engagement_select" ON tenant_engagement_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM tenants t WHERE t.id = tenant_id AND is_client_member(t.consulting_client_id))
  );

CREATE POLICY "contractors_select" ON contractors
  FOR SELECT USING (is_client_member(consulting_client_id));
CREATE POLICY "contractors_all" ON contractors
  FOR ALL USING (is_client_manager(consulting_client_id));

CREATE POLICY "tickets_select" ON maintenance_tickets
  FOR SELECT USING (is_client_member(consulting_client_id));
CREATE POLICY "tickets_all" ON maintenance_tickets
  FOR ALL USING (is_client_manager(consulting_client_id));
