import { Router, Request, Response } from "express";

const router = Router();

router.post("/events", (req: Request, res: Response) => {
  const { events } = req.body;
  if (!Array.isArray(events)) {
    return res.status(400).json({ error: "events must be an array" });
  }

  for (const evt of events) {
    const props = evt.properties ? ` ${JSON.stringify(evt.properties)}` : "";
    console.log(`[Analytics] ${evt.event}${props} (${evt.platform || "unknown"}, ${new Date(evt.timestamp).toISOString()})`);
  }

  res.json({ received: events.length });
});

router.post("/error", (req: Request, res: Response) => {
  const { error, componentStack, timestamp, platform } = req.body;
  console.error(`[CrashReport] ${error} (${platform || "unknown"}, ${new Date(timestamp).toISOString()})`);
  if (componentStack) {
    console.error(`[CrashReport] Stack: ${componentStack.substring(0, 500)}`);
  }
  res.json({ reported: true });
});

export default router;
