import { Router } from "express";
import { db } from "../db";
import { gcExplorationCache } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { aiGenerationLimiter } from "../middleware/rate-limit";
import { generateGCExploration } from "../services/ai-engine";
import { GC_NODES } from "../../data/great-controversy";

const router = Router();

router.post("/api/great-controversy/explore", aiGenerationLimiter, async (req, res) => {
  try {
    const { nodeId } = req.body;
    if (!nodeId || typeof nodeId !== "string") {
      return res.status(400).json({ error: "nodeId is required" });
    }

    const node = GC_NODES.find((n) => n.id === nodeId);
    if (!node) {
      return res.status(404).json({ error: "Node not found" });
    }

    const existing = await db
      .select()
      .from(gcExplorationCache)
      .where(eq(gcExplorationCache.nodeId, nodeId))
      .limit(1);

    if (existing.length > 0) {
      return res.json({
        nodeId: existing[0].nodeId,
        narrativeExplanation: existing[0].narrativeExplanation,
        connections: existing[0].connections,
        reflectionQuestion: existing[0].reflectionQuestion,
      });
    }

    const nodeIndex = GC_NODES.findIndex((n) => n.id === nodeId);
    const prevNode = nodeIndex > 0 ? GC_NODES[nodeIndex - 1] : null;
    const nextNode = nodeIndex < GC_NODES.length - 1 ? GC_NODES[nodeIndex + 1] : null;

    const result = await generateGCExploration({
      nodeId,
      title: node.title,
      aiPromptContext: node.aiPromptContext,
      prevNodeTitle: prevNode?.title ?? null,
      nextNodeTitle: nextNode?.title ?? null,
    });

    await db
      .insert(gcExplorationCache)
      .values({
        nodeId,
        narrativeExplanation: result.narrativeExplanation,
        connections: result.connections,
        reflectionQuestion: result.reflectionQuestion,
      })
      .onConflictDoNothing();

    return res.json({
      nodeId,
      narrativeExplanation: result.narrativeExplanation,
      connections: result.connections,
      reflectionQuestion: result.reflectionQuestion,
    });
  } catch (err) {
    console.error("Great Controversy exploration error:", err);
    return res.status(500).json({ error: "Failed to generate exploration content" });
  }
});

export default router;
