import { Router, Request, Response } from "express";
import { requireRole } from "../middleware/auth";
import { runAnalyticsRollup } from "../workers/analyticsRollupWorker";
import { runHeatmapTiles } from "../workers/heatmapTileWorker";
import { runActivityPattern } from "../workers/activityPatternWorker";

const router = Router();

const VALID_WORKERS = ["analytics_rollup", "heatmap_tiles", "activity_pattern"] as const;

router.post(
  "/run",
  requireRole("admin"),
  async (req: Request, res: Response) => {
    const { worker_name } = req.body;

    if (!worker_name || !VALID_WORKERS.includes(worker_name)) {
      return res.status(400).json({
        error: `worker_name must be one of: ${VALID_WORKERS.join(", ")}`,
      });
    }

    try {
      const startTime = Date.now();

      if (worker_name === "analytics_rollup") {
        await runAnalyticsRollup();
      } else if (worker_name === "heatmap_tiles") {
        await runHeatmapTiles();
      } else {
        await runActivityPattern();
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      res.json({
        success: true,
        worker: worker_name,
        elapsed_sec: parseFloat(elapsed),
      });
    } catch (err) {
      console.error(`[AdminWorkers] ${worker_name} failed:`, err);
      res.status(500).json({
        error: "Worker execution failed",
        worker: worker_name,
      });
    }
  }
);

export default router;
