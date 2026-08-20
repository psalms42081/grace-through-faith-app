---
name: GTF workflow rules with Joe
description: Process agreements for the Path B rollout and known tooling glitches
---

- Phase stop points must come BEFORE swapping a new screen into navigation, not after. Build on a hidden route, present for approval, then wire the swap.
- **Why:** Joe approved Phase 1 (Aug 2026) but explicitly asked that future stops happen pre-swap.
- Task-approval UI has repeatedly registered Joe's approvals as CANCELLED (3+ times). If a proposed/follow-up task he wants gets cancelled by the glitch, confirm intent verbally and do small, safe work directly in-session instead of re-proposing.
- **How to apply:** At the end of each Path B brief phase: verify, review, present — leave the nav swap as the first act of the next approved step.
- Durable CodeExecution rejects parameterless `catch {}` blocks in impure scripts; always bind an error variable, even when it is unused.
- **Why:** The replay compiler reports `null does not match type Pattern` before the impure operation runs, obscuring the real workflow status.
- **How to apply:** Write `catch (error) {}` in CodeExecution callbacks and diagnose provider/API failures only after the script parses successfully.
