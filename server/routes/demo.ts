import { Router, Request, Response } from "express";
import { seedDemoData, clearDemoData, isDemoDataLoaded } from "../seeds/seed-demo";
import { requireAdmin } from "../middleware/auth";

const router = Router();

router.get("/seed", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const result = await seedDemoData();
    return res.json(result);
  } catch (err: any) {
    console.error("[Demo] Seed error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/clear", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const result = await clearDemoData();
    return res.json(result);
  } catch (err: any) {
    console.error("[Demo] Clear error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/status", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const loaded = await isDemoDataLoaded();
    return res.json({ demo_data_loaded: loaded });
  } catch (err: any) {
    console.error("[Demo] Status error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
