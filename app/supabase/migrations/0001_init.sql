-- MyWorkFlo — initial schema
-- Multi-tenant AI front-desk for HVAC/home-service businesses.
-- Tenancy anchor: staff.user_id = auth.uid(). All webhook/AI-engine writes
-- use the service_role key server-side and bypass RLS by design.

create extension if not exists pgcrypto;

-- ============================================================================
-- Enums
-- ============================================================================

create type plan_tier as enum ('starter', 'growth', 'pro');
create type control_mode as enum ('draft', 'assisted', 'autopilot');
create type staff_role as enum ('owner', 'dispatcher', 'tech');
create type calendar_provider as enum ('google');
create type calendar_status as enum ('active', 'expired', 'revoked');
create type issue_urgency as enum ('routine', 'priority', 'emergency');
create type lead_status as enum (
  'new', 'qualifying', 'booking_pending_approval', 'booked',
  'escalated', 'closed_lost', 'spam'
);
create type call_status as enum ('no-answer', 'busy', 'completed', 'voicemail');
create type conversation_channel as enum ('sms');
create type conversation_status as enum (
  'active', 'awaiting_staff_approval', 'booked',
  'escalated_emergency', 'escalated_priority', 'closed'
);
create type message_direction as enum ('inbound', 'outbound');
create type message_sender as enum ('customer', 'ai', 'staff');
create type message_status as enum ('queued', 'sent', 'delivered', 'failed');
create type appointment_status as enum (
  'pending_approval', 'confirmed', 'cancelled', 'completed', 'no_show'
);
create type booked_via as enum ('autopilot', 'assisted_approval', 'staff_manual');
create type approval_type as enum (
  'outbound_message', 'booking', 'emergency_escalation', 'other_exception'
);
create type approval_status as enum ('pending', 'approved', 'rejected', 'auto_expired');
create type response_channel as enum ('sms_reply', 'magic_link');
create type audit_actor_type as enum ('system', 'ai', 'staff', 'owner');
create type subscription_status as enum (
  'trialing', 'active', 'past_due', 'canceled', 'incomplete'
);

-- ============================================================================
-- Helper: updated_at trigger
-- ============================================================================

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- businesses (tenant root)
-- ============================================================================

