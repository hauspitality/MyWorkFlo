# MyWorkFlo Interface System

Direction locked 2026-09-22 against three reference dashboards (Mondays-style SaaS shell, Schoolar density, teal-dashboard schedule treatment). Any new screen must follow this file — do not re-derive the direction.

## Feel

Calm, dependable, operational. An HVAC owner/dispatcher between jobs asking "what needs me right now?" Not a marketing page, not futuristic AI.

## Palette (tokens in `app/globals.css`)

- Canvas `--paper #f5f6f8` (cool near-white) · cards `--card #fff`
- Text ramp: `--ink #171921` / `--ink-soft #454b57` / `--muted #7d8494` / `--faint #abb1bd`
- Borders: `--line #e9ebef` (whisper) / `--line-strong #d9dce3`
- One accent: `--accent-blue #4c5ef5` (+ `-deep`, `-soft`). Color is scarce; gray builds structure.
- Semantic pastels (chip bg + text pairs): `gauge-green/-soft`, `gauge-amber/-soft`, `gauge-red/-soft`, `gauge-blue/-soft`, `gauge-pink/-soft`
- Brass (`#96692c`) lives ONLY in the logo mark — never in UI chrome.

## Depth — one strategy

Whisper border (`border-line`) + single soft shadow (`shadow-card`, defined in @theme). No other shadows, no gradients, no decorative blobs. Radius scale: cards `rounded-2xl` (16px), controls/tiles `rounded-xl` (12px), chips/buttons/search `rounded-full`.

## Typography (Switzer)

- Page greeting/title: `text-3xl lg:text-4xl font-semibold tracking-tight` (dashboard) or `text-2xl lg:text-3xl` (list pages)
- Section/card headers: `text-[15px] font-semibold text-ink`
- Body `text-sm`, meta `text-xs text-muted`, chips `text-xs font-medium`
- All dynamic numbers: `tabular-nums`
- Hierarchy comes from weight + color tiers, not size jumps.

## Signature elements

- **Triage rail**: rows (attention list, activity log, schedule events) carry a `h-9 w-1 rounded-full` left color bar — red=emergency, green=booking, blue=message/routine, amber=review. This is the product's emergency-triage wedge made visible.
- **Week-strip schedule**: 7-day strip, selected day = solid accent circle (`h-8 w-8 rounded-full bg-accent-blue text-white`), today = accent text, appointment dot under day. Events as bar+title+time rows with dashed separators.
- **Pill stat strip**: one Card `grid grid-cols-3 divide-x divide-line sm:rounded-full`; icon + bold number + muted label per cell. Mobile: stacked number-over-label.
- Row separators inside cards: `border-t border-dashed border-line` (Mondays notes treatment).

## Shell

- Sidebar 256px white, `border-r border-line`; active nav = solid `bg-accent-blue text-white rounded-xl` pill; inactive `text-ink-soft hover:bg-paper`.
- Desktop top bar: white, `border-b border-line`; left = search field (`rounded-full bg-paper` inset, submits `q` to /dashboard/leads); right = bell (badge `bg-gauge-red`) · divider · avatar.
- Business name + control-mode dot live at sidebar bottom, above user email + sign out.
- Mobile: sticky top bar (brand + bell + avatar→settings), bottom tab bar, content `pb-24`. Wrapper: `lg:flex lg:min-h-dvh`.

## Reusable primitives — `app/_components/ui.tsx`

`Card`, `CardHeader` (title + count badge + "See all" action), `Chip` (tone: blue|green|amber|red|pink|neutral), `InitialAvatar` (letter or person glyph for phone-only leads, `bg-accent-blue-soft text-accent-blue-deep`). Use these, never re-roll the class strings.

## Status chip mapping

active=blue · awaiting_staff_approval=amber · booked=green · escalated_*=red · closed=neutral. Control mode dot: draft=blue, assisted=amber, autopilot=green.

## Spacing & misc

- 4px base; card padding `px-5 sm:px-6`, page `px-4 sm:px-6 lg:px-8`, section gaps `gap-4`/`mt-6`.
- Content max width `max-w-6xl`.
- Issue codes are always humanized (`NO_COOLING` → "No cooling"), timestamps relative ("2h ago") in lists, compact absolute in logs.
- Buttons: primary `h-10 rounded-full bg-accent-blue text-[13px] font-semibold text-white hover:bg-accent-blue-deep`; secondary same with `border border-line text-ink-soft hover:bg-paper`.
- Inputs: `rounded-xl/full border-line bg-paper` (inset), `focus:border-accent-blue/50 focus:bg-card`. Global focus-visible outline set in globals.css.
- Empty states: centered icon (`text-faint` or `text-gauge-green` check) + `text-sm font-medium text-ink-soft` line + `text-xs text-muted` sub. No marketing copy.
- Mobile ordering on dashboard: stats → attention → schedule → quick actions (grid row/col placement keeps DOM order mobile-first).
