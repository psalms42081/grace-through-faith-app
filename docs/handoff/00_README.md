# GTF v11 + Age-Banded + Analytics — Dev Handoff Brief
## Prepared for: [Dev name]
## Date: April 20, 2026
## Prepared by: Joe Hussey, Founder, Grace Through Faith

---

## What's in this package

Three technical specification documents and a Replit canvas full of 
visual mockups. Together they form the complete specification for 
Grace Through Faith v11 — the next major version of the app, covering 
three distinct product surfaces:

1. **GTF v11 Main App** — mobile app redesign (5 screens, light + dark)
2. **Age-Banded Experience** — Kids Club, Juniors Club, Parent 
   Onboarding (8 screens, light mode)
3. **GTF Institutional Intelligence** — desktop analytics dashboards 
   for Pastor / Conference / Union / Division / GC (10 desktop frames, 
   light + dark, plus drill-downs and board insets)

All 26 screens are visual mockups with written rationale. They are 
NOT code. They are the specification you build against.

---

## Context: how this specification was produced

Over two days in April 2026, I worked through three design sprints 
using AI collaboration (Claude + Replit Agent) to produce these 
specifications. The mockups were iterated through multiple review 
cycles to lock design tokens, component patterns, privacy 
architecture, and rationale.

This is NOT a "vibe code" hand-off. Every decision in the specification 
has a documented rationale — 20 paragraphs across 5 dashboards plus 
rationale docs for the mobile surfaces. When you encounter something 
that seems odd, read the rationale before changing it. A lot of the 
non-obvious design calls are load-bearing (especially around privacy, 
Adventech content attribution, and gold usage).

However: **mockups lie about reality in specific ways.** Text fits 
differently in real rendering. Performance implications don't show 
up on a canvas. Accessibility requirements don't enforce themselves. 
This is where your judgment matters more than the spec. I want you 
pushing back when something doesn't work in production even though 
it looks right on canvas.

---

## Scope of this engagement

What I am NOT asking you to do:
- Build all 26 screens at once
- Work alone without input from me
- Treat the specification as immutable

What I AM asking you to do:
- Help me phase this work into shippable chunks
- Tell me where the spec will break down in real code and why
- Build the phases we agree on, with the discipline patterns 
  documented in the specs intact
- Push back when my design thinking conflicts with engineering reality

This is collaborative delivery. You are a technical partner on this 
build, not an order-taker.

---

## Suggested phasing — for your review and pushback

My proposed phase order is below. These are my instincts; tell me 
where I'm wrong.

**Phase 1 — v11 Main App (5 screens)**
The mobile app redesign. Home, Bible Reader, Discover, Sabbath 
School Detail, Profile. This replaces the current GTF mobile UI. 
Highest user-facing value, most constrained scope, should ship first.
Estimated scope: 4-6 weeks full-time equivalent, less if you work 
part-time with me filling gaps.

**Phase 2 — Age-Banded Experience (8 screens)**
Kids Club, Juniors Club, Parent Onboarding. This is a major feature 
addition that requires Phase 1 to be locked (age-band routing depends 
on Phase 1 identity handling). Cannot ship before Phase 1.
Estimated scope: 3-4 weeks full-time.

**Phase 3 — Institutional Analytics (10 desktop frames)**
Desktop-first dashboards for church hierarchy (Pastor → Conference 
→ Union → Division → GC). This is a separate product surface from 
the mobile app. Needs its own authentication, its own deployment, 
its own backend tables. Can be built in parallel with Phase 2 if you 
want, but probably better sequenced after.
Estimated scope: 6-8 weeks full-time.

**If your estimates diverge substantially from mine, we talk before 
any contract. I'd rather have an accurate timeline than an optimistic one.**

---

## The three technical specifications

### 01_COMPONENT_SPECIFICATION.md
React component inventory. 6 shared primitives plus per-dashboard hero 
components. Full prop signatures and TypeScript types. Includes the 
4 frontend-enforced privacy invariants and the 3 inset surfaces.

Read this to answer: "what do I build?"

### 02_DATABASE_SCHEMA_PROPOSAL.md
Draft PostgreSQL DDL. 9 tables, 3 aggregate views, privacy floor 
enforced at view layer (not application layer), one-hop drill and 
why-field CHECK constraints, role/grant policy.

Read this to answer: "what do I store and where does privacy live?"

Important: the privacy architecture is enforced at the database layer, 
not the application layer. If you find yourself building a feature 
that queries engagement data without going through the aggregate 
views, stop and talk to me. The 5+ reader floor is load-bearing and 
must not be bypassed.

### 03_API_CONTRACT.md
REST endpoints by dashboard surface. Full JSON request/response shapes. 
Authorization model (scope-bound JWT, server-side one-hop drill 
validation). Audit feed endpoint. Export endpoints.

Read this to answer: "what do the frontend and backend talk about?"

