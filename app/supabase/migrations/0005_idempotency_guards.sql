-- Race/idempotency guards surfaced by the adversarial review of the
-- Twilio/approvals/Stripe integrations.

-- Twilio retries webhooks on timeout; without this, a retried inbound SMS
-- re-runs the whole AI turn (duplicate replies, approvals, bookings). The
-- pipeline inserts the inbound message (with its MessageSid) BEFORE running
-- the turn and treats a unique violation as "already processed".
create unique index if not exists messages_twilio_sid_unique
  on messages (twilio_message_sid)
  where twilio_message_sid is not null;

-- Concurrent first-contact texts from the same phone raced find-or-create
-- into duplicate leads, after which maybeSingle() errors on every future
-- text from that number.
create unique index if not exists leads_business_phone_unique
  on leads (business_id, source_phone_number);

-- Stripe webhook events carry no ordering guarantee; a retried stale
-- customer.subscription.updated arriving after .deleted must not resurrect
-- entitlement. The webhook records the event's created timestamp and skips
-- anything older than what it already applied.
alter table subscriptions add column if not exists last_stripe_event_at timestamptz;
