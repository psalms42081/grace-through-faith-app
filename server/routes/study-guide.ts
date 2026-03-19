import { Router } from "express";
import { db } from "../db";
import { aiGenerationLimiter } from "../middleware/rate-limit";
import { getErrorStatusCode } from "../services/ai-semaphore";
import { studyGuideSessions } from "../../shared/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { extractUserId } from "../middleware/auth";
import {
  generateStudyGuideStart,
  generateStudyGuideResponse,
  parseEvaluationTag,
  inferObserveCategory,
  generateStudySummary,
} from "../services/ai-engine";

const router = Router();

router.get("/api/study-guide/active", async (req, res) => {
  try {
    const userId = extractUserId(req);
    const verseReference = String(req.query.verseReference || "");
    if (!verseReference) {
      return res.status(400).json({ error: "verseReference is required" });
    }

    const [activeSession] = await db
      .select()
      .from(studyGuideSessions)
      .where(
        and(
          eq(studyGuideSessions.userId, userId),
          eq(studyGuideSessions.verseReference, verseReference),
          sql`${studyGuideSessions.completedAt} IS NULL`
        )
      )
      .orderBy(desc(studyGuideSessions.createdAt))
      .limit(1);

    if (!activeSession) {
      return res.json({ found: false });
    }

    const parsedProgression = JSON.parse(activeSession.progression || "{}");
    return res.json({
      found: true,
      session: {
        ...activeSession,
        messages: JSON.parse(activeSession.messages),
        progression: parsedProgression,
        summary: activeSession.summary || null,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(getErrorStatusCode(err)).json({ error: "Internal server error" });
  }
});

router.post("/api/study-guide/start", aiGenerationLimiter, async (req, res) => {
  try {
    const { verseReference, verseText, bookName, chapter, verse, forceNew = false, persona = "scholarly" } = req.body;
    const userId = extractUserId(req);
    if (!verseReference || !verseText) {
      return res.status(400).json({ error: "verseReference and verseText are required" });
    }

    const validPersonas = ["scholarly", "pastoral", "ancient"];
    const resolvedPersona = validPersonas.includes(persona) ? persona : "scholarly";

    if (!forceNew) {
      const [existingActive] = await db
        .select()
        .from(studyGuideSessions)
        .where(
          and(
            eq(studyGuideSessions.userId, userId),
            eq(studyGuideSessions.verseReference, verseReference),
            sql`${studyGuideSessions.completedAt} IS NULL`
          )
        )
        .orderBy(desc(studyGuideSessions.createdAt))
        .limit(1);

      if (existingActive) {
        const messages = JSON.parse(existingActive.messages);
        const prog = JSON.parse(existingActive.progression || "{}");
        return res.json({
          session: { ...existingActive, messages, progression: prog },
          aiMessage: messages[messages.length - 1]?.content || "",
          resumed: true,
        });
      }
    }

    const aiMessage = await generateStudyGuideStart({ verseReference, verseText, persona: resolvedPersona });

    const messages = [
      { role: "assistant", content: aiMessage, phase: "observe", timestamp: new Date().toISOString() },
    ];

    const initialProgression = {
      observe: { completed: false, responses: [] as string[], meaningfulCount: 0, completedAt: null, categories: [] as string[] },
      interpret: { completed: false, responses: [] as string[], meaningfulCount: 0, completedAt: null, categories: [] as string[] },
      apply: { completed: false, responses: [] as string[], meaningfulCount: 0, completedAt: null, categories: [] as string[] },
    };

    const [session] = await db.insert(studyGuideSessions).values({
      userId,
      verseReference,
      verseText,
      bookName: bookName || "",
      chapter: chapter || 0,
      verse: verse || 0,
      phase: "observe",
      persona: resolvedPersona,
      messages: JSON.stringify(messages),
      progression: JSON.stringify(initialProgression),
    }).returning();

    return res.json({
      session: { ...session, messages, progression: initialProgression },
      aiMessage,
    });
  } catch (err) {
    console.error(err);
    return res.status(getErrorStatusCode(err)).json({ error: "Internal server error" });
  }
});

const STAGE_THRESHOLDS: Record<string, number> = { observe: 2, interpret: 2, apply: 1 };
const STAGE_ORDER = ["observe", "interpret", "apply"];

router.post("/api/study-guide/respond", aiGenerationLimiter, async (req, res) => {
  try {
    const { sessionId, userResponse } = req.body;
    const userId = extractUserId(req);
    if (!sessionId || !userResponse) {
      return res.status(400).json({ error: "sessionId and userResponse are required" });
    }

    const [session] = await db.select().from(studyGuideSessions).where(eq(studyGuideSessions.id, sessionId)).limit(1);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (session.phase === "complete" || session.completedAt) {
      const msgs = JSON.parse(session.messages);
      const prog = JSON.parse(session.progression || "{}");
      return res.json({
        aiMessage: "",
        phase: "complete",
        isComplete: true,
        messages: msgs,
        progression: prog,
        summary: session.summary,
      });
    }

    const existingMessages = JSON.parse(session.messages);
    const currentPhase = session.phase;
    const progression = JSON.parse(session.progression || "{}");

    const defaultStage = { completed: false, responses: [] as string[], meaningfulCount: 0, completedAt: null, categories: [] as string[] };
    if (!progression.observe) progression.observe = { ...defaultStage };
    if (!progression.interpret) progression.interpret = { ...defaultStage };
    if (!progression.apply) progression.apply = { ...defaultStage };
    if (!progression.observe.categories) progression.observe.categories = [];
    if (!progression.interpret.categories) progression.interpret.categories = [];
    if (!progression.apply.categories) progression.apply.categories = [];

    existingMessages.push({ role: "user", content: userResponse, phase: currentPhase, timestamp: new Date().toISOString() });

    const stageData = progression[currentPhase as keyof typeof progression];
    if (stageData) {
      stageData.responses.push(userResponse);
    }

    const chatMessages = existingMessages.map((m: any) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const rawAiMessage = await generateStudyGuideResponse({
      verseText: session.verseText,
      verseReference: session.verseReference,
      chatMessages,
      targetPhase: currentPhase,
      currentPhase,
      persona: session.persona,
    });

    const { text: aiText, quality, category } = parseEvaluationTag(rawAiMessage, userResponse, session.verseText, currentPhase);

    if (stageData && quality === "meaningful") {
      if (currentPhase === "observe") {
        const resolvedCat = category && category !== "other" ? category : inferObserveCategory(userResponse);
        if (!stageData.categories.includes(resolvedCat)) {
          stageData.categories.push(resolvedCat);
          stageData.meaningfulCount++;
        }
      } else {
        stageData.meaningfulCount++;
      }
    }

    const threshold = STAGE_THRESHOLDS[currentPhase] || 2;
    let shouldAdvance = false;
    let nextPhase = currentPhase;

    const meetsThreshold = currentPhase === "observe"
      ? stageData && stageData.categories && stageData.categories.length >= threshold
      : stageData && stageData.meaningfulCount >= threshold;

    if (meetsThreshold && stageData && !stageData.completed) {
      stageData.completed = true;
      stageData.completedAt = new Date().toISOString();
      shouldAdvance = true;

      const currentIdx = STAGE_ORDER.indexOf(currentPhase);
      if (currentIdx < STAGE_ORDER.length - 1) {
        nextPhase = STAGE_ORDER[currentIdx + 1];
      } else {
        nextPhase = "complete";
      }
    }

    let finalAiText = aiText;
    let summary: string | null = null;

    if (shouldAdvance && nextPhase !== "complete") {
      const transitionAi = await generateStudyGuideResponse({
        verseText: session.verseText,
        verseReference: session.verseReference,
        chatMessages: [...chatMessages, { role: "assistant", content: aiText }],
        targetPhase: nextPhase,
        currentPhase,
        persona: session.persona,
      });
      const { text: transitionText } = parseEvaluationTag(transitionAi);
      finalAiText = aiText + "\n\n" + transitionText;
    }

    if (shouldAdvance && nextPhase === "complete") {
      const userAnswers = {
        observe: progression.observe.responses || [],
        interpret: progression.interpret.responses || [],
        apply: progression.apply.responses || [],
      };
      summary = await generateStudySummary({
        verseReference: session.verseReference,
        verseText: session.verseText,
        userAnswers,
      });
      finalAiText = aiText + (summary ? "\n\n" + summary : "");
    }

    const resolvedPhase = shouldAdvance ? nextPhase : currentPhase;

    existingMessages.push({ role: "assistant", content: finalAiText, phase: resolvedPhase, timestamp: new Date().toISOString() });

    await db.update(studyGuideSessions)
      .set({
        messages: JSON.stringify(existingMessages),
        phase: resolvedPhase,
        progression: JSON.stringify(progression),
        ...(resolvedPhase === "complete" ? { completedAt: new Date(), summary } : {}),
      })
      .where(eq(studyGuideSessions.id, sessionId));

    return res.json({
      aiMessage: finalAiText,
      phase: resolvedPhase,
      isComplete: resolvedPhase === "complete",
      messages: existingMessages,
      progression,
      summary,
    });
  } catch (err) {
    console.error(err);
    return res.status(getErrorStatusCode(err)).json({ error: "Internal server error" });
  }
});

router.get("/api/study-guide/sessions", async (req, res) => {
  try {
    const userId = extractUserId(req);
    const sessions = await db.select().from(studyGuideSessions)
      .where(eq(studyGuideSessions.userId, userId))
      .orderBy(desc(studyGuideSessions.createdAt))
      .limit(20);
    return res.json(sessions);
  } catch (err) {
    console.error(err);
    return res.status(getErrorStatusCode(err)).json({ error: "Internal server error" });
  }
});

router.post("/api/study-guide/complete/:id", async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Authentication required" });
    const [session] = await db.select({ userId: studyGuideSessions.userId })
      .from(studyGuideSessions)
      .where(eq(studyGuideSessions.id, String(req.params.id)))
      .limit(1);
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (session.userId !== userId) return res.status(403).json({ error: "Not your session" });
    await db
      .update(studyGuideSessions)
      .set({ completedAt: new Date(), phase: "complete" })
      .where(eq(studyGuideSessions.id, String(req.params.id)));
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(getErrorStatusCode(err)).json({ error: "Internal server error" });
  }
});

router.get("/api/study-guide/session/:id", async (req, res) => {
  try {
    const [session] = await db.select().from(studyGuideSessions)
      .where(eq(studyGuideSessions.id, String(req.params.id)))
      .limit(1);
    if (!session) return res.status(404).json({ error: "Session not found" });
    return res.json({ ...session, messages: JSON.parse(session.messages) });
  } catch (err) {
    console.error(err);
    return res.status(getErrorStatusCode(err)).json({ error: "Internal server error" });
  }
});

export default router;