---

## The Canvas — live visual specification

You have Replit access to this project. The full visual specification 
lives on the main canvas at the URLs / coordinates below. Scroll to 
each section rather than downloading — the canvas is the source of 
truth and will be updated if anything changes.

**Canvas sections and their y-coordinates:**

- `y=0` — GTF v11 Main App (5 mobile screens, Home / Bible Reader / 
  Discover / Sabbath School Detail / Profile, light + dark)
- `y=13,600` — Age-Banded Experience (Kids Club, Juniors Club, 
  Parent Onboarding, 8 screens)
- `y=25,100` — GTF Analytics Shared Component Kit
- `y=27,800` — Strategic Framing + Discipline Notes + Cluster Anchors
- `y=28,400` — Pastor Dashboard (light + dark + drill-down + 
  4-paragraph rationale)
- `y=31,000` — Conference Dashboard (same pattern)
- `y=33,500` — Union Dashboard
- `y=36,000` — Division Dashboard
- `y=38,600` — General Conference Flagship Dashboard
- `y=42,000` — Privacy Architecture Inset
- `y=42,600` — Drill-Down & Audit Inset
- `y=43,200` — Pay-For Anchors Inset

Use the anchor nav strip at `y=24,940` for fast navigation across 
analytics sections.

Read the rationale columns on the right-hand side of each dashboard. 
They explain the WHY behind every design decision — especially the 
privacy architecture and the Adventech content attribution.

---

## Non-negotiable architectural commitments

These are load-bearing and should not be walked back during 
implementation. Each has detailed rationale in the specs.

**1. Privacy is enforced architecturally, not promised.**
The 5+ reader floor lives in aggregate views, not in application code.
One-hop drill validation lives in server-side API logic, not client 
code. Audit logs fire bidirectionally (when Division president drills 
a pastor's data, the pastor sees who looked and when).

**2. Adventech content attribution on every lesson card.**
Every Sabbath School lesson card in every age band carries a small 
"by Adventech" chip. GTF is positioned as the cinematic front-end for 
Adventech's curriculum, not a competitor. This is strategic positioning, 
not decoration.

**3. Gold #C9933A appears max 3-4 times per screen.**
On main app: streak chip, primary CTA, active tab indicator, one hero 
moment. On analytics dashboards: hero pay-for feature, streak/data 
indicator, primary CTA. If you find yourself adding gold to something 
new, talk to me.

**4. Age-band data is filter, not framing.**
At every level (including analytics dashboards), age breakdown is 
available as a chip-row filter but NEVER as the primary framing of 
a screen. GTF is not a youth app; it's a spiritual companion app for 
members of all ages.

**5. Desktop analytics, mobile main app.**
Analytics dashboards are 1440px desktop-first. Do not try to make them 
responsive-to-mobile — they are a separate product surface. Main app 
is mobile-first, single frame width.

**6. Verified outcome data flows UP under privacy discipline; 
decisions flow DOWN under audit discipline.**
The pastor is the data producer (logs baptisms, memberships, plants). 
Higher levels CONSUME aggregate outcome data. No level can rank the 
level below (no Conference leaderboard for pastors, no Union 
leaderboard for Conferences, etc.). This is the trust economics of 
the entire product.

---

## What I need from you before we start

1. **Read the three specification documents and the canvas exports.**
   Allow yourself 2-3 hours for this. It's a lot of material and the 
   rationale matters.

2. **Write back with:**
   - Your estimated timeline per phase, or if my phasing is wrong, 
     your proposed phasing
   - Technical concerns about anything in the specs that will break 
     in real implementation
   - Questions about anything unclear
   - Your proposed contract structure (milestones, payment cadence, 
     scope boundary)

3. **We schedule a 45-minute call to align on phasing and scope** 
   before any contract is signed or work starts.

---

## Working norms for this engagement

- **Weekly 30-minute syncs** — me showing you what I'm seeing, you 
  showing me what you're building, questions both ways.
- **Slack/email for async** — use your preference, I'll match.
- **GitHub for all code.** No direct Replit pushes to main without 
  PR review. The deploy workflow from the prior engagement still applies.
- **Payment on milestone completion** — not upfront, not on timesheets. 
  Clear milestone, paid on delivery.
- **Push back is welcome.** If I ask for something that's technically 
  wrong, tell me. I'd rather have a disagreement now than a bad 
  architecture later.

---

## One last thing

The specification you're looking at is the product thinking, not the 
product. Your job is to translate it into working code while preserving 
the thinking. When the two conflict (spec says X, real engineering 
says Y), we talk. The rationale paragraphs are there to help you 
understand WHY things are the way they are — so you can make informed 
trade-offs when you need to deviate from the exact spec.

Thanks for continuing this work with me. Looking forward to building 
it properly.

Joe Hussey
joseph@gracethroughfaith.app
gracethroughfaith.app
