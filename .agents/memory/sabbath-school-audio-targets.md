---
name: Adventech Sabbath School audio target duplicates
description: How to choose canonical daily lesson audio without losing valid URLs when Adventech metadata is duplicated or partial
---

**Rule:** Choose “Adult Bible Study Guides” audio deterministically when multiple Adventech entries share one lesson/day target. Never use last-entry-wins feed order, and never clear valid stored URLs before a replacement feed has been parsed and matched.

**Why:** Adventech audio metadata can contain duplicate targets from the adult lesson, Ellen G. White notes, teacher material, or duplicate recordings. Feed order is not a source-of-truth signal. Metadata can also be empty or partial while a quarter is being published.

**How to apply:** Parse and validate the complete audio payload first, rank the canonical adult lesson source, update only matched lesson days, preserve valid unmatched URLs, and let the reader hide a URL that fails at playback time.