create table businesses (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete restrict,
  name text not null,
  slug text unique not null,
  timezone text not null default 'America/New_York',
  plan_tier plan_tier not null default 'starter',
  control_mode control_mode not null default 'draft',
  twilio_phone_number text,
  twilio_phone_sid text,
  stripe_customer_id text,
  subscription_status subscription_status,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger businesses_set_updated_at
  before update on businesses
  for each row execute function set_updated_at();

-- ============================================================================
-- staff (tenancy anchor)
-- ============================================================================

create table staff (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  name text not null,
  phone_number text not null,
  role staff_role not null default 'owner',
  is_active boolean not null default true,
  invited_at timestamptz not null default now(),
  joined_at timestamptz,
  created_at timestamptz not null default now()
);

create index staff_business_id_idx on staff (business_id);
create index staff_user_id_idx on staff (user_id);
create unique index staff_business_phone_unique on staff (business_id, phone_number);

-- Security-definer helper so RLS policies elsewhere don't need to
-- self-reference `staff` (which would need its own recursive policy).
create or replace function is_staff_of(target_business_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from staff
    where staff.business_id = target_business_id
      and staff.user_id = auth.uid()
      and staff.is_active
  );
$$;

alter table staff enable row level security;

create policy staff_select on staff
  for select using (is_staff_of(business_id));

create policy staff_owner_write on staff
  for all using (
    exists (
      select 1 from businesses
      where businesses.id = staff.business_id
        and businesses.owner_user_id = auth.uid()
    )
  );

alter table businesses enable row level security;

create policy businesses_select on businesses
  for select using (is_staff_of(id));

create policy businesses_owner_write on businesses
  for all using (owner_user_id = auth.uid());

-- ============================================================================
-- service_settings (1:1 with business)
-- ============================================================================

create table service_settings (
  business_id uuid primary key references businesses (id) on delete cascade,
  business_hours jsonb not null default '{}'::jsonb,
  service_area jsonb not null default '{}'::jsonb,
  emergency_keywords text[] not null default '{}',
  languages text[] not null default array['en', 'es'],
  min_notice_hours integer not null default 2,
  weather_thresholds jsonb not null default '{"no_cooling_high_f": 90, "no_heat_low_f": 32}'::jsonb,
  ai_persona_name text,
  updated_at timestamptz not null default now()
);

create trigger service_settings_set_updated_at
  before update on service_settings
  for each row execute function set_updated_at();

alter table service_settings enable row level security;

create policy service_settings_all on service_settings
  for all using (is_staff_of(business_id));

-- ============================================================================
-- appointment_types
-- ============================================================================

create table appointment_types (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  name text not null,
  duration_minutes integer not null default 60,
  auto_bookable boolean not null default false,
  is_emergency_type boolean not null default false,
  hvac_issue_codes text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index appointment_types_business_id_idx on appointment_types (business_id);

alter table appointment_types enable row level security;

create policy appointment_types_all on appointment_types
  for all using (is_staff_of(business_id));

-- ============================================================================
-- pricing_guidance
-- ============================================================================

create table pricing_guidance (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  appointment_type_id uuid not null references appointment_types (id) on delete cascade,
  price_range_min numeric(10, 2),
  price_range_max numeric(10, 2),
  display_text text not null default 'Our technician will quote on-site.',
  is_quotable_by_ai boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index pricing_guidance_appointment_type_unique on pricing_guidance (appointment_type_id);
create index pricing_guidance_business_id_idx on pricing_guidance (business_id);

alter table pricing_guidance enable row level security;

create policy pricing_guidance_all on pricing_guidance
  for all using (is_staff_of(business_id));

-- ============================================================================
-- calendar_connections
-- ============================================================================

create table calendar_connections (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  provider calendar_provider not null default 'google',
  calendar_id text,
  -- Encrypted at rest via pgsodium/Supabase Vault in production; stored as
  -- text here with the expectation the app layer encrypts before insert.
  access_token text,
  refresh_token text,
  status calendar_status not null default 'active',
  connected_by uuid references staff (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index calendar_connections_business_id_idx on calendar_connections (business_id);

create trigger calendar_connections_set_updated_at
  before update on calendar_connections
  for each row execute function set_updated_at();

alter table calendar_connections enable row level security;

create policy calendar_connections_all on calendar_connections
  for all using (is_staff_of(business_id));

-- ============================================================================
-- hvac_issue_types (platform-owned reference data, not tenant-scoped)
-- ============================================================================

create table hvac_issue_types (
  code text primary key,
  label text not null,
  aliases_en text[] not null default '{}',
  aliases_es text[] not null default '{}',
  default_urgency issue_urgency not null default 'routine',
  seasonal_sensitive boolean not null default false,
  required_fields text[] not null default '{}',
  sort_order integer not null default 0
);

alter table hvac_issue_types enable row level security;

-- Reference data: readable by any authenticated user, writable by nobody
-- via the API (seeded/updated via migration only).
create policy hvac_issue_types_read on hvac_issue_types
  for select using (auth.role() = 'authenticated' or auth.role() = 'service_role');

-- ============================================================================
-- leads
-- ============================================================================

create table leads (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  source_phone_number text not null,
  name text,
  language text,
  status lead_status not null default 'new',
  first_contact_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index leads_business_id_idx on leads (business_id);
create index leads_phone_idx on leads (business_id, source_phone_number);

alter table leads enable row level security;

create policy leads_all on leads
  for all using (is_staff_of(business_id));

-- ============================================================================
-- calls
-- ============================================================================

create table calls (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  lead_id uuid references leads (id) on delete set null,
  twilio_call_sid text unique,
  status call_status not null,
  triggered_text_back boolean not null default false,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index calls_business_id_idx on calls (business_id);
create index calls_lead_id_idx on calls (lead_id);

alter table calls enable row level security;

create policy calls_all on calls
  for all using (is_staff_of(business_id));

-- ============================================================================
-- conversations
-- ============================================================================

create table conversations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  lead_id uuid not null references leads (id) on delete cascade,
  channel conversation_channel not null default 'sms',
  status conversation_status not null default 'active',
  -- Locked at creation from businesses.control_mode; never re-read live,
  -- so a mid-conversation settings change never produces inconsistent
  -- behavior within a single thread.
  control_mode_snapshot control_mode not null,
  detected_language text,
  matched_issue_code text references hvac_issue_types (code),
  weather_elevated boolean not null default false,
  collected_fields jsonb not null default '{}'::jsonb,
  turn_count integer not null default 0,
  started_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  closed_reason text
);

create index conversations_business_id_idx on conversations (business_id);
create index conversations_lead_id_idx on conversations (lead_id);
create index conversations_status_idx on conversations (business_id, status);

alter table conversations enable row level security;

create policy conversations_all on conversations
  for all using (is_staff_of(business_id));

-- ============================================================================
-- messages
-- ============================================================================

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  business_id uuid not null references businesses (id) on delete cascade,
  direction message_direction not null,
  sender message_sender not null,
  body text not null,
  twilio_message_sid text,
  status message_status not null default 'queued',
  -- Full structured decision object from the AI engine when sender='ai':
  -- the audit trail for "why did it say/do that."
  ai_metadata jsonb,
  created_at timestamptz not null default now()
);

create index messages_conversation_id_idx on messages (conversation_id, created_at);
create index messages_business_id_idx on messages (business_id);

alter table messages enable row level security;

create policy messages_all on messages
  for all using (is_staff_of(business_id));

-- ============================================================================
-- appointments
-- ============================================================================

create table appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  lead_id uuid not null references leads (id) on delete cascade,
  conversation_id uuid references conversations (id) on delete set null,
  appointment_type_id uuid not null references appointment_types (id),
  google_event_id text,
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  status appointment_status not null default 'pending_approval',
  booked_via booked_via not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index appointments_business_id_idx on appointments (business_id, scheduled_start);
create index appointments_lead_id_idx on appointments (lead_id);

create trigger appointments_set_updated_at
  before update on appointments
  for each row execute function set_updated_at();

alter table appointments enable row level security;

create policy appointments_all on appointments
  for all using (is_staff_of(business_id));

-- ============================================================================
-- approval_queue (unified human-in-the-loop table)
-- ============================================================================

create table approval_queue (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  conversation_id uuid not null references conversations (id) on delete cascade,
  type approval_type not null,
  status approval_status not null default 'pending',
  payload jsonb not null default '{}'::jsonb,
  magic_link_token text unique not null default encode(gen_random_bytes(24), 'base64url'),
  requested_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  responded_at timestamptz,
  responded_by uuid references staff (id) on delete set null,
  response_channel response_channel
);

create index approval_queue_business_id_idx on approval_queue (business_id, status);
create index approval_queue_conversation_id_idx on approval_queue (conversation_id);
create index approval_queue_expires_idx on approval_queue (status, expires_at);
create unique index approval_queue_token_idx on approval_queue (magic_link_token);

alter table approval_queue enable row level security;

create policy approval_queue_all on approval_queue
  for all using (is_staff_of(business_id));

-- ============================================================================
-- audit_log (append-only)
-- ============================================================================

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  actor_type audit_actor_type not null,
  actor_id text,
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_business_id_idx on audit_log (business_id, created_at desc);

alter table audit_log enable row level security;

create policy audit_log_select on audit_log
  for select using (is_staff_of(business_id));

-- Append-only: no update/delete policy is created, and privileges are
-- revoked explicitly so even a bug in application code can't mutate history.
revoke update, delete on audit_log from authenticated, anon;

create policy audit_log_insert on audit_log
  for insert with check (is_staff_of(business_id));

-- ============================================================================
-- subscriptions (Stripe sync)
-- ============================================================================

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  stripe_subscription_id text unique not null,
  stripe_price_id text not null,
  status subscription_status not null,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_business_id_idx on subscriptions (business_id);

create trigger subscriptions_set_updated_at
  before update on subscriptions
  for each row execute function set_updated_at();

alter table subscriptions enable row level security;

create policy subscriptions_select on subscriptions
  for select using (is_staff_of(business_id));

-- Subscriptions are only ever written by the Stripe webhook via the
-- service_role key, which bypasses RLS — no write policy for authenticated
-- users is intentional.
