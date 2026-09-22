# MyWorkFlo App — UI/UX Design Audit

**Date:** 2026-09-22 · **Scope:** `app/` Next.js product (app.myworkflo.com) — login, onboarding, dashboard, settings, lead detail, approvals, activity, SMS-token approval page.
**Method:** Full source read of every page/component in scope, plus live verification in the running app (localhost:3002) at desktop width and 390 px mobile width. Design-system source of truth: `.interface-design/system.md` (locked 2026-09-22).
**Out of scope:** Marketing copy quality, the separate static landing project (`landing/`), backend behavior.

---

## Executive Summary

The 09-22 redesign gave the app a genuinely credible operational shell: the sidebar/topbar/tab-bar chrome, dashboard home, leads list, approvals list, and activity feed all follow the locked system (cool near-white canvas, white cards, single indigo accent, triage color rails, week-strip schedule) and read as a calm, trustworthy dispatch tool — the right feel for an HVAC owner.

The audit found the risk is concentrated in four places:

1. **The core operator workflow (approvals) is missing context.** Approval cards show only a draft snippet — no customer name, no link to the conversation. An owner is asked to approve outbound texts blind. This is the single highest-impact UX problem in the product.
2. **The redesign stopped at the list pages.** Lead detail, Settings (and all its editors), and the SMS-token approval page still use the pre-redesign visual language (sharp `rounded-lg/md` cards, no shadow, rectangular buttons, raw enum text like `CUSTOMER · QUEUED`). The seams are visible exactly where trust matters most — the conversation record.
3. **There are no loading or error states at the route level.** Zero `loading.tsx` / `error.tsx` files exist. Every navigation blocks on Supabase queries with no feedback; any server error shows the default Next.js crash page. On a phone in the field this reads as "the app is frozen/broken."
4. **Two silent-data-loss traps in forms:** the onboarding appointment-types step discards unsaved card edits when "Continue" is tapped, and approving/declining an approval never refreshes the queue or the bell badge.

Everything else is polish-tier: contrast failures on muted text and pastel chips, dead click zones on the leads table, dev/demo utilities occupying prime dashboard space, and a visible grammar bug on the onboarding finale ("Weldon Heating're set up").

---

## Current UX State

| Surface | System compliance | State |
|---|---|---|
| Shell (sidebar, topbar, mobile tab bar) | ✅ Redesigned | Solid |
| Dashboard home | ✅ Redesigned | Solid, but quick-action zone misused |
| Leads list | ✅ Redesigned | Solid; row-click affordance bug |
| Approvals list | ✅ Redesigned | Missing context links |
| Activity feed | ✅ Redesigned | Leaks raw metadata/UUIDs |
| **Lead detail** | ❌ Pre-redesign | Style drift + raw enums |
| **Settings + all editors** | ❌ Pre-redesign | Style drift + weak form UX |
| Onboarding shell/steps | ⚠️ Mixed | Good structure; shared editors drag it down |
| `/a/[token]` SMS approval | ❌ Pre-redesign | Good state handling, old visuals |
| Login | ⚠️ Minimal | Clean but zero context/trust scaffolding |
| Route loading/error states | ❌ Absent | None exist anywhere |

**Root URL behavior:** `app/page.tsx` is a pure redirect — authenticated → `/dashboard`, else → `/login`. The app itself has **no public landing page**; the marketing site is a separate Vercel project on myworkflo.com. See "CTA and Conversion UX" for the architectural assessment.

---

## Primary User Journey

The operator's core loop, as built:

1. **Alert** — bell badge / (future) push / SMS magic link → something needs approval.
2. **Triage** — dashboard "Needs your attention" list with color rails (red=emergency, green=booking, blue=message, amber=review). This part is well designed — the rail signature makes urgency scannable.
3. **Decide** — Approvals page → **breaks down here.** The card shows type + draft text + timestamps only. No customer name, no issue, no thread. The operator's actual question — "is this the right thing to text *this customer*?" — can't be answered from the card, and there is no link to the conversation to find out.
4. **Verify/follow up** — Lead detail thread → visually the weakest page in the product (see drift), and messages carry no timestamps.

The journey from alert → triage is excellent; the journey from triage → confident decision is broken by the missing context. Secondary journeys (check schedule, look up a lead, adjust settings) all function.

---

## Visual Design Assessment

