---
name: Device-local daily boundaries
description: Timezone and query-cache rules for features that roll over on a member's local calendar day.
---

All member-facing “today” behavior must derive its calendar date from the device’s IANA timezone, including daily content, Sabbath School markers, reading streak writes, streak resets, and weekly grouping. Do not use UTC dates or server-local dates as the member’s day.

**Why:** Australian mornings and post-midnight reads occur on a different date from UTC. This previously produced mismatched Home dayparts and assigned streak activity to the wrong day.

**How to apply:** Send the device timezone on every date-keyed read and write. Use the local date in cache identity so data refreshes at midnight, but use an explicit request function when adding cache-only fields; the default query function joins key elements into the URL. Validate zones server-side with a safe UTC fallback.