# MyWorkFlo — Revenue Viability Audit

**Date:** 2026-09-22 · **Scope:** business/product/revenue only — no code changes.
**Evidence base:** full product code walkthrough (every route, the AI pipeline, SMS strings, billing); the 10-persona simulated buyer study (`docs/persona-usability-swarm.md`, avg 4.8/10); the marketing claim audit (`docs/marketing-audit.md`, 58/100); `PRODUCT_SUMMARY.md`; live web verification of competitor pricing (sources at bottom).
**State caveat:** the product is moving fast — several blockers named in the persona study (context-blind approvals, hidden expiry, dishonest done-page, dead simulator branding, missing ROI surface) were fixed the same day this audit was written. Grades reflect tonight's state.

---

## Executive Summary

**The problem is real and the category is proven — this is not a "does anyone want this" question.** Contractors already pay $250–$720/mo for human answering services (Ruby), $300–$600/mo for AI receptionists, and Avoca — an AI front office for exactly this trade — raised at a ~$1B valuation serving ~1,000 operators at $1,100+/mo. Missed calls in home services are urgent (no-heat in January), frequent (owners in crawlspaces miss calls daily), and expensive (one recovered repair pays for a month; one replacement lead is $8–15k). Money is already changing hands for worse solutions.

**MyWorkFlo's genuine edge is trust engineering, and simulated buyers independently confirmed it.** 9 of 10 personas praised the emergency-safety architecture unprompted; Draft/Assisted/Autopilot "answered my robot fear before I asked it"; the SMS-native approval spine (YES/NO texts, no-login magic links) was repeatedly called the best-built part. In a category whose #1 objection is "the robot will embarrass me," this product's core differentiation is that it structurally cannot freelance. That is a sellable story.

**But the business is not currently sellable, for mechanical rather than conceptual reasons.** No phone number is provisioned, A2P 10DLC isn't registered, Google sign-in isn't configured, and Stripe isn't live in prod — so no customer can experience, buy, or benefit from the core loop today. The persona verdict was unanimous: *do not send real traffic yet.* The distance to sellable is weeks, not quarters — most of it is provisioning and configuration, not construction.

**$10k MRR is realistic only through a narrower wedge than the current three-tier story.** The $299 "office approval controls" and $599 "multi-location + CRM" tiers are sold to buyers (dispatchers, multi-location owners, 24/7 shops) the product cannot serve yet — one seat, no integrations, no on-call chain. The buyer who can be won *now* is the **1–5 tech owner-operator whose cell phone is the office**. At a realistic mix (~70% Starter), $10k MRR ≈ **55–60 customers ≈ 0.05% of US HVAC contractors** — a distribution problem, not a market-size problem. The honest constraint is founder-led sales capacity in a vertical where the founder has no existing distribution, sustained for ~12 months, while running parallel ventures.

**Recommendation: conditional GO.** Ship the live loop, run a 10-shop founder-led design-partner cohort in one region, and hold a hard kill/scale gate at day 90 on one metric: *recovered jobs per customer per month.* Details in the Go/No-Go section.

---

## Final Grade

| Dimension | Grade | One-line justification |
|---|---|---|
| Problem quality | **A−** | Proven category with existing spend ($250–$1,100+/mo alternatives); docked because MyWorkFlo answers the *text* half of a phone-shaped problem |
| Buyer urgency | **B** | Every missed call hurts, but buying is episodic — triggered by a bad week, a lost replacement job, or a fired answering service |
| Monetization potential | **B+** | $119–$299 undercuts everything credible; ~55–60 customers to $10k; no market-size constraint; needs real tier gating |
| Differentiation | **B−** | Safety architecture + control ladder is genuinely best-in-class per 10/10 personas; but SMS-only is also a ceiling, and the moat is copyable |
| Product readiness | **C** | Core loop cannot run live (no number, no A2P, auth/billing unconfigured); single seat; gap is weeks and closing daily |
| Trustworthiness | **B** | In-product honesty and locked safety scripts are excellent; landing overclaims mostly truth-passed today; the emergency alert chain is still unproven (single recipient, fire-once, English-only scripts) |
| Path to $10k MRR | **C+** | Credible plan exists but demands 12 months of founder-led sales against platform bundling, with split founder attention |
| **Overall business viability** | **B−** | Real problem, real differentiation, unproven distribution — a fundable wedge if the founder commits to it |

