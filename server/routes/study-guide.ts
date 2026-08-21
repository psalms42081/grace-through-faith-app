import { Router } from "express";
import { db } from "../db";
import { aiGenerationLimiter } from "../middleware/rate-limit";
import { getErrorStatusCode } from "../services/ai-semaphore";
import { studyGuideSessions } from "../../shared/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { extractUserId, getAuthUserId } from "../middleware/auth";
import {
  generateStudyGuideStart,
  generateStudyGuideResponse,
  parseEvaluationTag,
  inferObserveCategory,
  generateStudySummary,
} from "../services/ai-engine";
import {
  resolveReference,
  ScriptureError,
} from "../services/scripture-service";

const router = Router();

// Sessions created before translation-awareness (or any session missing an
// explicit translation in its progression metadata) are treated as KJV.
const LEGACY_TRANSLATION = "KJV";
const SCRIPTURE_CONTRACT_VERSION = "canonical-v1";

function normalizeTranslation(value: unknown): string {
  const raw = typeof value === "string" ? value.trim() : "";
  return raw ? raw.toUpperCase() : "";
}

/**
 * Read the translation persisted in a session's progression JSON metadata.
 * Legacy sessions with no recorded translation are considered KJV.
 */
function sessionTranslation(session: { progression: string | null }): string {
  try {
    const prog = JSON.parse(session.progression || "{}");
    const t = normalizeTranslation(prog?.meta?.translation);
    return t || LEGACY_TRANSLATION;
  } catch {
    return LEGACY_TRANSLATION;
  }
}

function sessionUsesCanonicalScripture(session: { progression: string | null }): boolean {
  try {
    const prog = JSON.parse(session.progression || "{}");
    return prog?.meta?.scriptureContractVersion === SCRIPTURE_CONTRACT_VERSION;
  } catch {
    return false;
  }
}

/**
 * Map a ScriptureError to an appropriate HTTP status code. Any other error
 * falls through to 500.
 */
function scriptureErrorStatus(err: unknown): number {
  if (err instanceof ScriptureError) return err.statusCode;
  return getErrorStatusCode(err);
}

