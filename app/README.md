# MyWorkFlo

MyWorkFlo is an AI front desk for HVAC and home-service teams. Calls still ring the business first — when one is missed, MyWorkFlo texts the customer back in seconds, qualifies the job, spots emergencies, and books the appointment under owner-controlled rules (Draft / Assisted / Autopilot modes).

- Marketing site: [myworkflo.com](https://myworkflo.com) (static, in `../landing/`)
- App: [app.myworkflo.com](https://app.myworkflo.com) (this Next.js project)

## Stack

Next.js (App Router) · Supabase (auth, Postgres) · Twilio (SMS + voice bridging) · Google Calendar · Stripe.

## Development

```bash
npm install
npm run dev
```

The single inbound-message pipeline lives in `lib/messaging/process-inbound.ts` — both the Twilio SMS webhook and the dev simulator call it. Guardrails and decide-action logic are unit-tested (`npm test`).