**What works (keep):**
- One-accent discipline: indigo carries selection/action; brass stays in the logo; semantic pastels only mean status. The 60/30/10 balance on redesigned pages is genuinely good.
- The triage rail + dashed-separator row signature is distinctive and product-true — urgency made visible for a dispatch tool.
- Type hierarchy via weight+color at mostly one or two sizes (per system) holds up on screen; greeting → stat strip → cards has a clear focal cascade.
- Whisper borders + single `shadow-card` = one depth strategy, consistently applied on redesigned surfaces.

**Issues:**

- **Severity: Medium** · `app/dashboard/leads/[id]/page.tsx`, `app/dashboard/settings/settings-client.tsx`, all `app/_components/settings/*-editor.tsx`, `app/a/[token]/page.tsx`
  **What:** These surfaces use `rounded-lg`/`rounded-md` corners, no `shadow-card`, rectangular buttons, and hand-rolled card markup instead of the `Card`/`CardHeader` primitives. The Settings control-mode panel adds an off-system tinted container (`border-accent-blue/30 bg-accent-blue/5`).
  **Why:** The product's perceived quality is set by its *least* polished screen, and these are the screens where an operator inspects real customer conversations and where a buyer picks a plan. The visible seam reads as "unfinished."
  **Recommendation:** Mechanical migration pass: replace containers with `Card`, radii with the locked scale (cards 16px, controls 12px, buttons/chips pill), buttons with the two documented button recipes, and delete the tinted control-mode panel in favor of a plain `Card`.

- **Severity: Medium** · `app/dashboard/leads/[id]/page.tsx:171` (thread bubbles), `app/dashboard/activity/page.tsx:20-28`
  **What:** Raw internal enums and metadata rendered verbatim: `CUSTOMER · DELIVERED`, `AI · QUEUED`, `approval_id: a57b5c11-…` (full UUIDs), `response_channel: magic_link`, actor chips `ai`/`staff`.
  **Why:** The system.md explicitly requires humanized codes; UUIDs and uppercase enums are developer language that erodes the "dependable front desk" feel and adds scan noise.
  **Recommendation:** Humanize sender/status ("You", "AI — sent", "AI draft — awaiting your approval"), replace the metadata key:value dump with per-event-type summary templates, and drop IDs entirely from operator-facing UI.

- **Severity: Low** · `app/dashboard/settings/page.tsx:50`, lead detail `max-w-3xl`
  **What:** Content max-widths vary (6xl / 5xl / 3xl) across sibling pages.
  **Why:** Page-to-page width jumps make navigation feel like switching products.
  **Recommendation:** Standardize on `max-w-6xl` (a narrower inner column for the thread is fine *inside* the grid).

---

## Layout and Information Architecture

