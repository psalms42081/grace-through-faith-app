---
name: Pastoral AI safety notes
description: Why required clinical and crisis language in generated pastoral studies needs a deterministic server-owned path.
---

Required clinical, crisis, and uncertainty language must not depend on prompt compliance alone. Keep a human-reviewed, user-facing care note for each sensitive topic and append one canonical copy to the generated study on the server.

**Why:** A live grief-study generation omitted explicit crisis and unknown-faith boundaries even though the prompt included them. The model later followed a stronger prompt, but prompt compliance is not a safety guarantee.

**How to apply:** When adding or changing mandatory safety language, update both the model guidance and the deterministic care note, normalize away exact model copies before appending one canonical copy, and bump the generated-study cache version so older responses cannot bypass the change. When the runtime uses a compiled server bundle, rebuild and inspect that bundle too; source-only verification cannot prove the shipped safety path.