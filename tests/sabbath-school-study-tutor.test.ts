import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  buildSabbathSchoolDayRoute,
  buildStudyTutorRoute,
  canAskStudyTutor,
  isFreshTutorContextVerified,
} from "../lib/sabbath-school-tutor";

describe("Sabbath School Study Tutor client guard", () => {
  it("does not trust persisted context until verification finishes after mount", () => {
    const persistedContext = {
      hasLoadedContext: true,
      isFetchedAfterMount: false,
      isFetching: true,
      isError: false,
    };

    assert.equal(isFreshTutorContextVerified(persistedContext), false);
    assert.equal(
      canAskStudyTutor({
        ...persistedContext,
        isAuthenticated: true,
        lessonId: "lesson-4",
        dayId: "day-1",
        isRequestPending: false,
      }),
      false,
    );
  });

  it("enables questions only after a fresh successful member verification", () => {
    const freshContext = {
      hasLoadedContext: true,
      isFetchedAfterMount: true,
      isFetching: false,
      isError: false,
    };

    assert.equal(
      canAskStudyTutor({
        ...freshContext,
        isAuthenticated: true,
        lessonId: "lesson-4",
        dayId: "day-1",
        isRequestPending: false,
      }),
      true,
    );
    assert.equal(
      canAskStudyTutor({
        ...freshContext,
        isAuthenticated: false,
        lessonId: "lesson-4",
        dayId: "day-1",
        isRequestPending: false,
      }),
      false,
    );
  });

  for (const platform of ["mobile", "web"]) {
    it(`preserves the ${platform} reader route while opening and closing the tutor`, () => {
      const readerRoute = buildSabbathSchoolDayRoute({
        lessonNumber: 4,
        dayNumber: 1,
        quarterCode: "2026-03",
      });
      const tutorRoute = buildStudyTutorRoute({
        lessonId: "lesson id/4",
        dayId: "day id/1",
        lessonNumber: 4,
        dayNumber: 1,
        quarterCode: "2026-03",
      });

      assert.equal(
        readerRoute,
        "/sabbath-school-day?lessonNumber=4&dayNumber=1&quarterCode=2026-03",
      );
      assert.equal(
        tutorRoute,
        "/ss/sabbath-school-day-tutor?lessonId=lesson+id%2F4&dayId=day+id%2F1&lessonNumber=4&dayNumber=1&quarterCode=2026-03",
      );
    });
  }

  it("keeps reader and audio controls on the return screen contract", () => {
    const readerSource = readFileSync("app/(tabs)/sabbath-school-day.tsx", "utf8");
    const tutorSource = readFileSync("app/sabbath-school-day-tutor.tsx", "utf8");

    assert.match(readerSource, /testID="ss-day-reader"/);
    assert.match(readerSource, /testID="ss-day-audio"/);
    assert.match(readerSource, /router\.push\(\s*buildStudyTutorRoute/);
    assert.match(tutorSource, /safeGoBack\(router, readerFallback\)/);
  });
});