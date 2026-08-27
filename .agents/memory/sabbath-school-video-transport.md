---
name: Sabbath School video transport
description: Non-obvious browser and proxy requirements for Adventech Sabbath School MP4 playback.
---

Adventech lesson videos are valid H.264/AAC MP4s with byte-range support, but their CDN responses are not browser-CORS enabled. Web playback therefore uses a source-restricted, range-preserving backend proxy. The media response must allow cross-origin resource loading in Replit development, where frontend and backend use different ports.

**Why:** Direct web playback produced media error 4 even though the assets were live and correctly encoded. An early proxy version also attached its connection timeout to the full response stream, terminating every healthy long-running video at the timeout boundary.

**How to apply:** Keep the proxy restricted to Adventech's HTTPS video host and path. Forward Range and media metadata headers. Apply timeouts only until upstream response headers arrive, never for the lifetime of the stream. Cancel UI failure timers as soon as metadata or playback loads.