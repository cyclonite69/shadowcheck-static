-- Migration: 20260613_052_wigle_ledger_phase_column.sql
-- Adds a phase column to wigle_ledger_events so that rows start as 'pending'
-- (INSERT before HTTP call) and transition to 'complete' (UPDATE after outcome).
-- Eliminates the DEFAULT 'success' lie and enables RETURNING id to fix the
-- blind ORDER-BY-LIMIT-1 race condition in updateLedgerOutcome.

SET search_path TO app, public;

ALTER TABLE app.wigle_ledger_events
  ADD COLUMN IF NOT EXISTS phase TEXT NOT NULL DEFAULT 'complete'
    CHECK (phase IN ('pending', 'complete'));

-- DEFAULT 'complete' keeps all existing rows valid without a backfill.
-- New rows inserted by the updated service will pass 'pending' explicitly.

COMMENT ON COLUMN app.wigle_ledger_events.phase IS
  'pending = INSERT fired before HTTP call; complete = outcome recorded via UPDATE';
