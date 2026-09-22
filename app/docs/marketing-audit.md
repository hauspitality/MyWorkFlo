# MyWorkFlo — Landing / Marketing Copy Audit

**Date:** 2026-09-22
**Scope audited:** `landing/` (myworkflo.com — the public marketing site), `app/` public entry points (`page.tsx`, `login/page.tsx`, `layout.tsx`, `manifest.ts`, `onboarding/**`, legal pages), `PRODUCT_SUMMARY.md`, `README.md`, and the product code that backs the marketing claims (`lib/ai/*`, `lib/twilio/*`, `app/api/**`).
**Method:** every marketing claim was checked against the shipped code, not taken at face value.

---

## Executive Summary

The marketing site is far better than most pre-launch SaaS pages — the wedge is sharp, the copy sounds like it has met an HVAC owner, and the objection-handling scaffolding (control modes, safety, FAQ) is genuinely good. But it has **one fatal flaw and one systemic flaw**:

1. **Fatal: the landing page cannot convert anyone.** Every CTA on the page — hero, pricing cards, footer — is an anchor link to the `#audit` calculator. The calculator's output is a dead end: text with no button, no link, no email capture. The *only* link to the app on the entire page is the small "Sign in" link for existing users. A motivated buyer who reads everything, runs the calculator, and pulls out their credit card has literally no path to give you money. For a page whose whole pitch is "no salesperson, sign up yourself," there is no way to sign up.

2. **Systemic: the page sells several things the product doesn't do.** Verified against code: the AI does not *answer* calls (it bridges to the owner's cell, then texts back on miss); estimate follow-ups at "2 and 7 days" do not exist anywhere in the codebase; there are zero Jobber or Housecall Pro integrations, yet the calculator tells prospects "It would connect to Jobber and Housecall Pro"; "Sends leads by email or sheet" has no implementation. For a product whose safety section says "it won't guess or make things up," the marketing site is guessing and making things up. In this trade, one burned early customer telling a Facebook group "the follow-up thing doesn't exist" is fatal.

Secondary issues: pricing disagrees between the strategy doc and the shipped page ($249/$449 vs $299/$599), there is no trial/guarantee/risk-reversal anywhere, no proof of any kind, no contact method (ironic for a phone-answering company), and no legal/footer links on the landing page despite A2P 10DLC requiring visible SMS-consent language.

**Verdict:** messaging strategy is ~80% right; conversion mechanics are ~10% built; claim integrity needs a truth pass before any paid traffic. Fixing the CTA dead end is a 1-hour change that likely 10×'s conversion from its current effective rate of ~zero.

**Score (see rubric): 58/100.** Strong positioning, broken funnel.

---

## Current State

### Site topology (important context)

- **myworkflo.com** = static marketing site in `landing/` (own Vercel project). This *is* a real landing page — full hero, wedge section, feature cards, ROI calculator, pricing, safety, FAQ, AEO extras (`index.md`, `llms.txt`, JSON-LD, sitemap).
- **app.myworkflo.com** = the Next.js app in `app/`. `app/page.tsx` redirects `/` → `/dashboard` (authed) or `/login` (anon). **This is fine and is not the conversion gap** — the app subdomain is not supposed to market. The gap is that the marketing site never sends anyone *to* the app.
- `app/layout.tsx` + `manifest.ts`: one-line description "The AI front desk for HVAC and home-service teams." Consistent with the landing site. Good.
- `README.md`: untouched `create-next-app` boilerplate. Zero cost, zero value; worth 10 minutes since the GitHub repo is public.
- `PRODUCT_SUMMARY.md`: the best strategy document in the repo — but its pricing table no longer matches what shipped (details below).

### Copy inventory

| Surface | Copy quality | Notes |
|---|---|---|
| Landing hero | Good headline, wordy subhead | CTA is an anchor, not a conversion |
| "What other options get wrong" | Excellent | Sharpest section on the site |
| Feature cards ("agent grid") | Good voice, 3 overclaims | Estimates, Spanish *calls*, after-hours *answering* |
| ROI calculator (`#audit`) | Good idea, dead-end output | Also fabricates integration claims |
| Pricing | Clear, no risk-reversal | CTAs mislabeled ("Start with Growth" → calculator) |
| Safety / modes / FAQ | Very good | Missing the #1 mechanical question: what happens to my number? |
| Login page | Clean, zero marketing | Says "Sign in" only — new users sent here will hesitate |
| Onboarding (8 steps) | Plain, warm, consistent | "Done" page nicely restates the core promise |
| Legal pages (app) | Present | Not linked from the landing footer |

