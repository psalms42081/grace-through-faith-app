import { Router } from "express";
  import type { Request, Response } from "express";
  import { db } from "../db";
  import { cachedResponse } from "../middleware/response-cache";
  import {
    formationTracks,
    formationModules,
    formationLessons,
    lessonSections,
    formationAssessments,
    assessmentItems,
    progressTracks,
    progressLessons,
    formationModuleI18n,
    formationLessonI18n,
    lessonSectionI18n,
    assessmentItemI18n,
    CONTENT_LANGUAGES,
  } from "../../shared/schema";
  import { eq, and, sql, asc } from "drizzle-orm";
  import { requireAuth, optionalAuth, getAuthUserId, getEffectiveUserId } from "../middleware/auth";
  import { resolveContentLang } from "../middleware/content-lang";

  const router = Router();

  router.get("/api/tracks", cachedResponse(120), async (req: Request, res: Response) => {
  try {
    const lang = resolveContentLang(req);

    const tracks = await db
      .select()
      .from(formationTracks)
      .where(eq(formationTracks.isPublished, true))
      .orderBy(asc(formationTracks.sortOrder));

    const tracksWithCounts = await Promise.all(
      tracks.map(async (track) => {
        const modules = await db
          .select()
          .from(formationModules)
          .where(eq(formationModules.trackId, track.id));
        const modulesWithLessons = modules.filter((m) => (m.totalLessons ?? 0) > 0);
        const totalLessons = modules.reduce((sum, m) => sum + (m.totalLessons ?? 0), 0);
        return { ...track, modulesCount: modules.length, lessonsCount: totalLessons };
      })
    );

    return res.json(tracksWithCounts);
  } catch (err) {
    console.error("Get tracks error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/tracks/progress", async (req: Request, res: Response) => {
  try {
    const userId = getAuthUserId(req) || "guest";
    const progress = await db
      .select()
      .from(progressTracks)
      .where(eq(progressTracks.userId, userId));

    const enriched = await Promise.all(
      progress.map(async (p) => {
        const [track] = await db
          .select()
          .from(formationTracks)
          .where(eq(formationTracks.id, p.trackId));
        return { ...p, track };
      })
    );

    return res.json(enriched);
  } catch (err) {
    console.error("Get track progress error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/tracks/:id", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const userId = getAuthUserId(req) || "guest";
    const lang = resolveContentLang(req);

    const [track] = await db
      .select()
      .from(formationTracks)
      .where(eq(formationTracks.id, id));

    if (!track) {
      return res.status(404).json({ error: "Track not found" });
    }

    const modules = await db
      .select()
      .from(formationModules)
      .where(eq(formationModules.trackId, id))
      .orderBy(asc(formationModules.moduleOrder));

    const allLessonIds: string[] = [];
    const modulesWithLessons = await Promise.all(
      modules.map(async (mod) => {
        let localizedMod = { ...mod };
        if (lang) {
          const [modI18n] = await db
            .select()
            .from(formationModuleI18n)
            .where(and(eq(formationModuleI18n.moduleId, mod.id), eq(formationModuleI18n.language, lang)));
          if (modI18n) {
            localizedMod = { ...mod, title: modI18n.title, description: modI18n.description ?? mod.description };
          }
        }

        const lessons = await db
          .select()
          .from(formationLessons)
          .where(eq(formationLessons.moduleId, mod.id))
          .orderBy(asc(formationLessons.lessonOrder));

        const lessonsWithSections = await Promise.all(
          lessons.map(async (lesson) => {
            allLessonIds.push(lesson.id);
            let localizedLesson = { ...lesson };
            if (lang) {
              const [lessonI18n] = await db
                .select()
                .from(formationLessonI18n)
                .where(and(eq(formationLessonI18n.lessonId, lesson.id), eq(formationLessonI18n.language, lang)));
              if (lessonI18n) {
                localizedLesson = { ...lesson, title: lessonI18n.title, description: lessonI18n.summary ?? lesson.description };
              }
            }

            const sections = await db
              .select()
              .from(lessonSections)
              .where(eq(lessonSections.lessonId, lesson.id))
              .orderBy(asc(lessonSections.sortOrder));

            let localizedSections = sections;
            if (lang) {
              localizedSections = await Promise.all(
                sections.map(async (sec) => {
                  const [secI18n] = await db
                    .select()
                    .from(lessonSectionI18n)
                    .where(and(eq(lessonSectionI18n.sectionId, sec.id), eq(lessonSectionI18n.language, lang)));
                  if (secI18n) {
                    return { ...sec, title: secI18n.heading ?? sec.title, content: secI18n.content };
                  }
                  return sec;
                })
              );
            }

            return { ...localizedLesson, sections: localizedSections };
          })
        );

        return { ...localizedMod, lessons: lessonsWithSections };
      })
    );

    const completedLessonIds: string[] = [];
    if (allLessonIds.length > 0) {
      const userLessonProgress = await db
        .select()
        .from(progressLessons)
        .where(eq(progressLessons.userId, userId));

      for (const p of userLessonProgress) {
        if (p.completedAt && allLessonIds.includes(p.lessonId)) {
          completedLessonIds.push(p.lessonId);
        }
      }
    }

    return res.json({ track, modules: modulesWithLessons, completedLessonIds });
  } catch (err) {
    console.error("Get track detail error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/lessons/:id", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const lang = resolveContentLang(req);

    const [lesson] = await db
      .select()
      .from(formationLessons)
      .where(eq(formationLessons.id, id));

    if (!lesson) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    let localizedLesson = { ...lesson };
    if (lang) {
      const [lessonI18n] = await db
        .select()
        .from(formationLessonI18n)
        .where(and(eq(formationLessonI18n.lessonId, id), eq(formationLessonI18n.language, lang)));
      if (lessonI18n) {
        localizedLesson = { ...lesson, title: lessonI18n.title, description: lessonI18n.summary ?? lesson.description };
      }
    }

    const sections = await db
      .select()
      .from(lessonSections)
      .where(eq(lessonSections.lessonId, id))
      .orderBy(asc(lessonSections.sortOrder));

    let localizedSections = sections;
    if (lang) {
      localizedSections = await Promise.all(
        sections.map(async (sec) => {
          const [secI18n] = await db
            .select()
            .from(lessonSectionI18n)
            .where(and(eq(lessonSectionI18n.sectionId, sec.id), eq(lessonSectionI18n.language, lang)));
          if (secI18n) {
            return { ...sec, title: secI18n.heading ?? sec.title, content: secI18n.content };
          }
          return sec;
        })
      );
    }

    const assessments = await db
      .select()
      .from(formationAssessments)
      .where(eq(formationAssessments.lessonId, id));

    let assessment = null;
    if (assessments.length > 0) {
      const items = await db
        .select()
        .from(assessmentItems)
        .where(eq(assessmentItems.assessmentId, assessments[0].id));

      let localizedItems = items;
      if (lang) {
        localizedItems = await Promise.all(
          items.map(async (item) => {
            const [itemI18n] = await db
              .select()
              .from(assessmentItemI18n)
              .where(and(eq(assessmentItemI18n.itemId, item.id), eq(assessmentItemI18n.language, lang)));
            if (itemI18n) {
              return { ...item, question: itemI18n.question, options: itemI18n.options, explanation: itemI18n.explanation ?? item.explanation };
            }
            return item;
          })
        );
      }

      assessment = { ...assessments[0], items: localizedItems };
    }

    const userId = getAuthUserId(req) || "guest";
    const [progressRow] = await db
      .select()
      .from(progressLessons)
      .where(
        and(
          eq(progressLessons.userId, userId),
          eq(progressLessons.lessonId, id)
        )
      );

    return res.json({ lesson: localizedLesson, sections: localizedSections, assessment, progress: progressRow || null });
  } catch (err) {
    console.error("Get lesson error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/tracks/enroll", async (req: Request, res: Response) => {
  try {
    const userId = getAuthUserId(req) || "guest";
    const { trackId } = req.body;
    if (!trackId) {
      return res.status(400).json({ error: "trackId required" });
    }

    const existing = await db
      .select()
      .from(progressTracks)
      .where(
        and(
          eq(progressTracks.userId, userId),
          eq(progressTracks.trackId, trackId)
        )
      );

    if (existing.length > 0) {
      return res.json(existing[0]);
    }

    const firstModule = await db
      .select()
      .from(formationModules)
      .where(eq(formationModules.trackId, trackId))
      .orderBy(asc(formationModules.moduleOrder))
      .limit(1);

    let currentModuleId = firstModule[0]?.id || null;
    let currentLessonId = null;

    if (currentModuleId) {
      const firstLesson = await db
        .select()
        .from(formationLessons)
        .where(eq(formationLessons.moduleId, currentModuleId))
        .orderBy(asc(formationLessons.lessonOrder))
        .limit(1);
      currentLessonId = firstLesson[0]?.id || null;
    }

    const [row] = await db
      .insert(progressTracks)
      .values({
        userId,
        trackId,
        currentModuleId,
        currentLessonId,
        percentComplete: 0,
      })
      .returning();

    return res.json(row);
  } catch (err) {
    console.error("Enroll track error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/lessons/:id/complete", async (req: Request, res: Response) => {
  try {
    const lessonId = String(req.params.id);
    const userId = getAuthUserId(req) || "guest";
    const { sectionsCompleted, assessmentScore, assessmentPassed } = req.body;

    const existingProgress = await db
      .select()
      .from(progressLessons)
      .where(
        and(
          eq(progressLessons.userId, userId),
          eq(progressLessons.lessonId, lessonId)
        )
      );

    let lessonProgress;
    if (existingProgress.length > 0) {
      [lessonProgress] = await db
        .update(progressLessons)
        .set({
          completedAt: new Date(),
          sectionsCompleted: sectionsCompleted || existingProgress[0].sectionsCompleted,
          assessmentScore: assessmentScore ?? existingProgress[0].assessmentScore,
          assessmentPassed: assessmentPassed ?? existingProgress[0].assessmentPassed,
        })
        .where(eq(progressLessons.id, existingProgress[0].id))
        .returning();
    } else {
      [lessonProgress] = await db
        .insert(progressLessons)
        .values({
          userId,
          lessonId,
          completedAt: new Date(),
          sectionsCompleted: sectionsCompleted || [],
          assessmentScore: assessmentScore ?? null,
          assessmentPassed: assessmentPassed ?? null,
        })
        .returning();
    }

    const [lesson] = await db
      .select()
      .from(formationLessons)
      .where(eq(formationLessons.id, lessonId));

    let moduleCompleted: {
      moduleId: string;
      moduleTitle: string;
      learningObjective: string | null;
      avgAssessmentScore: number | null;
    } | null = null;

    let trackCompleted: {
      trackId: string;
      trackTitle: string;
      totalModules: number;
      totalLessons: number;
    } | null = null;

    if (lesson) {
      const [mod] = await db
        .select()
        .from(formationModules)
        .where(eq(formationModules.id, lesson.moduleId));

      if (mod) {
        const moduleLessons = await db
          .select()
          .from(formationLessons)
          .where(eq(formationLessons.moduleId, mod.id));

        const moduleLessonIds = new Set(moduleLessons.map((l) => l.id));
        const moduleLessonProgress = await db
          .select()
          .from(progressLessons)
          .where(
            and(
              eq(progressLessons.userId, userId),
              sql`${progressLessons.completedAt} IS NOT NULL`
            )
          );

        const completedModuleLessons = moduleLessonProgress.filter(
          (p) => moduleLessonIds.has(p.lessonId)
        );
        const distinctCompletedIds = new Set(completedModuleLessons.map((p) => p.lessonId));

        if (distinctCompletedIds.size >= moduleLessons.length) {
          const scores = completedModuleLessons
            .filter((p) => p.assessmentScore != null)
            .map((p) => p.assessmentScore!);
          const avgScore = scores.length > 0
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            : null;

          moduleCompleted = {
            moduleId: mod.id,
            moduleTitle: mod.title,
            learningObjective: mod.learningObjective,
            avgAssessmentScore: avgScore,
          };
        }

        const allModules = await db
          .select()
          .from(formationModules)
          .where(eq(formationModules.trackId, mod.trackId));

        const allModuleIds = allModules.map((m) => m.id);
        const allLessons = [];
        for (const mId of allModuleIds) {
          const lessons = await db
            .select()
            .from(formationLessons)
            .where(eq(formationLessons.moduleId, mId));
          allLessons.push(...lessons);
        }

        const totalLessons = allLessons.length;
        if (totalLessons > 0) {
          const completedLessons = await db
            .select()
            .from(progressLessons)
            .where(
              and(
                eq(progressLessons.userId, userId),
                sql`${progressLessons.completedAt} IS NOT NULL`
              )
            );

          const completedLessonIds = new Set(completedLessons.map((cl) => cl.lessonId));
          const trackLessonIds = new Set(allLessons.map((l) => l.id));
          const completedInTrack = [...completedLessonIds].filter((id) => trackLessonIds.has(id)).length;

          const percent = Math.round((completedInTrack / totalLessons) * 100);
          const allDone = completedInTrack >= totalLessons;

          await db
            .update(progressTracks)
            .set({
              percentComplete: percent,
              completedAt: allDone ? new Date() : null,
            })
            .where(
              and(
                eq(progressTracks.userId, userId),
                eq(progressTracks.trackId, mod.trackId)
              )
            );

          if (allDone) {
            const [track] = await db
              .select()
              .from(formationTracks)
              .where(eq(formationTracks.id, mod.trackId));
            if (track) {
              trackCompleted = {
                trackId: track.id,
                trackTitle: track.title,
                totalModules: allModules.length,
                totalLessons,
              };
            }
          }
        }
      }
    }

    return res.json({ ...lessonProgress, moduleCompleted, trackCompleted });
  } catch (err) {
    console.error("Complete lesson error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/modules/:id/confidence", async (req: Request, res: Response) => {
  try {
    const moduleId = String(req.params.id);
    const userId = getAuthUserId(req) || "guest";
    const { rating } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "rating (1-5) required" });
    }

    const [mod] = await db
      .select()
      .from(formationModules)
      .where(eq(formationModules.id, moduleId));

    if (!mod) {
      return res.status(404).json({ error: "Module not found" });
    }

    const [trackProgress] = await db
      .select()
      .from(progressTracks)
      .where(
        and(
          eq(progressTracks.userId, userId),
          eq(progressTracks.trackId, mod.trackId)
        )
      );

    if (!trackProgress) {
      return res.status(404).json({ error: "Not enrolled in this track" });
    }

    const existing = (trackProgress.moduleConfidence as Record<string, number>) || {};
    const updated = { ...existing, [moduleId]: rating };

    await db
      .update(progressTracks)
      .set({ moduleConfidence: updated })
      .where(eq(progressTracks.id, trackProgress.id));

    return res.json({ moduleId, rating, stored: true });
  } catch (err) {
    console.error("Module confidence error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/assessments/:id/submit", async (req: Request, res: Response) => {
  try {
    const assessmentId = String(req.params.id);
    const userId = getAuthUserId(req) || "guest";
    const { answers } = req.body;
    if (!answers) {
      return res.status(400).json({ error: "answers required" });
    }

    const [assessment] = await db
      .select()
      .from(formationAssessments)
      .where(eq(formationAssessments.id, assessmentId));

    if (!assessment) {
      return res.status(404).json({ error: "Assessment not found" });
    }

    const items = await db
      .select()
      .from(assessmentItems)
      .where(eq(assessmentItems.assessmentId, assessmentId));

    let correct = 0;
    const results = items.map((item, i) => {
      const userAnswer = answers[i] ?? -1;
      const isCorrect = userAnswer === item.correctIndex;
      if (isCorrect) correct++;
      return {
        question: item.question,
        correct: isCorrect,
        userAnswer,
        correctAnswer: item.correctIndex,
        explanation: item.explanation,
      };
    });

    const score = items.length > 0 ? Math.round((correct / items.length) * 100) : 0;
    const passed = score >= (assessment.passingScore ?? 70);

    const existingProgress = await db
      .select()
      .from(progressLessons)
      .where(
        and(
          eq(progressLessons.userId, userId),
          eq(progressLessons.lessonId, assessment.lessonId)
        )
      );

    if (existingProgress.length > 0) {
      await db
        .update(progressLessons)
        .set({ assessmentScore: score, assessmentPassed: passed })
        .where(eq(progressLessons.id, existingProgress[0].id));
    } else {
      await db.insert(progressLessons).values({
        userId,
        lessonId: assessment.lessonId,
        assessmentScore: score,
        assessmentPassed: passed,
      });
    }

    return res.json({ score, passed, total: items.length, correct, results });
  } catch (err) {
    console.error("Submit assessment error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── CHURCH CONNECT ────────────────────────────────────────────────────────


  export default router;
  