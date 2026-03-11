import { Router, Request, Response } from "express";

const router = Router();

router.post("/events", (req: Request, res: Response) => {
  try {
    const { events } = req.body;
    if (!Array.isArray(events)) {
      return res.status(400).json({ error: "events must be an array" });
    }
    const capped = events.slice(0, 50);
    for (const evt of capped) {
      const props = evt.properties ? ` ${JSON.stringify(evt.properties)}` : "";
      console.log(`[Analytics] ${evt.event}${props} (${evt.platform || "unknown"}, ${new Date(evt.timestamp).toISOString()})`);
    }
    res.json({ received: capped.length });
  } catch (err) {
    console.error("Analytics events error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/error", (req: Request, res: Response) => {
  try {
    const { error, componentStack, timestamp, platform } = req.body;
    console.error(`[CrashReport] ${error} (${platform || "unknown"}, ${new Date(timestamp).toISOString()})`);
    if (componentStack) {
      console.error(`[CrashReport] Stack: ${String(componentStack).substring(0, 500)}`);
    }
    res.json({ reported: true });
  } catch (err) {
    console.error("Analytics error report error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
