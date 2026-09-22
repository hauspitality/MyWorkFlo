-- Simulated traffic (dev simulator / test drives) is flagged on the
-- conversation so it never mixes with real customer threads: the pipeline
-- reuses only same-kind conversations and skips real-world side effects
-- (staff notifications, calendar events) for simulated ones.
alter table conversations add column if not exists is_simulation boolean not null default false;