---

## Target Customer Read

The stated target (small HVAC/home-service owner-operators, dispatchers, office managers; 2–20 techs; losing calls while driving/on-roof/after-hours; want help without losing control) is the right buyer, and the copy mostly speaks their language:

**Where it sounds like it knows them:**
- "the customer who calls while you're driving, a tech is on a roof, or the office is closed for the night" — this is the buyer's actual Tuesday.
- Trade vocabulary is right: no cooling, no heat, tune-ups, gas smell, burning smell, mini-split (in the AI prompt), dispatch.
- "even if that's just a phone and a paper calendar" — correctly meets the low-tech end of the market without condescension.
- The control-mode ladder (Draft → Assisted → Autopilot) directly answers this buyer's core fear: an AI freelancing with *their* customers.

**Where it slips:**
- "2 langs" as a stat card — no contractor says "langs." Write "English + Spanish."
- "Form 04822 / Work order intake" skeuomorphic labels on the calculator are designer-cute, not buyer-meaningful (harmless, but they spend attention).
- The buyer's economic unit is the **job** and the **truck**; the site gets this right in "1 job can pay for the month" — the single best line on the page — but buries it in a stat grid instead of putting it next to the price.
- Nothing addresses the *office manager/dispatcher* persona at all, even though she is often the daily user and the veto vote. One sentence ("your office sees every message and can take over any conversation") would cover it.

---

## Core Pain Point Assessment

**Is the pain clear?** Mostly yes — but the *cost* of the pain is understated and appears too late.

The pain chain for this buyer is: missed call → homeowner calls the next company on Google → that job, and often that customer's next 10 years of tune-ups and a future system replacement, are gone. The site expresses step 1 well ("calls come in while you're already handling everything else") but the "they call someone else" consequence appears exactly once, inside a feature card ("so the customer doesn't hang up and call someone else"). That's the emotional engine of the entire product and it's in 14px body text on card three.

The hero metrics block ("Sample week for a six-tech shop: 18 calls that would've been missed...") is honest about being a sample, which is good — but "18 missed calls" is a *volume* number, not a *money* number. The buyer converts on money. "18 missed calls" should be "$9,000 in jobs that called someone else" (or let the calculator personalize it).

**What's missing from the pain framing:**
- Urgency asymmetry: an HVAC lead with no heat at 9pm books with whoever responds *first*. Speed-to-lead is the whole game and the copy never says the word "first."
- The after-hours pain is claimed but not dramatized. "Answers after hours" is a feature label; "the 9pm no-heat call in January is your highest-margin job of the month, and right now it goes to voicemail" is a pain.

---

## Positioning Assessment

**Current positioning:** "AI front desk for HVAC and home-service teams" with a four-part wedge (self-serve setup, booking included, emergency triage, bilingual). Tagline: "Answer every call. Book the job. Get a human when it matters."

**What's right:**
- The wedge is real and well-chosen. "Booking is included, not an upsell" and "no sales calls needed" are genuine positional attacks on the category (most AI-receptionist competitors demo-gate and upsell booking).
- "Not another app to learn. Just a phone that always gets answered" is exactly the right posture against ServiceTitan-style platform fatigue.
- Anti-AI-hype restraint ("MyWorkFlo just answers the phone") suits a skeptical trade audience.