---

## Problem Assessment

**The exact problem:** a small home-service business misses inbound calls (owner in a crawlspace, tech on a roof, office closed) and each missed call is a lead that calls the next contractor in the search results. The secondary problem is after-hours emergency triage: distinguishing "no cooling, book me Tuesday" from "I smell gas" at 2am without paying a human to sit by the phone.

**Urgent?** Yes, asymmetrically. A missed no-heat call in January or a gas-smell call at 2am is as urgent as small-business problems get. A missed tune-up inquiry in April is not. The product's emergency architecture matters precisely because the *worst-case* missed call is catastrophic even though the *median* missed call is merely expensive.

**Frequent?** Yes. The persona study's owner-operator archetype ("I miss around five calls a day because I'm elbow-deep in an air handler") matches industry reality — this is a daily, structural failure mode of businesses where the answerer of the phone is also the doer of the work.

**Expensive?** Yes, and quantifiable: an HVAC diagnostic/repair ticket runs roughly $300–600; a system-replacement lead is $8–15k. The product's own landing math ("1 job can pay for the month") is the correct napkin and survives scrutiny at any plausible recovery rate.

**Who feels it most:** (1) the owner-operator whose cell *is* the business line — every missed call is personally felt and personally lost; (2) the 24/7 shop's after-hours manager carrying liability for mishandled emergencies; (3) the dispatcher drowning at 60 calls/day. Only the first can actually be served by the product today.

**Must-fix or nice-to-have?** Must-fix for shops with real call volume — proven by the fact that they already pay for answering services they mostly dislike. Nice-to-have for the very small solo operator who believes (usually wrongly) that he catches everything. The buying trigger is typically a *known lost job* — which is why the sales motion below is built around demonstrating the loss.

---

## Target Buyer Assessment

| Segment | Fit today | Notes |
|---|---|---|
| **Owner-operator, 1–5 techs** | ✅ **Sell now** | Owner feels the pain directly, owns the credit card, needs zero seats beyond his own. Persona "Ray" — the product's SMS spine was designed for exactly him. Price tolerance: $99–150 easily, more with proof. |
| Office manager / dispatcher (6–15 techs) | ⚠️ Blocked | The daily user of the $299 tier — but "Inviting additional staff is coming soon." The person Growth is sold to can't log in. Sell after multi-seat ships. |
| 24/7 emergency shop | ❌ Blocked | Needs on-call rotation, re-page, acknowledgment records, Spanish scripts. Persona "Dennis": "for a 24/7 team this isn't a missing feature, it's the whole product." Do not sell here yet — liability exceeds revenue. |
| Multi-location (2+) | ❌ Blocked | No multi-location model, no CRM sync. The $599 tier currently describes a product that doesn't exist. |
| Solo one-truck contractor | ⚠️ Marginal | Price-sensitive (persona "Gus"), lowest volume, highest support-to-revenue ratio. Take them if they come; don't hunt them. |

**Most likely to pay soonest:** the 1–5 tech HVAC owner-operator, self-serve or lightly assisted, at $119/mo. Every product strength (SMS approvals from a truck, Draft-mode trust ladder, no new software for staff) is aimed at him, and every product gap (seats, integrations, on-call chains) is something he doesn't need.

---

## Revenue Model Assessment

**Customers needed for $10k MRR (gross):**

| Price point | Customers needed |
|---|---|
| $99/mo | 102 |
| $119/mo (current Starter) | 85 |
| $199/mo | 51 |
| $299/mo (current Growth) | 34 |
| $499–599/mo | 17–21 |
| **Realistic mix** (70% Starter / 25% Growth / 5% Pro ≈ $188 blended) | **~54** |

**Is the market big enough?** Trivially. There are roughly 100k+ HVAC businesses in the US and ~500k home-service contractors in adjacent trades. 54 customers is ~0.05% of HVAC alone. Market size is not a risk at this revenue target; **acquisition is the entire game.**

**Which price is justified by value?** $119 is justified *today* by the Starter promise alone (missed-call text-back + qualification + emergency triage): it's half the price of Smith.ai's cheapest human plan and a quarter of Ruby's entry tier, for a product that also books. $299 is justified *only after* multi-seat, ROI reporting, and Assisted-mode maturity exist — currently nothing in the code gates any feature by tier, which both personas and the marketing audit flagged as a trust problem ("the tiers are either identical… or secretly different — scary").

