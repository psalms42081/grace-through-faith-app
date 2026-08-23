import { Router, type RequestHandler } from "express";
import { requireAuth } from "../middleware/auth";
import { aiGenerationLimiter } from "../middleware/rate-limit";
import type { SabbathSchoolTutorMessage } from "../services/ai-engine";

export type DayTutorContext = {
  quarterlyTitle: string;
  lessonTitle: string;
  lessonNumber: number;
  dayTitle: string | null;
  dayNumber: number;
  sourceContent: string | null;
};

type GenerateTutorResponse = (params: Omit<DayTutorContext, "sourceContent"> & {
  sourceContent: string;
  question: string;
  conversationHistory: SabbathSchoolTutorMessage[];
}) => Promise<string>;

type CreateDayTutorRouterOptions = {
  findContext: (lessonId: string, dayId: string) => Promise<DayTutorContext | null>;
  generateResponse: GenerateTutorResponse;
  requireMember?: RequestHandler;
  generationLimiter?: RequestHandler;
};

export function createDayTutorRouter({
  findContext,
  generateResponse,
  requireMember = requireAuth,
  generationLimiter = aiGenerationLimiter,
}: CreateDayTutorRouterOptions) {
  const router = Router();

  router.get(
    "/api/sabbath-school/day-tutor/context",
    requireMember,
    async (req, res) => {
      try {
        const lessonId = String(req.query.lessonId || "");
        const dayId = String(req.query.dayId || "");
        if (!lessonId || !dayId) {
          return res.status(400).json({ error: "lessonId and dayId are required" });
        }

        const context = await findContext(lessonId, dayId);
        if (!context) {
          return res.status(404).json({ error: "Daily lesson context was not found" });
        }
        if (!context.sourceContent?.trim()) {
          return res.status(409).json({ error: "This daily lesson does not have source content yet" });
        }

        return res.json({
          quarterlyTitle: context.quarterlyTitle,
          lessonTitle: context.lessonTitle,
          lessonNumber: context.lessonNumber,
          dayTitle: context.dayTitle,
          dayNumber: context.dayNumber,
        });
      } catch (err) {
        console.error("Sabbath School day tutor context error:", err);
        return res.status(500).json({ error: "Daily lesson context could not be loaded" });
      }
    },
  );

  router.post(
    "/api/sabbath-school/day-tutor",
    requireMember,
    generationLimiter,
    async (req, res) => {
      try {
        const { lessonId, dayId, question, conversationHistory } = req.body;
        if (typeof lessonId !== "string" || typeof dayId !== "string") {
          return res.status(400).json({ error: "lessonId and dayId are required" });
        }
        if (typeof question !== "string" || !question.trim()) {
          return res.status(400).json({ error: "A question is required" });
        }
        if (question.trim().length > 1500) {
          return res.status(400).json({ error: "Questions must be 1,500 characters or fewer" });
        }

        // Resolve source content on every request so client data can never become
        // the model's authoritative lesson context.
        const context = await findContext(lessonId, dayId);
        if (!context) {
          return res.status(404).json({ error: "Daily lesson context was not found" });
        }
        if (!context.sourceContent?.trim()) {
          return res.status(409).json({ error: "This daily lesson does not have source content yet" });
        }

        const history: SabbathSchoolTutorMessage[] = Array.isArray(conversationHistory)
          ? conversationHistory
              .slice(-8)
              .filter(
                (message): message is SabbathSchoolTutorMessage =>
                  message &&
                  (message.role === "user" || message.role === "assistant") &&
                  typeof message.content === "string" &&
                  message.content.trim().length > 0,
              )
              .map((message) => ({
                role: message.role,
                content: message.content.trim().slice(0, 1500),
              }))
          : [];

        const answer = await generateResponse({
          ...context,
          sourceContent: context.sourceContent.slice(0, 30000),
          question: question.trim(),
          conversationHistory: history,
        });

        return res.json({
          answer,
          context: {
            quarterlyTitle: context.quarterlyTitle,
            lessonTitle: context.lessonTitle,
            lessonNumber: context.lessonNumber,
            dayTitle: context.dayTitle,
            dayNumber: context.dayNumber,
          },
        });
      } catch (err) {
        console.error("Sabbath School day tutor error:", err);
        return res.status(500).json({ error: "Study Tutor could not answer right now" });
      }
    },
  );

  return router;
}