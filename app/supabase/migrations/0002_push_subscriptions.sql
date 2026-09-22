-- MyWorkFlo — push notification subscriptions
-- Web Push (VAPID) subscriptions for the installed PWA / browser push. Each
-- row is one browser/device's subscription for one staff member. No
-- business logic writes to this table yet — a future webhook/AI-engine
-- event (e.g. an approval_queue insert) will eventually call
-- lib/push/send.ts against it; this migration only lays down durable
-- storage + RLS for that future hookup.

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  staff_id uuid not null references staff (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create unique index push_subscriptions_endpoint_unique on push_subscriptions (endpoint);
create index push_subscriptions_business_id_idx on push_subscriptions (business_id);
create index push_subscriptions_staff_id_idx on push_subscriptions (staff_id);

alter table push_subscriptions enable row level security;

create policy push_subscriptions_all on push_subscriptions
  for all using (is_staff_of(business_id));