**Value metric recommendation:** **per business location, tiered by automation level + seats, with a generous conversation cap as an abuse backstop.**
- *Don't* meter per message or per minute — that's the answering-service pricing trauma this product should position against ("Ruby charges $3.60/minute; we charge a flat month").
- *Don't* bill on "revenue recovered" — attribution fights with a contractor are unwinnable; use recovered-revenue as the *reporting* metric (the new 30-day results panel is exactly right), not the billing metric.
- Booked-jobs pricing is clean in theory but creates a perverse incentive to inflate bookings; avoid.

---

## Willingness-to-Pay Analysis

**What financial loss does it reduce?** Directly: missed-call lead loss (the biggest), after-hours lead loss, slow-response loss (the first responder usually wins the job), emergency mishandling (liability + reputation), and unbooked qualified leads. Indirectly: the $30–45k/year office hire deferred, or the $3–8k/year answering service replaced.

**The ROI arithmetic a small-business owner can do in his head:**
- 3 missed calls/day × ~50% who won't leave a voicemail or call back ≈ 30+ lost contacts/month.
- If text-back recovers even 4 of those into conversations and 1–2 into booked jobs at ~$400 average: **$400–800/mo recovered against $119/mo cost.** A single recovered replacement lead pays for 2+ years of Starter.
- Against alternatives: Ruby $250/mo (50 minutes, takes messages, doesn't book), Smith.ai human $292.50/mo (30 calls), typical AI voice $300–600/mo, Avoca $1,100+/mo. MyWorkFlo at $119 is the cheapest credible thing in the consideration set that *books appointments*.

**Is the ROI obvious enough?** It will be *only if the product shows it.* Persona "Priya" said it precisely: without missed-calls-caught and booked-jobs numbers, "I can't defend it to my partner at day 30, and I cancel." The 30-day results panel (missed calls caught / conversations handled / booked on autopilot / booked with approval) that shipped today is the single most important retention artifact in the product. It needs to become a weekly email.

**Honest WTP caveat:** the product texts back; it does not answer the phone. Some fraction of missed callers won't engage by SMS (older demographics skew this), and some owners will insist "my customers want a voice." That's the RollingBasis lesson from this portfolio: real pain with a partial substitute caps willingness to pay. Here the substitute (answering service) costs 2–5× more and doesn't book — which is why WTP survives — but the "answers calls" framing must never be used again (the truth-pass already removed it).

---

## Competitive Alternatives

| Alternative | Price (verified where possible) | What buyer gets | vs. MyWorkFlo |
|---|---|---|---|
| **Do nothing / voicemail** | $0 | ~80% of missed callers don't leave one | The real competitor for shops <5 techs |
| **Human answering service** (Ruby, AnswerConnect, local) | Ruby: $250/mo for 50 min, $395/100 min, $720/200 min | Warm human, message-taking, no booking, per-minute anxiety | MyWorkFlo: ½–¼ the price, books jobs, but no voice |
| **Hybrid human/AI receptionist** (Smith.ai) | Human: $292.50/mo per 30 calls; AI: from $95/mo | Answers calls, some booking | Voice included; MyWorkFlo counters on price + trade-native triage + approval control |
| **Vertical AI voice front office** (Avoca, Sameday) | Avoca: quote-based, ~$1,100/mo entry; ~$1B valuation, ~1,000 operators | Full AI phone answering + booking into ServiceTitan etc. | Upmarket, sales-led; validates the category; don't fight them for 15-CSR shops |
| **Commodity AI receptionists** (Voksha, ReadyToTalk, dozens) | $39–99/mo | Generic AI answering, minimal trade depth | The race-to-the-bottom flank; MyWorkFlo must not compete on price alone |
| **FSM platforms bundling AI** (Housecall Pro "CSR AI" at $79–329/mo; Jobber AI Receptionist ≈ $199 Grow + $99 add-on) | Included/add-on | "Good enough" AI answering inside software they already pay for | **The most dangerous competitor** — owns distribution and the calendar |
| **Missed-call-text-back platforms** (Podium ~$399+/mo, NiceJob, Signpost) | $300–500/mo | MCTB + reviews + payments suite | MCTB alone is a commodity feature; MyWorkFlo's depth is what happens *after* the text-back |

**Sharpest differentiation (validated by the persona study, not asserted):**
1. **Trust architecture as product.** Locked, non-editable emergency scripts; person-not-equipment bright line; guardrails enforced in code post-generation; the AI shuts up after escalating; "never state a dollar figure that didn't come from a tool." No competitor sells "an AI that structurally cannot embarrass you" — and 9/10 skeptical personas independently bought this exact story.
2. **The control-mode ladder.** Draft → Assisted → Autopilot is an AI-adoption on-ramp for people who distrust AI — the segment everyone else skips by demanding trust up front.
3. **SMS-native staff workflow.** YES/NO by text and no-login magic links mean the owner's team never learns software. "That's how you build for people like me" — Ray.
4. **Self-serve + published flat pricing** in a category of demo-gated, per-minute, quote-based pricing.

**Why a buyer picks this over an answering service:** it books jobs instead of taking messages, costs less than half as much, and handles the 2am gas call with a locked script instead of a $4/minute operator reading a binder.
**Why a buyer picks this over their FSM's bundled AI:** control modes + safety depth + the fact that it works *beside* whatever they use (including paper). That argument holds for the next 12–24 months; it erodes as platforms improve. Speed matters.

---

## Product Readiness

**Verdict: not ready to charge money today; ready to charge within ~2–4 weeks of focused provisioning work.** The persona study's unanimous "do not send real traffic yet" was correct when written; roughly half its blockers were fixed the same day.

**Compelling (sell on these):**
- The emergency-safety machinery — the single most trusted asset across all evaluations.
- Control modes, approval workflows (now with full lead context, emergencies-first sorting, editable drafts on the SMS approval page, configurable expiry).
- The SMS staff spine: YES/NO replies, magic links, idempotent webhooks, atomic approval claims, autopilot slot re-verification.
- The new 30-day results panel (missed calls caught / handled / booked) — the retention weapon.
- "Test your AI" (the rebranded simulator) — the skeptic-converter Barbara described: "if you showed me this behavior in the simulator on day one, you'd have me."

**Incomplete (must exist before anyone pays):**
1. **The live loop:** Twilio account upgrade → number purchase → **A2P 10DLC registration** (days–weeks of carrier lead time; start immediately) → call-forwarding setup surface → webhook pointing. Until this works, there is no product, only a rehearsal.
2. **Working front door:** Google OAuth configured (or email-link promoted to primary) and Stripe envs set in prod.
3. **In-app reply/takeover from the business number + close/handled action.** Every escalation currently ends with the product "shrugging the operator out the door" onto their personal cell. This breaks the core promise at its most important moment.
4. **Truthful tier gating:** either enforce Starter/Growth/Pro differences in code or sell one plan until they exist.

**Can be manual at first (don't build yet):**
- Onboarding as concierge (founder sets up hours/types/keywords on a screen-share).
- A2P registration, number porting/forwarding — founder-assisted, phone-call-driven.
- Weekly ROI email — founder sends it by hand from the results panel for the first 10 customers.
- Multi-seat "routing" — the owner forwards alerts manually until invites ship.
- Emergency on-call chain — **or rather: don't sell to 24/7 shops at all until it's built.** This one cannot be manual; it can only be avoided.

---

## Path to First Revenue

**Niche:** HVAC only (the taxonomy, scripts, and copy are already HVAC-native), 1–5 tech owner-operators, one region (start where relationships exist — upstate NY is literally the test data's home).

**Sales motion: founder-led "missed-call audit" outbound.** This product has a built-in demo that closes itself:
1. Call 50 local HVAC shops at 2pm on a weekday. The ones that don't answer are the qualified list — *their own miss is the pitch.*
2. Outreach: "I called you Tuesday at 2:10, no answer. Here's the text your customer would have gotten instead." Screenshot of the actual opener.
3. Demo promise: **"Call this number. Hang up. Watch your phone."** (The persona study's #1 experiment: the moment Ray believes everything.) Then run the gas-smell scenario in Test-your-AI live on their kitchen table.
4. Offer: **30 days free, founder does the entire setup (forwarding, hours, appointment types, carrier registration), cancel by text message, $99/mo founder rate locked for life (list $119).** No contract, no setup fee — already the landing's risk-reversal language.

Secondary channels for the first five (cheap, parallel): Damon's existing contractor/vendor relationships (broker network, property contacts — Weldon Heating first if real); local Facebook trade groups and supply-house counter relationships. **Skip for now:** paid ads (no proof assets), cold email at scale (A2P-era deliverability + no brand), agencies (nothing to white-label yet).

**First 5 paying customers = 5 design partners** who agree to: weekly 15-minute feedback call, a case-study number ("caught 23 missed calls, booked 9 jobs, ~$4,100"), and a review/referral if it works.

---

## Path to $10k MRR

| Phase | Timeline | MRR | What happens | Likely blockers |
|---|---|---|---|---|
| **0 — Make it real** | Weeks 0–2 | $0 | Twilio upgrade + number + A2P filed; Google OAuth; Stripe live; forwarding step; in-app reply. Truth-pass complete (mostly done). | A2P carrier review time; Google OAuth app verification (Limited-Use review can take weeks — start now) |
| **1 — First 5** | Weeks 2–8 | ~$0→500 | Missed-call audit outbound in one metro; 10 demos → 5 design partners; concierge onboarding; hand-built weekly ROI emails | Draft-mode approval fatigue (steer everyone to Assisted); text-back response rates lower than hoped; founder time |
| **2 — 5→20** | Months 2–5 | ~$2.5–3.5k | Convert design partners to paid; publish 2–3 numeric case studies; referral bounty (free month per referred shop); ship multi-seat + ROI email to honestly unlock $299; expand to second metro | Support load (this is a phone-adjacent product — owners call when confused); seasonality (shoulder months suppress urgency); first churn wave at day 30–60 if ROI panel doesn't show wins |
| **3 — 20→50** | Months 5–10 | ~$6–9k | Double down on whichever channel produced cheapest CAC; hire a VA/part-time SDR to run audit-calls at scale; ACCA chapters / supply-house partnerships; Spanish outbound scripts (unlocks a real segment and de-risks liability) | SMB churn (3–7%/mo typical — at 5%, holding 50 requires ~2.5 adds/mo before growth); HCP/Jobber bundling pressure; the temptation to chase 24/7 shops before the on-call chain exists |
| **4 — 50+** | Months 10–14 | **$10k+** at ~55–65 customers | Working acquisition engine + churn <4%/mo + 8–10 adds/mo; begin plumbing/electrical adjacency only after HVAC motion is repeatable | Founder bandwidth is the binding constraint the whole way — see Risks |

**What must be true for this plan to work:**
1. Text-back genuinely converts: ≥30–40% of missed callers engage with the SMS, and the median customer sees **≥1 attributable booked job/month** (this is the metric; everything else is vanity).
2. A2P registration survives and messages don't get carrier-filtered (opt-out language now included — keep it).
3. The emergency path has zero public failures during the growth window (one "the AI mishandled my gas leak" Facebook post in a trade group is fatal at this scale).
4. **The founder gives this 15+ focused hours/week for ~12 months.** Blunt version: this portfolio currently runs four ventures in parallel. MyWorkFlo's plan has no full-time requirement, but it cannot survive on leftover attention — founder-led sales is the entire engine through Phase 3, and every phase gate above assumes someone is actually making the calls.

---

## Major Risks

| Risk | Severity | Assessment |
|---|---|---|
| **Emergency liability** | **High** | The customer is told "we've alerted the team" on a single best-effort SMS+push with no re-page, no acknowledgment, no voice fallback, English-only scripts behind bilingual detection, and no fire/smoke Layer-1 category. Mitigation until built: sell only to shops where the owner IS the on-call, keep the 911 line in the opener, never market 24/7 coverage. |
| **Trust / one bad screenshot** | High | The whole category sells against "the robot said something stupid." The guardrail architecture is genuinely strong; the residual risk is model drift and the unproven live loop. The Draft-mode on-ramp is the right mitigation — as is never letting marketing outrun code again (this repo now has two audits proving the reflex exists). |
| **Platform bundling** (Housecall Pro / Jobber) | High, 12–24mo horizon | They own distribution and the calendar. MyWorkFlo's window is now; its defense is depth (safety, modes, trade-native triage) and serving the shops that run on paper + Google Calendar, which platforms ignore. |
| **Churn** | Medium-High | SMB MRR churns 3–7%/mo; HVAC adds seasonality. The results panel → weekly ROI email is the churn weapon; a customer who sees "9 jobs booked" doesn't cancel in the shoulder season. |
| **Founder bandwidth / split attention** | Medium-High | Named explicitly in the plan above. The product builds itself impressively fast; the customers won't. |
| **Sales friction** | Medium | Contractors are hard to reach, skeptical of SaaS, and buy from people they trust. The missed-call audit motion converts the friction into the pitch, but it doesn't scale past ~50 customers without hired repetition. |
| **AI hallucination** | Medium → Low | Best-mitigated risk in the product: tool-gated prices/times, output guardrails in code, turn caps, locked scripts. Residual: Layer-2 (LLM) emergency judgment for phrasings Layer-1 misses. |
| **SMS/Twilio economics** | Low | Per-segment costs are pennies; even chatty conversations cost <$1/mo per customer at Starter volumes. A2P is a timeline risk, not a cost risk. Kimi-K3 inference costs are negligible at this scale. |
| **Support load** | Medium | Concierge onboarding is the plan, so support IS the sales motion early. Budget for it; don't hire for it before 30 customers. |

---

## What Must Be True

1. A missed-call text-back arrives on a real customer's phone in under 60 seconds, reliably, from a number tied to the business — **and 5 strangers can watch it happen on demand.**
2. The median paying customer can point at ≥1 job/month they'd have lost, on a screen the product shows them.
3. The buyer who signs up without talking to anyone reaches a live loop without human help (or the concierge path absorbs everyone who can't).
4. No emergency conversation is ever mishandled publicly during the first 50 customers.
5. Founder-led sales actually happen: ≥10 audit-call batches (500 dials) in the first 90 days.
6. Growth-tier features (seats, ROI reporting, routing) exist before anyone is charged $299.

---

## Recommended Positioning

**Lead with the honest wedge, which is also the differentiated one:**

> **"Every missed call gets a text back in seconds. Emergencies get a human — instantly. And the AI never says anything you didn't approve."**

- **Own SMS-first as a choice, not a limitation:** "No robot voice answering your phone. Your customers text — like they already do with their friends." This turns the biggest product gap into a brand position *against* the AI-voice crowd, and it happens to be true about customer behavior in this demographic.
- **Sell the safety architecture explicitly.** The locked-script/bright-line policy is the best marketing asset in the company and it currently lives in the Terms and the source code. "What the AI will never do" belongs on the landing page, in the demo, and in the sales deck.
- **Sell control modes as the adoption story:** "Start in Draft — approve every text. Graduate when you're ready." No competitor meets the skeptic where he is.
- **Do not** position as an answering service, a call-answering AI, a Podium alternative for reviews, or an all-in-one platform. One wedge: revenue recovery + emergency safety for HVAC.

---

## Recommended Pricing

- **Starter — $119/mo** (keep): the wedge tier. Everything a 1–5 tech shop needs; generous conversation cap (e.g., 200/mo) as backstop. First 10 design partners: **$99/mo locked for life.**
- **Growth — $299/mo** (pause selling until real): unlock only when multi-seat + notification routing + ROI reporting ship. These are the actual features an office justifies $299 with.
- **Pro — $599/mo** (remove from self-serve): currently describes vaporware (CRM sync, multi-location). Replace the card with "Multi-location or 24/7 shop? Talk to us" until the on-call chain and integrations exist.
- **Billing metric:** flat per location. Never per minute, never per message. Report (don't bill) recovered revenue.
- **Risk reversal stays:** no contract, no setup fee, cancel anytime — it's already the landing's language and it's the right counter to Ruby's lock-in-style upgrade/downgrade rules.

---

## Recommended Next Experiments

Ordered; each has a kill signal. (1–3 restate the persona study's experiments — they were right.)

1. **Live-loop smoke test (week 1–2):** provision one number; 5 contractors call it, hang up, watch their phone. *Kill signal:* text-back >60s or undelivered → fix before anything else.
2. **Missed-call audit batch (week 2–4):** 100 dials to local HVAC shops at 2pm; count non-answers (market-size proof), then pitch the non-answerers. *Success:* ≥10 demos booked per 100 dials. *Kill signal:* <3 → the outbound motion needs a different hook.
3. **Design-partner cohort (weeks 2–8):** 5 shops, free 30 days, concierge setup, Assisted mode default. **The metric: attributable booked jobs/customer/month.** *Success:* median ≥1. *Kill signal:* median 0 after 60 days of real traffic → the value hypothesis itself fails; stop and rethink before spending a year on distribution.
4. **Convert test (weeks 8–10):** design partners asked to pay $99. *Success:* ≥3 of 5 convert. *Kill signal:* ≤1 — ROI wasn't felt regardless of what the panel says.
5. **Public "Test the AI" on the landing page:** pre-loaded gas-smell + no-cooling scenarios, no login. Measure runner→signup rate vs. non-runners. Cheap, and directly tests the trust-architecture-as-marketing thesis.
6. **Draft-vs-Assisted field data:** measure approval-expiry rates in the cohort. If >30% of Draft approvals expire, make Assisted the recommended default in onboarding (persona prediction: this is what happens).

---

## Go / No-Go Recommendation

**GO — conditionally, on the narrow wedge.**

The problem is real, the willingness to pay is proven by adjacent spend, the differentiation survived hostile simulated buyers, and $10k MRR requires only ~55–60 customers from a market of 100k+. Nothing about the thesis is broken.

The conditions, because "credible path" requires them:

1. **Ship the live loop within 2 weeks** (Twilio upgrade, number, A2P filed, OAuth, Stripe, forwarding step, in-app reply). If provisioning stalls past a month, the venture is drifting, not building.
2. **Sell only the wedge:** HVAC, 1–5 techs, one region, $99–119, founder-led, Assisted-mode default. No 24/7 shops, no Growth/Pro promises, until the features exist.
3. **Hard gate at day 90:** 5 design partners live on real traffic. If the median partner sees **≥1 attributable booked job/month and ≥3 of 5 convert to paid**, scale the motion (Phase 2). If not, the honest conclusion is that text-back recovery doesn't clear the value bar for this buyer — stop before the distribution grind, and either pivot the wedge (e.g., emergency-triage-only for property managers) or shelve it.
4. **Commit the founder hours or don't start the clock.** This plan fails silently — not through any product defect, but through 500 audit dials that never get made. The product side of this company has repeatedly demonstrated same-day execution; the open question, and the only one that decides $10k MRR, is whether the sales side gets the same energy.

**If the wedge works:** $10k MRR in 12–14 months is a reasonable base case, with the platform-bundling clock as the reason to move fast rather than carefully.

---

### Competitor pricing sources (verified 2026-09-22)

- Ruby pricing: [CloudTalk — Ruby Receptionist Pricing 2026](https://www.cloudtalk.io/blog/ruby-receptionist-pricing/), [ServiceHawk — Ruby Pricing](https://servicehawkai.com/compare/ruby-pricing.html), [ServiceAgent — Ruby Reviews & Pricing](https://serviceagent.ai/blogs/ruby-receptionist-pricing/)
- Smith.ai pricing: [Smith.ai — AI Receptionist Plans](https://smith.ai/pricing/ai-receptionist), [SchedulingKit — Smith.ai Pricing 2026](https://schedulingkit.com/pricing-guides/smith-ai-pricing), [Loman — Smith.ai Pricing](https://loman.ai/blog/smith-ai-pricing)
- HVAC AI receptionist market / Jobber & Housecall Pro AI: [NextPhone — Best AI Receptionist for HVAC 2026](https://www.getnextphone.com/blog/best-virtual-receptionist-for-hvac), [Voksha — Best AI Receptionist for HVAC](https://voksha.com/blog/best-ai-receptionist-for-hvac-companies), [Kore Komfort — Jobber AI vs Housecall Pro AI](https://korekomfortsolutions.com/jobber-ai-vs-housecall-pro-ai-are-they-worth-the-price-tag/)
- Avoca: [Contractor ToolStack — Avoca AI Review 2026](https://contractortoolstack.com/software/avoca-ai/), [ServiceAgent — Avoca AI Pricing](https://serviceagent.ai/blogs/avoca-ai-pricing/), [Driive — Avoca AI Pricing 2026](https://getdriive.com/blog/avoca-ai-pricing)