**What's wrong:**
1. **"Answer every call" is not what the product does — and the honest version is a *better* position.** Verified in `app/api/webhooks/twilio/voice/route.ts`: an inbound call is bridged to the owner's cell (20s timeout); only when that fails does the system play a brief apology and fire the missed-call text-back. The AI conversation is 100% SMS. So the product is really: *"your calls still ring you — and the ones you miss get an instant text that books the job."* That is more trustworthy, more differentiated (no robot voice answering — homeowners hate robot voices), and it's true. Right now the meta description says "answers your phone when you can't," and the "Answers after hours" card says it "answers calls at night... gets the details" — a prospect who signs up expecting a voice receptionist will churn on day one and feel lied to.
2. **No enemy is named.** The page says "other options get wrong" without anchoring what the options are. The buyer's actual alternatives are (a) a human answering service (~$300–600/mo, takes messages, can't book, reads a script badly), (b) generic missed-call-text-back tools (text but don't book), (c) their spouse's cell phone. Anchoring against (a) and (b) makes $119–299 look cheap and makes "booking included" land harder.
3. **The tagline emphasizes the wrong clause.** The hero styles "Answer every call. Book the job." in muted ink and highlights "Get a human when it matters." Reassurance is the *supporting* argument; "book the job" is the money argument. Visually invert it.

---

## Copy Strengths

Keep these — several are unusually good:

1. **"Here's what other options get wrong"** — a real positioning section, not feature soup. Best section on the page.
2. **"1 job can pay for the month"** — the entire pricing argument in seven words.
3. **"You set the schedule, the safety rules, and the price. MyWorkFlo just answers the phone."** — perfect control reassurance; should be *more* prominent, not less.
4. **The Draft/Assisted/Autopilot modes section** — most competitors hide autonomy behind "AI-powered"; explaining the dial is a differentiator in itself. App and landing describe the modes consistently (verified against `control-mode-selector.tsx`).
5. **The safety section** — "it won't guess at repairs, make up arrival times, or quote a price it isn't sure about" is concrete and matches shipped guardrails in `lib/ai/systemPrompt.ts` and `emergencyScripts.ts`. Rare case of marketing *under*-claiming relative to the engineering.
6. **Plain-English register throughout** — "How much does it cost?" as a section header instead of "Pricing built for scale." Correct for this buyer.
7. **AEO hygiene** — JSON-LD (Organization, SoftwareApplication with offers, FAQPage), `index.md` mirror, `llms.txt`, canonical tags. Ahead of the curve.
8. **Onboarding "done" page** restates the promise operationally: "A missed call will now get a text back automatically." Landing → product loop closes cleanly.

---

## Copy Weaknesses

Blunt list, with why each matters:

1. **Claims not backed by code (must fix before paid traffic):**
   - *"Follows up on estimates... Follow-up texts at 2 and 7 days. You control the timing."* — **Does not exist.** The only cron is `expire-approvals`. No follow-up scheduler, no estimate entity, nothing. This is a fully specified fake feature with fake timing details, listed again in the Growth plan ("Follows up on estimates") and the FAQ-adjacent `index.md`.
   - *Calculator output: "It would connect to Jobber and Housecall Pro."* — **Zero integration code exists** (grep for jobber/housecall returns nothing). The trust strip's "works alongside" phrasing is defensibly hedged; the calculator's "connect to" is not.
   - *Pro plan: "Connects to your CRM."* — Not built.
   - *Starter: "Sends leads by email or sheet."* — No implementation found.
   - *"Answers after hours: Answers calls at night and on weekends, gets the details"* — the system texts; it does not answer calls (see Positioning). "Handles Spanish calls" has the same problem — Spanish support is real but it's Spanish *texting* (`systemPrompt.ts` LANGUAGE rule + `detected_language`), and the "plain-English summary for your office" is only partially reflected in the lead view.
2. **CTA labels lie about what happens next.** "Start with Growth" scrolls to a calculator. "Talk to us about Pro" scrolls to the same calculator — and there is no contact method anywhere on the site: no email, no phone number, no demo link. A company selling "we answer your phone" that cannot itself be contacted is a credibility self-own a contractor will absolutely notice.
3. **Hero subhead is 4 sentences / ~45 words doing 3 jobs** (what it is, how it behaves, how easy setup is). Above the fold, one job: what outcome do I get. Setup friction ("10 minutes, no salesperson") belongs on the CTA line, where it reduces click anxiety — and partially it's already there.
4. **"See what you're missing"** as the primary CTA is a pun that costs clarity. It could mean features, a demo, or guilt. Buyers scan; label the action: "See what missed calls cost you" (for the calculator) or "Start free — 10-minute setup" (for signup).
5. **No trial, no guarantee, no "cancel anytime" on the landing page.** The *app's* plan page says "Change or cancel anytime" — the reassurance exists but is shown only after signup, i.e., exactly where it's no longer needed. Nothing on the landing page de-risks $119/mo for a skeptic.
6. **Pricing inconsistencies:**
   - `PRODUCT_SUMMARY.md`: Growth **$249**, Pro **$449**, Starter fit "2–5 techs", seat counts, conversation caps, annual option (~2 months free).
   - Landing + onboarding + JSON-LD: Growth **$299**, Pro **$599**, Starter "solo operators," no seats, no caps, no annual.
   One of these is stale. If the summary is the strategy, the site overshoots by 17–33%; if the site is the strategy, update the summary before it misleads a future session or investor. Also: the summary's seat/volume differentiators are *better selling points* than the landing page's vague tier bullets — the shipped page threw away the clearest tier-selection logic ("pick by tech count and automation level").
7. **"Sample week" numbers risk reading as fabricated data.** Labeled honestly, but a skeptic pattern-matches "18 / 7 / 3" to made-up SaaS stats. Reframe as an explicit illustration ("here's what a typical week looks like for a six-tech shop") or replace with the calculator's personalized output.
8. **Login page says only "Sign in."** When the landing CTA is fixed to send new visitors to the app, they'll land on a page with no "create account" affordance and no reminder of what they came for. Since Supabase OTP/Google auth auto-creates accounts, this is purely a copy fix: "Sign in or create your account — one tap with Google."
9. **Landing footer has no privacy/terms links, no company identity, no SMS-consent language.** The legal pages exist (app.myworkflo.com/privacy|/terms, written for 10DLC/Google Limited-Use) but the marketing site doesn't link them. A2P 10DLC review commonly checks the public website for SMS disclosure; this is both a trust and a compliance gap.

---

## Conversion Risks

Ranked by expected damage:

1. **No conversion path (certain, total).** All 7 CTAs on the page resolve to `#audit`; the calculator output contains zero links. Effective conversion rate of the page as shipped: ~0% by construction. This must be fixed before anything else on this list matters.
2. **Expectation mismatch churn (high).** Buyers arriving for a voice AI receptionist, estimate follow-ups, or a Jobber sync will activate, discover the gap, and churn angrily — into a small-community trade where reputation compounds (BiggerPockets-style forums, Facebook contractor groups).
3. **No risk reversal (high).** $119–599/mo, no trial, no guarantee, no cancel-anytime, from an unknown brand with no customers shown. The self-serve promise reduces friction but nothing reduces *risk*.
4. **Pro tier has no path at all (medium).** "Talk to us about Pro" with no contact mechanism = the highest-value segment is unreachable. (There is an existing demo scheduling link — calendar.app.google/nzDu9T3s2b2A5Jo68 — that could back this CTA today.)
5. **Setup mechanics are unexplained (medium).** The single biggest practical objection — *"what happens to my phone number?"* — is never addressed. Does the owner forward their existing number? Get a new tracking number? The code says: a MyWorkFlo Twilio number bridges to the owner's cell. That's easy to explain and reassuring ("keep your number; calls still ring your phone first") — its absence makes the offer feel hand-wavy.
6. **No proof of any kind (medium, unavoidable pre-launch, but unmitigated).** No testimonials, logos, counts, screenshots of the product, or founder credibility. Even pre-customer, there are honest substitutes (see Missing Messaging).
7. **Operational readiness (flagging, not copy):** Twilio is still on trial (number not purchased, A2P 10DLC not registered) and billing env may be inert. If traffic is sent now, "10 minutes to set up" ends at a product that can't text real customers. Sequence the launch: carrier readiness → truth-pass copy → CTA fix → traffic.

---

## Missing Messaging

Checklist against the audit scope:

| Element | Status |
|---|---|
| Clear hero message | ⚠️ Present but emphasis inverted; subhead overloaded |
| Problem framing | ⚠️ Present; cost-of-pain and speed-to-lead missing |
| Outcome/benefit language | ⚠️ "1 job pays for the month" exists; not tied to pricing |
| How it works | ✅ 3-step section exists and is accurate |
| Use cases | ⚠️ HVAC-only voice; calculator hints at plumbing/roofing/electrical but page copy never follows through |
| Proof points | ❌ None, no placeholders |
| Safety/control explanation | ✅ Best-in-class for the category |
| Emergency handling | ✅ Clear, matches code (locked scripts, instant notify) |
| Approval/autopilot modes | ✅ Clear, consistent with app |
| Integrations/operational detail | ❌ Overclaimed (Jobber/HCP/CRM) while the *true* operational story (keep your number, calls ring you first) is untold |
| Phone-number mechanics | ❌ Missing entirely — biggest practical objection |
| Pricing/trial/demo CTA | ❌ Pricing yes; trial no; demo no; working CTA no |
| Cancel/contract terms | ❌ Missing on landing (present in app) |
| Social proof placeholders | ❌ Missing; no founder story, pilot framing, or "built with real operators" line |
| Contact method | ❌ None on the site |
| Legal/SMS-consent links | ❌ Missing from landing footer |
| Dispatcher/office persona | ❌ Unaddressed |

---

## Recommended Messaging Strategy

**One-sentence strategy:** Sell the *booked job recovered*, prove it with radical mechanical transparency (since there's no social proof yet), and convert on zero-risk self-serve.

1. **Lead with money, not features.** The header promise: missed calls are lost jobs going to the next company on Google; MyWorkFlo texts back in seconds and books the job before they call anyone else. "First to respond wins" is the frame.
2. **Reposition from "answers your phone" to "never lets a missed call die."** This matches the code exactly, avoids the robot-voice objection entirely, and is more defensible: *calls still ring you first — MyWorkFlo catches everything you can't take.* Owner keeps being the hero; the product is the safety net.
3. **Make control the second act, not a footnote.** Draft/Assisted/Autopilot is the answer to this market's biggest fear and almost no competitor articulates it. Elevate "starts in Draft mode — nothing sends without your approval" into the hero area as the trust line.
4. **Substitute mechanism for proof.** With zero customers, the honest trust play is specificity: show a real SMS thread (simulated but labeled), show the approval screen, explain exactly what the customer receives and what the owner receives, state what it will never do. Add a founder line — a real operator name and a "why I built this" sentence beats an empty logo bar.
5. **De-risk explicitly.** Cancel anytime, no contract, no setup fee — say it on the pricing cards. If billing isn't live at launch, turn the bug into the offer: "Free during early access — founding shops lock in launch pricing."
6. **Name the alternatives.** A comparison strip: answering service (takes messages, can't book, ~$400/mo) / text-back-only tools (text, don't book) / MyWorkFlo (texts *and* books, from $119). This is where "booking included" stops being a bullet and becomes the reason to buy.
7. **Keep the calculator, demote it to secondary CTA, and make its output the strongest CTA on the page** (personalized: "Your missed calls are worth ~$X/mo. Starter is $119. Start setup →").
8. **Truth-pass every claim now**; reintroduce estimates follow-up, integrations, and voice answering as marketing *only when built* — each is a strong "New:" announcement email/update later, which is worth more than a fake bullet today.

---

## Suggested Landing Page Structure

1. **Hero** — money-frame headline; one-sentence subhead; primary CTA → app signup ("Start free setup — about 10 minutes"); secondary CTA → calculator; trust line: "Starts in Draft mode — nothing sends without your OK." Keep the hero photo.
2. **Pain strip** — three scenario vignettes (driving / on a roof / 9pm no-heat call), each ending in "…and they called the next company." Short. Emotional.
3. **How it works (mechanics-forward)** — 4 steps including the missing one: *keep your number, calls ring you first* → missed call gets a text in seconds → AI qualifies like a dispatcher → books on your calendar or hands to you. Show one simulated SMS thread, labeled as an example.
4. **Control modes** — promoted above features. "How much it does is up to you."
5. **Safety & emergencies** — keep nearly as-is; it's good.
6. **Comparison strip** — answering service vs text-back tools vs MyWorkFlo.
7. **Calculator** — reframed "What are missed calls costing you?", output ends in a signup CTA.
8. **Pricing** — tech-count + automation-level tier logic (from PRODUCT_SUMMARY), cancel-anytime line, working CTAs (Starter/Growth → checkout-bound signup; Pro → demo scheduling link).
9. **FAQ** — keep; add: number/forwarding mechanics, "will customers know it's AI," cancel terms, "what if it makes a mistake."
10. **Founder note** — 3 sentences, real name, real reason. The only honest social proof available today.
11. **Footer** — privacy, terms, SMS-consent line, contact email, signup CTA repeat.

---

## Rewrite Examples

### Hero headlines (5)

1. **"Missed calls don't wait for you. Now they don't have to."**
2. **"Every missed call gets a text back in seconds — and comes back as a booked job."** (most literal; safest)
3. **"Stop losing jobs to whoever answers first."** (pain-forward)
4. **"You take the calls you can. MyWorkFlo books the ones you can't."** (control-forward; most accurate to the product)
5. **"The $500 job that just hung up? It's getting a text right now."** (aggressive; test variant)

### Subheadlines (5)

1. "MyWorkFlo texts back every missed call in seconds, qualifies the job like a dispatcher who knows HVAC, and books it on your real calendar. Anything urgent or unclear goes straight to a human — you."
2. "Your calls still ring your phone first. The ones you can't take get an instant text that gathers the details, spots emergencies, and books the appointment — under rules you set."
3. "An AI front desk for HVAC teams that answers by text the moment a call is missed — day, night, English, or Spanish — and never books outside your rules."
4. "Set it up yourself in about 10 minutes. It starts in Draft mode, so nothing is sent to a customer until you've approved it."
5. "No new software to learn, no salesperson, no robot voice. Just every missed call turned into a conversation — and the simple ones turned into booked jobs."

### Primary CTAs (5)

1. **"Start free setup — about 10 minutes"** (recommended; pair with "No contract. Cancel anytime." microcopy)
2. **"Catch my next missed call"** (outcome-labeled)
3. **"Set up my front desk"**
4. **"See what missed calls cost you"** (for the calculator as *secondary* CTA only)
5. **"Get started — first job usually pays for the month"**

### Pain-point sections (3)

1. **The roof problem.** "It's 2pm, you're on a roof with a condenser fan in your hands, and your phone buzzes twice. That homeowner with no AC isn't leaving a voicemail — they're calling the next company on Google. By the time you climb down, the job's gone. MyWorkFlo texts them back in seconds: *'Sorry we missed you — is your AC out? We can get you scheduled right now.'* You finish the job you're on. You keep the job you almost lost."
2. **The 9pm no-heat call.** "The highest-margin call of a January week comes in at 9pm — and goes to voicemail. That customer needed heat tonight, so they booked with whoever answered. MyWorkFlo replies instantly, any hour: it gets the details, checks for danger signs like a gas smell, and either books the morning's first slot or wakes up the right person. After-hours calls become tomorrow's schedule instead of a competitor's."
3. **The callback that's always too late.** "You do call everyone back. Between jobs, at lunch, after dinner. But home-service leads book with the first responder, and 'first' is measured in minutes, not hours. MyWorkFlo makes you first every time — a text in seconds, details gathered before you even see the missed call, so your callback is a confirmation, not a cold start."

### "How it works" sections (3)

1. **Mechanics-honest 4-step.** "**1. Keep your number.** Calls ring your phone like always. **2. Missed calls get a text in seconds.** 'Sorry we missed you — how can we help?' **3. It qualifies like a dispatcher.** What's wrong, where, when it started, emergency or routine — in English or Spanish. **4. It books or hands off.** Simple jobs land on your calendar with a confirmation text. Urgent, unclear, or angry goes straight to a person."
2. **Control-forward.** "**Day one, it drafts — you approve.** Every reply waits for your tap before it sends, so you can watch how it handles real customers. **When you trust it, loosen the leash.** Let it text on its own while bookings still wait for your OK. **When you're ready, autopilot.** Approved job types book themselves inside your rules — schedule, service area, appointment length. Emergencies always escalate to a human, in every mode. That part isn't optional, and we're glad it isn't."
3. **A real conversation, shown.** (Render an SMS thread, labeled 'Example conversation.') Missed call → "Hi, this is the front desk at Weldon Heating & Air — sorry we missed your call. What's going on?" → "no heat since last night" → qualification (equipment, address, anyone cold-sensitive at home) → "We can have a tech out tomorrow between 8–10am — want that slot?" → booked + confirmation. Caption: "Every message is logged. In Draft mode, every message waited for owner approval first."

### Trust / control copy (3)

1. "**It starts with training wheels on.** New accounts begin in Draft mode: MyWorkFlo writes every reply, and nothing reaches a customer until you or your office taps approve. Move to Assisted or Autopilot only when it's earned it."
2. "**It knows what it doesn't know.** MyWorkFlo will never diagnose a repair over text, invent an arrival time, or quote a price you haven't approved. When a conversation gets urgent, unclear, or heated, it stops and gets a human — fast."
3. "**Emergencies don't wait for approval — by design.** A gas smell, sparks, or flooding triggers a locked, pre-approved safety message instantly and notifies your team at the same moment. That script can't be edited into something softer, and everything — every call, text, decision, and booking — is saved for you to review."

### Objection-handling snippets (3)

1. **"Will my customers know they're texting a robot — and hate it?"** "They'll know they got an answer in ten seconds instead of a voicemail. MyWorkFlo texts plainly, asks the same questions your dispatcher would, and never pretends to be on the truck. Customers don't rate you on who typed the text — they rate you on who showed up first."
2. **"What if it books something wrong?"** "Then you'd see it before it happened — in Draft and Assisted modes every booking waits for your one-tap OK. Even on Autopilot it can only book job types you've approved, inside hours you set, in your service area, on real open slots from your own calendar. It can't invent an appointment any more than your calendar can."
3. **"Do I have to change my phone number or how my phone works?"** "No. Your number stays your number and calls still ring you first. MyWorkFlo only steps in when a call gets missed — that's the moment you're currently paying for in lost jobs, and the only moment we touch."

---

## Priority Fix List

**P0 — before any traffic (blocks all conversion or creates liability):**
1. **Wire the funnel.** Primary hero + pricing CTAs → app signup (`app.myworkflo.com/login`, or a `/start` path); calculator output ends in a plan recommendation + signup button; "Talk to us about Pro" → the existing demo scheduling link (calendar.app.google/nzDu9T3s2b2A5Jo68). ~1 hour of work; converts the page from 0 to functional.
2. **Truth pass.** Remove or clearly mark "coming soon": estimate follow-ups (incl. "2 and 7 days" bullet and Growth plan line), calculator "connect to Jobber/Housecall Pro" phrasing, Pro "Connects to your CRM," Starter "leads by email or sheet." Rewrite "answers calls after hours / answers your phone" to the text-back reality (also in `<meta description>`, OG tags, both JSON-LD blocks, `index.md`, and `llms.txt` — the false claims are currently being fed verbatim to LLMs and search engines).
3. **Reconcile pricing canon** between `PRODUCT_SUMMARY.md` ($249/$449, tech-count fit, seats, caps) and the live site ($299/$599, vague fits) — then update whichever is wrong everywhere (landing HTML, JSON-LD, `index.md`, onboarding plan page).

**P1 — before spending on acquisition:**
4. Add risk reversal to pricing: "No contract. Cancel anytime. No setup fee." (Already true per the app's own copy.) Consider early-access framing if billing stays off.
5. Add the phone-number mechanics story ("keep your number, calls ring you first") to How-it-works and FAQ.
6. Landing footer: privacy + terms links, SMS-consent sentence, contact email, company identity.
7. Login page copy: "Sign in or create your account"; add one reassurance line + logo linking back to myworkflo.com.

**P2 — first iteration after launch:**
8. Rebalance hero: money-forward headline, emphasis on "book the job," control line under the CTA; tighten subhead to one sentence.
9. Add comparison strip (answering service / text-back tools / MyWorkFlo) and a labeled example SMS thread.
10. Founder note as interim social proof; dispatcher/office-manager sentence.
11. Reframe "Sample week" metrics as explicit illustration or replace with calculator output.

**P3 — housekeeping:**
12. Replace boilerplate `README.md` (public repo) with a one-paragraph product description.
13. "2 langs" → "English + Spanish"; audit skeuomorph labels ("Form 04822") for whether they earn their space.
14. When estimate follow-ups / integrations actually ship, reintroduce each as a "New" announcement — they're better as launch moments than as recovered bullets.
