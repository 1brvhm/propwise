-- PropWise — Reset Script
-- Run this BEFORE schema.sql if you need a clean slate.
-- WARNING: Drops all PropWise tables and functions.

DROP TABLE IF EXISTS ai_logs                  CASCADE;
DROP TABLE IF EXISTS tenant_engagement_events CASCADE;
DROP TABLE IF EXISTS work_orders              CASCADE;
DROP TABLE IF EXISTS contractors              CASCADE;
DROP TABLE IF EXISTS maintenance_tickets      CASCADE;
DROP TABLE IF EXISTS payments                 CASCADE;
DROP TABLE IF EXISTS tenants                  CASCADE;
DROP TABLE IF EXISTS units                    CASCADE;
DROP TABLE IF EXISTS properties               CASCADE;
DROP TABLE IF EXISTS organization_members     CASCADE;
DROP TABLE IF EXISTS organizations            CASCADE;

DROP FUNCTION IF EXISTS trigger_set_updated_at()          CASCADE;
DROP FUNCTION IF EXISTS recalculate_tenant_payment_score() CASCADE;
DROP FUNCTION IF EXISTS calculate_work_order_total()       CASCADE;

DROP SEQUENCE IF EXISTS invoice_seq;
