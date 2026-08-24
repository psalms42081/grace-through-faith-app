export type TutorContextVerification = {
  hasLoadedContext: boolean;
  isFetchedAfterMount: boolean;
  isFetching: boolean;
  isError: boolean;
};

export type TutorQuestionGate = TutorContextVerification & {
  isAuthenticated: boolean;
  lessonId: string;
  dayId: string;
  isRequestPending: boolean;
};

export function isFreshTutorContextVerified({
  hasLoadedContext,
  isFetchedAfterMount,
  isFetching,
  isError,
}: TutorContextVerification): boolean {
  return hasLoadedContext && isFetchedAfterMount && !isFetching && !isError;
}

export function canAskStudyTutor(state: TutorQuestionGate): boolean {
  return (
    state.isAuthenticated &&
    isFreshTutorContextVerified(state) &&
    !!state.lessonId &&
    !!state.dayId &&
    !state.isRequestPending
  );
}

type DayReaderRouteParams = {
  lessonNumber?: string | number;
  dayNumber?: string | number;
  quarterCode?: string;
};

type TutorRouteParams = DayReaderRouteParams & {
  lessonId: string;
  dayId: string;
};

export function buildSabbathSchoolDayRoute({
  lessonNumber,
  dayNumber,
  quarterCode,
}: DayReaderRouteParams): string | null {
  if (lessonNumber === undefined || dayNumber === undefined) return null;

  const query = new URLSearchParams({
    lessonNumber: String(lessonNumber),
    dayNumber: String(dayNumber),
  });
  if (quarterCode) query.set("quarterCode", quarterCode);
  return `/(tabs)/ss/sabbath-school-day?${query.toString()}`;
}

export function buildStudyTutorRoute({
  lessonId,
  dayId,
  lessonNumber,
  dayNumber,
  quarterCode,
}: TutorRouteParams): string {
  const query = new URLSearchParams({ lessonId, dayId });
  if (lessonNumber !== undefined) query.set("lessonNumber", String(lessonNumber));
  if (dayNumber !== undefined) query.set("dayNumber", String(dayNumber));
  if (quarterCode) query.set("quarterCode", quarterCode);
  return `/(tabs)/ss/sabbath-school-day-tutor?${query.toString()}`;
}