router.get("/api/study-guide/active", async (req, res) => {
  try {
    const userId = extractUserId(req);
    const verseReference = String(req.query.verseReference || "");
    const translation = normalizeTranslation(req.query.translation) || LEGACY_TRANSLATION;
    if (!verseReference) {
      return res.status(400).json({ error: "verseReference is required" });
    }

    // No schema column for translation: fetch candidate active sessions and
    // filter by translation (derived from progression metadata) in app code.
    const candidates = await db
      .select()
      .from(studyGuideSessions)
      .where(
        and(
          eq(studyGuideSessions.userId, userId),
          eq(studyGuideSessions.verseReference, verseReference),
          sql`${studyGuideSessions.completedAt} IS NULL`
        )
      )
      .orderBy(desc(studyGuideSessions.createdAt));

    const activeSession = candidates.find(
      (s) => sessionUsesCanonicalScripture(s) && sessionTranslation(s) === translation
    );

    if (!activeSession) {
      return res.json({ found: false });
    }

    const parsedProgression = JSON.parse(activeSession.progression || "{}");
    return res.json({
      found: true,
      session: {
        ...activeSession,
        translation: sessionTranslation(activeSession),
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
    // Destructure but intentionally ignore client-supplied verseText — it is
    // resolved server-side from the canonical scripture endpoint so client text
    // cannot be injected as AI input.
    const { verseReference, forceNew = false, persona = "pastoral" } = req.body;
    const userId = extractUserId(req);
    const translation = normalizeTranslation(req.body.translation);

    if (!verseReference) {
      return res.status(400).json({ error: "verseReference and translation are required" });
    }
    if (!translation) {
      return res.status(400).json({ error: "verseReference and translation are required" });
    }

    // ── 1. Resolve canonical text FIRST — before any cache/resume check ───────
    // Provider/entitlement failures throw ScriptureError and are surfaced
    // explicitly; they can never be masked by a resumed session.
    let resolvedVerseText: string;
    let resolvedBookName: string;
    let resolvedChapter: number;
    let resolvedVerse: number;
    let resolvedMeta: {
      translation: string;
      translationName: string;
      source: string;
      provider?: string;
      providerEditionId?: string;
    };

    try {
      const canonical = await resolveReference({ reference: verseReference, translation });
      // Join all resolved verses (handles ranges) into a single text string.
      resolvedVerseText = canonical.verses.map((v: any) => v.text).join(" ").trim();
      resolvedBookName = canonical.book.name;
      resolvedChapter = canonical.chapter;
      resolvedMeta = canonical.meta;
      // For a single-verse reference use the first verse number; for a range
      // use the starting verse from the parsed reference.
      resolvedVerse =
        (canonical.verses[0] as any)?.verse ??
        canonical.reference.verses[0] ??
        1;
    } catch (err) {
      if (err instanceof ScriptureError) {
        return res.status(err.statusCode).json({ error: err.message, code: err.code });
      }
      throw err;
    }

    const validPersonas = ["pastoral", "ellen-white"];
    const resolvedPersona = validPersonas.includes(persona) ? persona : "pastoral";

    // ── 2. Cache/resume check — only after canonical resolution succeeds ───────
    if (!forceNew) {
      // No schema column for translation: filter candidate active sessions by
      // the translation stored in progression metadata. An explicit non-KJV
      // request must NOT resume a legacy (KJV-only) session.
      const candidates = await db
        .select()
        .from(studyGuideSessions)
        .where(
          and(
            eq(studyGuideSessions.userId, userId),
            eq(studyGuideSessions.verseReference, verseReference),
            sql`${studyGuideSessions.completedAt} IS NULL`
          )
        )
        .orderBy(desc(studyGuideSessions.createdAt));

      const existingActive = candidates.find(
        (s) => sessionUsesCanonicalScripture(s) && sessionTranslation(s) === translation
      );

      if (existingActive) {
        const messages = JSON.parse(existingActive.messages);
        const prog = JSON.parse(existingActive.progression || "{}");
        return res.json({
          session: { ...existingActive, translation, messages, progression: prog },
          aiMessage: messages[messages.length - 1]?.content || "",
          translation,
          resumed: true,
        });
      }
    }

    // ── 3. Generate AI intro using canonical server-resolved text ─────────────
    const aiMessage = await generateStudyGuideStart({
      verseReference,
      verseText: resolvedVerseText,
      translation,
      persona: resolvedPersona,
    });

    const messages = [
      { role: "assistant", content: aiMessage, phase: "observe", timestamp: new Date().toISOString() },
    ];

    const initialProgression = {
      meta: {
        translation,
        scriptureContractVersion: SCRIPTURE_CONTRACT_VERSION,
        providerEditionId: resolvedMeta.providerEditionId,
      },
      observe: { completed: false, responses: [] as string[], meaningfulCount: 0, completedAt: null, categories: [] as string[] },
      interpret: { completed: false, responses: [] as string[], meaningfulCount: 0, completedAt: null, categories: [] as string[] },
      apply: { completed: false, responses: [] as string[], meaningfulCount: 0, completedAt: null, categories: [] as string[] },
    };

    // Persist the server-resolved canonical text — not the client-supplied one.
    const [session] = await db.insert(studyGuideSessions).values({
      userId,
      verseReference,
      verseText: resolvedVerseText,
      bookName: resolvedBookName,
      chapter: resolvedChapter,
      verse: resolvedVerse,
      phase: "observe",
      persona: resolvedPersona,
      messages: JSON.stringify(messages),
      progression: JSON.stringify(initialProgression),
    }).returning();

    return res.json({
      session: { ...session, translation, messages, progression: initialProgression },
      aiMessage,
      ...resolvedMeta,
    });
  } catch (err) {
    console.error(err);
    return res.status(scriptureErrorStatus(err)).json({ error: "Internal server error" });
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
        translation: sessionTranslation(session),
        summary: session.summary,
      });
    }

    const existingMessages = JSON.parse(session.messages);
    const currentPhase = session.phase;
    const progression = JSON.parse(session.progression || "{}");

    // Use the translation stored with this session (legacy sessions are KJV).
    const translation = sessionTranslation(session);
    if (!progression.meta) progression.meta = { translation };
    else if (!normalizeTranslation(progression.meta.translation)) progression.meta.translation = translation;

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
      translation,
      chatMessages,
      targetPhase: currentPhase,
      currentPhase,
      persona: session.persona,
    });

    const { text: aiText, quality, category } = parseEvaluationTag(rawAiMessage, userResponse, session.verseText, currentPhase);

    if (stageData && quality === "meaningful") {
      if (currentPhase === "observe") {
        const resolvedCat = category && category !== "other" ? category : inferObserveCategory(userResponse);
        console.log(`[study-guide] observe: resolvedCat=${resolvedCat} existing=${JSON.stringify(stageData.categories)} duplicate=${stageData.categories.includes(resolvedCat)}`);
        if (!stageData.categories.includes(resolvedCat)) {
          stageData.categories.push(resolvedCat);
          stageData.meaningfulCount++;
        }
      } else {
        stageData.meaningfulCount++;
      }
    }
    console.log(`[study-guide] phase=${currentPhase} quality=${quality} meaningfulCount=${stageData?.meaningfulCount || 0} categories=${JSON.stringify(stageData?.categories || [])}`);

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
        translation,
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
        translation,
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
      translation,
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
    // Expose translation derived from progression metadata (legacy = KJV).
    const withTranslation = sessions.map((s) => ({ ...s, translation: sessionTranslation(s) }));
    return res.json(withTranslation);
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
    return res.json({ ...session, translation: sessionTranslation(session), messages: JSON.parse(session.messages) });
  } catch (err) {
    console.error(err);
    return res.status(getErrorStatusCode(err)).json({ error: "Internal server error" });
  }
});

export default router;
