-- 0006: configurable approval expiry + opt-out notes.
--
-- approval_expiry_minutes: how long a business gives staff to answer a
-- pending approval before the sweeper (app/api/cron/expire-approvals)
-- expires it and sends the customer a fallback. Application code stamps
-- approval_queue.expires_at from this value at insert time
-- (lib/messaging/process-inbound.ts); the approval_queue column default
-- stays 15 minutes for any row inserted without an explicit value.

alter table service_settings add column if not exists approval_expiry_minutes integer not null default 15;

-- Opt-out (STOP/UNSUBSCRIBE/CANCEL, handled in the Twilio SMS webhook)
-- needs no schema change: leads reuse the existing 'closed_lost' status,
-- conversations reuse 'closed' (closed_reason = 'customer_opted_out'), and
-- the event is recorded in audit_log as event_type 'customer_opted_out'.
