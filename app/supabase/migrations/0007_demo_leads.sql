-- 0007: demo_leads — lead capture for the public "watch your phone" demo
-- (app/app/demo). Someone who runs the demo (by calling the demo number, or
-- asking us to text them the sample missed-call reply) is a warm inbound
-- lead the founder/SDR works and the funnel measures.
--
-- Written ONLY by the service client from server routes (the /api/demo/text
-- route and the demo-voice webhook) — never touched by the browser. RLS is
-- enabled with no policies so anon/authenticated clients cannot read or
-- write it; the service role bypasses RLS. This keeps prospect phone numbers
-- server-side and off the public API surface.

create table if not exists demo_leads (
  id uuid primary key default gen_random_uuid(),
  phone_number text not null,                 -- E.164, the prospect's number
  business_name text,                         -- optional, if they typed it (personalizes the demo text)
  channel text not null,                      -- 'text_form' | 'inbound_call'
  status text not null default 'sent',        -- 'sent' | 'queued_no_number' | 'failed' | 'opted_out'
  twilio_message_sid text,
  ip_hash text,                               -- sha256(ip + salt) for rate-limiting, not raw PII
  user_agent text,
  converted_business_id uuid references businesses (id) on delete set null,
  created_at timestamptz not null default now(),
  texted_at timestamptz
);

create index if not exists demo_leads_phone_idx on demo_leads (phone_number, created_at desc);
create index if not exists demo_leads_ip_idx on demo_leads (ip_hash, created_at desc);
create index if not exists demo_leads_created_idx on demo_leads (created_at desc);

alter table demo_leads enable row level security;
-- No policies by design: server-only via the service role.