- **Severity: Medium** · `app/dashboard/page.tsx:228-249` (quick-actions zone)
  **What:** The dashboard's second content zone is Settings, SMS simulator, Add-to-home-screen, and Push notifications — utility/dev cards. "Enable push notifications" is the **only filled primary button on the home page**, making a permissions demo the strongest CTA on the operator's main screen. `PushDemo` even ships a test-message input + "Send test" button, and its error path prints `NEXT_PUBLIC_VAPID_PUBLIC_KEY — run npx web-push generate-vapid-keys` to the UI.
  **Why:** Prime real estate should serve the daily loop (today's jobs, recent conversations). A dev tool with env-var error text on the home screen undermines trust the moment something misfires.
  **Recommendation:** Collapse install+push into a single dismissible setup card (part of a "Setup checklist" — see Dashboard UX), move the simulator behind Settings or a "Try it" entry, and never render env/CLI text — replace with "Push isn't available yet."

- **Severity: Medium** · `app/dashboard/settings/settings-client.tsx:22-32`
  **What:** Settings is 8 collapsed `<details>` accordions with a 12px `›` marker. Everything — including setup-critical Calendar connection and Billing — is hidden behind uniform closed rows.
  **Why:** Zero information scent: an owner looking for "why isn't the AI booking real slots?" sees eight identical gray bars. Critical incomplete setup (calendar not connected, no plan) is invisible.
  **Recommendation:** Replace accordions with always-open `Card` sections (settings pages are read rarely; hiding saves nothing), or at minimum auto-open sections in an incomplete state and add status chips to the summary rows ("Calendar — Not connected" in amber).

- **Severity: Low** · `app/dashboard/settings/page.tsx:53`
  **What:** Header shows the raw IANA string `America/New_York`; Staff rows show `5102200631` unformatted and `OWNER` uppercase.
  **Why:** Violates the humanize rule; unformatted phone numbers are hard to verify at a glance.
  **Recommendation:** "Eastern Time"; format phones `(510) 220-0631`; "Owner".

- **Severity: Low** · `app/dashboard/activity/page.tsx:45`
  **What:** Flat list of 100 events, no day grouping, silent truncation at 100.
  **Recommendation:** Group by day ("Today", "Yesterday", date), add a "Showing last 100" footer.

---

## Navigation and Flow

- **Severity: Medium** · `app/dashboard/leads/page.tsx:157-180`
  **What:** Desktop leads table rows show a full-row hover tint, but only the Customer cell is a link — clicking Issue/Messages/Status/Last-activity does nothing. (Reproduced live: a click on the row failed to navigate.)
  **Why:** Hover affordance promises row-level click; ~70% of the row is dead. For the app's most-used list this is repeated daily friction.
  **Recommendation:** Make the whole row navigate (a spanning link + `position:relative` on the row, or `onClick` with proper keyboard fallback on the existing link).

- **Severity: Low–Medium** · `app/dashboard/page.tsx:133`
  **What:** The "Upcoming appointments" stat links to `/dashboard/leads` — a list of conversations, not appointments.
  **Why:** Clicking a number about appointments and landing on chats breaks the expectation the stat set up.
  **Recommendation:** Link to the dashboard schedule card (anchor) until a real schedule page exists — or make this stat non-clickable.

- **Severity: Low** · `app/login/page.tsx`
  **What:** An already-authenticated user who hits `/login` sees the sign-in form again (no session check/redirect).
  **Why:** Users returning via a bookmarked login link get a confusing "sign in again" moment.
  **Recommendation:** On mount (or server-side), if a session exists redirect to `next`/`/dashboard`.

- **Severity: Low** · shell — detail pages on mobile
  **What:** Mobile top bar never shows a back affordance or page title; back navigation relies on the small inline "← Back to leads" link.
  **Recommendation:** On sub-pages, swap the brand slot for `← Leads` + page title on mobile.

---

## CTA and Conversion UX

**Is `/` a real landing page?** No — it is an auth redirect (`app/page.tsx:10`). As product architecture this is **acceptable**, because the public landing exists on the separate marketing project (myworkflo.com) and app.myworkflo.com is intentionally the workspace. It becomes a conversion problem only at the seam:

- **Severity: Medium** · `app/login/page.tsx`
  **What:** The login page is the de-facto front door for every shared/bookmarked app link, and it renders a logo, "Sign in," one sentence, and a Google button — no statement of what the product is, no link back to the marketing site, no Privacy/Terms links (which exist at `/privacy` and `/terms` and matter for Google OAuth trust review too).
  **Why:** A dispatcher invited by the owner, or a prospect who got an app link, hits a context-free wall. Legal links at the auth boundary are a standard trust signal (and Google's OAuth consent reviewers look for them).
  **Recommendation:** Keep it minimal, add three small elements: a one-line product descriptor under the wordmark, a "New here? See how MyWorkFlo works → myworkflo.com" link, and a muted footer row: Privacy · Terms.

- **Severity: Medium** · `app/onboarding/plan/page.tsx:47-59` and duplicated in `settings-client.tsx:173-188`
  **What:** The only monetization moment renders three bare rows — name + price ($119/$299/$599) — with zero differentiation, no recommended tier, no mention of what changes between tiers, no trial framing.
  **Why:** This is a pure decision-support failure (structure, not copywriting): a 5× price spread with no comparison axis stalls the decision or defaults users to "Skip for now."
  **Recommendation:** Three `Card` tiles with 2–3 differentiating feature bullets each, a "Most popular" chip on the intended default, and the skip link kept but visually subordinate.

- **Severity: Low** · dashboard
  **What:** The strongest visual CTA on home is "Enable push notifications" (covered above) — the app's conversion-relevant actions (connect calendar, pick a plan, upgrade from Draft mode) have no home-screen presence at all.
  **Recommendation:** Setup-checklist card (see Dashboard UX) becomes the single guided CTA surface.

---

## Onboarding UX

**Strengths:** 8 thin steps with a segmented progress bar + "Step N of 8", autofocus on first fields, honest helper text ("Where emergency alerts and approval texts go"), pre-filled appointment types, explicit skip paths on Calendar and Plan, graceful degradation when Google Calendar/Stripe aren't configured. This is a well-shaped wizard.

**Issues:**

- **Severity: High** · `app/onboarding/appointment-types/appointment-types-step.tsx:14-22` + `appointment-types-editor.tsx`
  **What:** Each appointment-type card has its own "Save"; the step's "Continue" button only navigates. Editing a card (e.g., unchecking issues, adding pricing) and tapping Continue **silently discards the edits**.
  **Why:** Silent data loss during first-run setup — the user believes the AI is configured the way they left the screen. This directly corrupts the product's core behavior (which visits the AI may book).
  **Recommendation:** Either make Continue save all dirty cards, or disable Continue while any card is dirty with a "You have unsaved changes" hint. Same pattern applies in Settings.

- **Severity: Medium** · `app/onboarding/done/page.tsx:17`
  **What:** `{business?.name ?? "You"}’re set up` renders **"Weldon Heating're set up"** for every named business.
  **Why:** A visible grammar bug at the emotional peak of onboarding — the last impression of setup is a typo. (This is a UI string bug, not copy critique.)
  **Recommendation:** `"{name} is set up"` / fallback `"You're set up"`.

- **Severity: Medium** · `app/_components/settings/onboarding-shell.tsx`
  **What:** No back affordance anywhere in the wizard — the progress segments aren't interactive and there's no Back button; browser-back is the only path.
  **Why:** Users second-guess earlier answers (hours, service area) mid-wizard; with no visible way back some will abandon or re-enter data wrongly.
  **Recommendation:** Muted "← Back" text button beside each step title (data already persists per step, so revisiting is safe).

- **Severity: Low** · `appointment-types-editor.tsx:124`
  **What:** The issue-type checklist is a `max-h-40 overflow-y-auto` box — a nested scroll region inside the page scroll, on mobile inside a 390px column; checkboxes also misalign against two-line labels.
  **Recommendation:** Remove the max-height in onboarding (show all 14), `items-start` the checkbox rows.

- **Severity: Low** · `app/onboarding/business/page.tsx`
  **What:** Direct navigation to `/onboarding/business` with an existing business re-shows the create form (only `/onboarding` root redirects).
  **Recommendation:** Apply the staff-exists redirect on the business step too.

---

## Dashboard UX

- **Severity: High (workflow)** · `app/dashboard/approvals/page.tsx:22-27` + `approval-card.tsx`
  **What:** Approval cards render type chip, draft text, requested time, and expiry — **no customer name, no issue, no link to the conversation** (the query doesn't even select `conversation_id`). The dashboard "Needs your attention" rows likewise all link to the generic approvals page, not the underlying lead.
  **Why:** Approving an outbound SMS is the product's highest-stakes recurring decision. Without "who is this going to, about what," the operator either rubber-stamps blind or hunts through Leads to correlate — at odds with the 15-minute expiry timer.
  **Recommendation:** Select the join (lead name/phone, issue) into each card; add "View conversation →" linking to `/dashboard/leads/[id]` (where `ApprovalCard` already renders in context); make dashboard attention rows deep-link to the lead.

- **Severity: Medium** · `approval-card.tsx:34-38`
  **What:** After Approve/Decline the card flips to a text label but stays in the list; the bell badge and "Need your attention" count are server-rendered and go stale until a manual reload.
  **Why:** The queue appears perpetually non-empty; operators can't trust the badge — the exact signal the product is selling.
  **Recommendation:** `router.refresh()` on resolution (removes resolved items and re-counts the badge), ideally with a brief success state before the refresh.

- **Severity: Medium** · approvals urgency encoding · `approval-card.tsx:44` vs `dashboard/page.tsx:19-24`
  **What:** The dashboard rail maps emergency=red / booking=green / message=blue / other=amber, but on the Approvals page every card's type chip is amber — including "Emergency escalation."
  **Why:** The triage color language (the product's signature) breaks on the page where triage actually happens; emergencies don't pop.
  **Recommendation:** Reuse the same tone mapping for the chip (and consider a red left rail on emergency cards) and sort emergencies first.

- **Severity: Medium** · missing "today at a glance" continuity
  **What:** With no pending approvals the home page's primary card is a static "All clear" empty state; there is no view of today's booked jobs in the main column (schedule sits in the rail), no recent-conversations module, and no setup checklist (calendar not connected, no Twilio number, no plan — all invisible here).
  **Why:** "What needs me right now?" is answered, but "what's happening today?" — the dispatcher's second question — requires two more navigations; and incomplete setup (the biggest activation risk) is never surfaced.
  **Recommendation:** When the attention list is empty, promote today's appointments + last 3 conversations into the main column; add a dismissible setup-checklist card (Connect calendar · Pick a plan · Enable push) that replaces the current utility-card sprawl.

- **Severity: Low** · `greeting.tsx` / stat strip
  **What:** Fallback greeting is "Good morning, there"; stat labels sit at 11px muted (see contrast); the mobile control-mode chip is hidden (`hidden sm:block`), so phone users see their AI's autonomy mode nowhere on home.
  **Recommendation:** Fallback to plain "Good morning"; show the mode chip on mobile under the greeting — Draft vs Autopilot is core mental-model state.

- **Severity: Low** · `appointments-schedule.tsx`
  **What:** Paging weeks away offers no "back to today" affordance, and selecting a day in a paged week keeps the old selected date highlighted-off-screen.
  **Recommendation:** Add a "Today" text button next to the chevrons when `weekStart` ≠ current week; auto-select the first day when paging.

---

## Mobile UX

Verified live at 390 px: the shell (sticky top bar, bottom tab bar with safe-area padding, `pb-24` content), stacked stat strip, leads card list, settings stack, and onboarding steps all lay out correctly. Mobile ordering on the dashboard (stats → attention → schedule → actions) matches the system doc. This is in good shape.

- **Severity: Medium** · lead detail thread on mobile
  **What:** The drifted lead-detail page is most-used on mobile (tapping through from an SMS alert); its dense fact tiles, unstyled bubbles, and missing per-message timestamps hit hardest at 390 px.
  **Recommendation:** Prioritize the lead-detail restyle mobile-first.

- **Severity: Low–Medium** · touch targets
  **What:** Keyword-chip remove "×" (`emergency-keywords-editor.tsx:73`) is ~16 px; hours-editor native checkboxes and time inputs are below 40 px; table-row link target on leads is the text only.
  **Why:** WCAG target-size and fat-thumb reality for field use.
  **Recommendation:** Pad removes to ≥40 px hit area (pseudo-element), taller form controls in editors.

- **Severity: Low** · `app/dashboard/leads/page.tsx:94-102`
  **What:** Mobile search input uses `bg-card` while the system defines inputs as inset `bg-paper`; minor token drift.
  **Recommendation:** Align (card-on-paper context makes `bg-card` defensible — if kept, document it in system.md).

---

## Accessibility Issues

- **Severity: Medium–High** · `globals.css` `--muted: #7d8494`
  **What:** Muted text on white measures ≈ 3.7:1 (≈ 3.5:1 on paper) — below WCAG AA 4.5:1 — and it's used for *functional* text: stat labels (11 px), timestamps, table headers, empty-state subtext, mobile tab labels (inactive).
  **Why:** This is most of the app's secondary information, unreadable in sunlight — a field-use product's worst case.
  **Recommendation:** Darken `--muted` to ≈ `#6b7280` (4.6:1 on white) and reserve `--faint` for true decoration; re-check `--faint` placeholder usage (≈ 2:1).

- **Severity: Medium** · chip palette (`Chip`, rails, badges)
  **What:** The pastel pairs measure ≈ 4.0–4.3:1 (amber `#9c680d`/`#fdf2da` ≈ 4.2, red `#d0432c`/`#fdeae5` ≈ 4.0, green `#15855c`/`#e0f4eb` ≈ 4.1) at 12 px medium — all just under AA.
  **Recommendation:** Darken the five `gauge-*` text tones ~10% (e.g., amber → `#7d5407`); the softs can stay.

- **Severity: Medium** · status communicated by color alone
  **What:** Triage rails and control-mode dots encode meaning purely in hue (red/green/blue/amber bars; the rails are even `aria-hidden` on Activity), with no text equivalent for rail semantics anywhere.
  **Recommendation:** The adjacent labels mostly carry the meaning — ensure they always do (e.g., emergency rows also say "Emergency"), and add `sr-only` urgency text where the label doesn't (schedule event bars).

- **Severity: Low–Medium** · `dashboard-shell.tsx:84-95`
  **What:** The search input has no accessible name (placeholder only) and no visible submit; the desktop header avatar is a decorative `aria-hidden` span that looks interactive but isn't.
  **Recommendation:** `aria-label="Search leads"` on the input; either make the avatar a menu (account/sign-out) or visually de-emphasize it.

- **Severity: Low** · week strip · `appointments-schedule.tsx:117-135`
  **What:** Day buttons expose only "Mo 22" as an accessible name (no month/year), and `aria-pressed` on a date-picker pattern is unusual (a radiogroup or `aria-selected` listbox is the conventional semantics).
  **Recommendation:** `aria-label` per button ("Monday, September 22 — 2 appointments").

**Positives worth keeping:** global `:focus-visible` outline in `globals.css`; real `<button>`/`<a>` elements throughout (no div-clicks); `aria-label`s on bell, chevrons, and the mobile settings link; native `<details>` keyboard behavior; `text-wrap: balance` on headings; `tabular-nums` on dynamic numbers.

---

## Component/System Consistency

- **Severity: Medium** · primitives ignored on drifted pages
  **What:** `Card`/`CardHeader`/`Chip` exist precisely to prevent re-rolled class strings, yet lead detail, settings, the editors, and `/a/[token]` hand-roll containers, chips (`approval-card.tsx:44` re-implements `Chip` inline), and buttons in three different shapes (`rounded-md`, `rounded-full`, `rounded-lg`).
  **Recommendation:** Adopt primitives everywhere; add a `Button` primitive (primary/secondary/danger, one height scale) to `ui.tsx` — buttons are currently the most-duplicated string in the codebase.

- **Severity: Low–Medium** · form controls
  **What:** Native unstyled checkboxes and `type="time"`/`type="number"` inputs across the editors clash with the polished shell (and per system.md, controls get dedicated tokens).
  **Recommendation:** Minimum viable pass: `accent-color: var(--accent-blue)` globally, consistent input recipe (`rounded-xl border-line bg-paper focus:border-accent-blue/50`) applied to every editor input.

- **Severity: Low** · timestamp formats
  **What:** Four formats coexist: relative ("2h ago") on lists, `toLocaleString()` full dumps on approval cards, compact absolute on activity, date-only tiles on lead detail — and per-message times are missing entirely in threads.
  **Recommendation:** Codify in system.md (already partially there) and add a shared `formatRelative`/`formatCompact` util — the function is currently copy-pasted in two files with diverging behavior.

- **Severity: Low** · `SavedFlash` placement (`settings-client.tsx:34-37`)
  **What:** The "Saved." confirmation renders *above* the section content, far from the Save button that triggered it, and disappears in 2 s.
  **Recommendation:** Inline confirmation next to the button (or transient check on the button itself).

---

## Highest-Risk UX Problems

1. **Approvals lack conversation context and deep links** — the core decision loop asks for blind approval under a 15-minute timer. *(High)*
2. **Onboarding appointment-types "Continue" silently discards unsaved edits** — first-run misconfiguration of the AI's booking behavior. *(High)*
3. **No route-level loading or error states anywhere** — frozen-feeling navigations and raw crash pages on a product whose pitch is reliability. *(High)*
4. **Stale approvals queue/badge after acting** — operators can't trust the "needs you" signal. *(Medium-High)*
5. **Muted-text and chip contrast below AA** — secondary info illegible in field conditions. *(Medium-High)*
6. **Pre-redesign drift on lead detail / settings / token page** — visible quality seam on the highest-trust surfaces. *(Medium)*
7. **Leads table dead-row clicks** — daily friction on the most-used list. *(Medium)*
8. **"{Business}'re set up"** grammar bug at onboarding's finale. *(Medium, trivial fix)*

---

## Recommended UI/UX Direction

**Do not re-derive the direction — it's right.** The locked system (calm operational canvas, one indigo accent, triage-rail signature, week-strip schedule) fits the HVAC owner/dispatcher persona: it looks like dependable dispatch software, not an AI demo. The work is *finishing* it:

1. **Propagate, don't redesign:** migrate the four drifted surfaces onto the existing primitives and radius/shadow/button recipes. Add `Button` to `ui.tsx` first so the migration is mostly find-and-replace.
2. **Context-first approvals:** make every approval renderable as "WHO · WHAT ISSUE · the draft · when/expiry · [View conversation]". This one change converts the product's signature from decorative to functional.
3. **States as a feature:** per-route `loading.tsx` skeletons that mirror each page's real card geometry (shell stays static, so perceived speed is high), one branded `error.tsx`, and `router.refresh()` after every mutating action.
4. **Humanize every string the system generates:** enums, metadata, timezones, phone numbers, language codes. The system.md rule ("issue codes are always humanized") should be treated as covering *all* machine text.
5. **Contrast pass on the token file only:** darken `--muted` and the five `gauge-*` text tones; nothing else in the palette needs to move.
6. **Home page earns the operator's morning:** attention list stays the hero; empty state promotes today's schedule + recent conversations; a setup checklist replaces the utility-card sprawl until setup is complete.

---

## Suggested Landing Page UX Structure

The app's `/` should remain an auth redirect — but the **login page needs micro-landing scaffolding** (it is the de-facto front door of app.myworkflo.com):

```
[logo + wordmark]
[one-line descriptor: what MyWorkFlo does]        ← orientation for invited staff
[Continue with Google]  (primary)
[email-link fallback]   (existing progressive disclosure — keep)
[New here? See how it works → myworkflo.com]      ← escape hatch to marketing
[Privacy · Terms]                                  ← trust + OAuth-review requirement
```

For the marketing landing itself (separate project — structural guidance only, since it's the top of this product's funnel):

1. **Hero:** headline + subline, primary CTA ("Start setup" → app login), secondary CTA ("See it work" — link/animation of the SMS flow), and a *product visual*: a phone-shaped SMS thread mock (the actual product moment: missed call → text-back), not a dashboard screenshot.
2. **How it works — 3 steps:** missed call → AI texts & qualifies → booked on your calendar / escalated to you. Mirror the app's triage-rail color language for continuity.
3. **Control-mode explainer:** the Draft/Assisted/Autopilot trio is the trust story; present as three cards (reuse app UI patterns).
4. **Trust block:** emergency-handling guarantee, SMS consent/compliance note, privacy/terms links — this product texts *their customers*, so safety signals belong above pricing.
5. **Pricing:** the same three differentiated tiers recommended for the in-app plan step (keep the two consistent).
6. **FAQ + final CTA.**

---

## Priority Fix List

**P0 — workflow correctness (do first)**
1. Add lead context + "View conversation" links to approval cards; deep-link dashboard attention rows to leads. *(High)*
2. Fix onboarding appointment-types unsaved-edit loss (Continue saves, or blocks while dirty). *(High)*
3. `router.refresh()` after approve/decline (and sign-out edge cases); badge/count stay truthful. *(High)*
4. Fix "…'re set up" grammar on `/onboarding/done`. *(Medium, 1-line)*
5. Make leads-table rows fully clickable. *(Medium)*

**P1 — perceived quality and legibility**
6. Add `loading.tsx` skeletons (dashboard, leads, lead detail, approvals, activity, settings) + one branded `error.tsx`. *(High)*
7. Contrast pass: `--muted` → ~#6b7280; darken the five `gauge-*` text tones. *(Medium-High)*
8. Migrate lead detail to the design system: `Card` primitives, pill buttons, humanized sender/status, per-message timestamps, status chip in header. *(Medium)*
9. Migrate Settings + editors: cards instead of accordions (or status-labeled accordions), styled controls (`accent-color`, input recipe), formatted timezone/phones, plan tiles with differentiation. *(Medium)*
10. Activity feed: humanized event summaries, no UUIDs, day grouping. *(Medium)*

**P2 — flow and polish**
11. Dashboard: setup-checklist card; demote/remove push-demo & simulator cards; promote today's schedule + recent conversations when attention list is empty; show control-mode chip on mobile. *(Medium)*
12. Login: product one-liner, marketing-site link, Privacy/Terms footer; redirect authed users. *(Medium)*
13. Approvals page: type-consistent chip colors, emergencies sorted first with red rail. *(Medium)*
14. Onboarding: visible Back control; un-cap the issue checklist scroll box; guard `/onboarding/business` re-entry. *(Low-Medium)*
15. A11y details: search input label, week-strip day labels, ≥40px hit areas on chip removes/editor controls, "Upcoming appointments" stat link target. *(Low-Medium)*
16. Consistency sweep: shared `Button` primitive, single relative-time util, `max-w-6xl` everywhere, `/a/[token]` restyle. *(Low)*

---

*Verification notes: all layout claims checked live at 1456px and 390px; the settings-page background "cut-off" seen during scrolling screenshots was confirmed to be a capture artifact (body/sidebar measure the full 2826px scroll height) and is not reported as a bug. Contrast ratios computed from the token hex values in `globals.css`.*
