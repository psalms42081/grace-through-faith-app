import { useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

const RESUME_CACHE_KEY = "@grace-through-faith/resume-item";

export type ResumeType =
  | "guided_study"
  | "devotional"
  | "study_path"
  | "great_controversy"
  | "prophecy"
  | "belief"
  | "reading"
  | "sabbath_school";

export interface ResumeItem {
  type: ResumeType;
  id: string;
  title: string;
  subtitle: string;
  progressLabel: string;
  route: string;
  params?: Record<string, string>;
  updatedAt: string;
  icon: string;
  gradientColors: [string, string];
  typeBadge: string;
}

const TYPE_META: Record<ResumeType, { icon: string; gradientColors: [string, string]; typeBadge: string }> = {
  guided_study: { icon: "flask", gradientColors: ["#7C3AED", "#5B21B6"], typeBadge: "Study Guide" },
  devotional: { icon: "sunny", gradientColors: ["#E8A838", "#C98A20"], typeBadge: "Devotional" },
  study_path: { icon: "compass", gradientColors: ["#4ECCA3", "#2EAD84"], typeBadge: "Study Path" },
  great_controversy: { icon: "git-merge", gradientColors: ["#8B5CF6", "#6D28D9"], typeBadge: "Timeline" },
  prophecy: { icon: "telescope", gradientColors: ["#C9933A", "#A67B2E"], typeBadge: "Prophecy" },
  belief: { icon: "shield-checkmark", gradientColors: ["#2E7D32", "#1B5E20"], typeBadge: "Belief Study" },
  reading: { icon: "book", gradientColors: ["#C9933A", "#A67B2E"], typeBadge: "Bible Reading" },
  sabbath_school: { icon: "school", gradientColors: ["#5B8DEF", "#3A6DD0"], typeBadge: "Sabbath School" },
};

interface StudySession {
  id: string;
  bookId: number;
  chapter: number;
  verse: number | null;
  completed: boolean;
  progression: any;
  createdAt: string;
  updatedAt: string;
}

interface TrackProgress {
  trackId: string;
  percentComplete: number;
  currentModuleId: string | null;
  track?: {
    id: string;
    title: string;
    totalModules?: number;
  };
  updatedAt?: string;
}

function getStageLabel(progression: any): string {
  if (!progression) return "Observe";
  if (progression.apply?.completed) return "Complete";
  if (progression.interpret?.completed) return "Apply";
  if (progression.observe?.completed) return "Interpret";
  return "Observe";
}

export function useResumeJourney(): { item: ResumeItem | null; loading: boolean; refresh: () => void } {
  const { userId } = useAuth();
  const [localProgress, setLocalProgress] = useState<{
    gcProgress: { viewedNodes: string[]; lastPhase: string } | null;
    prophecyViewed: string[] | null;
    beliefsViewed: string[] | null;
  }>({ gcProgress: null, prophecyViewed: null, beliefsViewed: null });
  const [localLoaded, setLocalLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem("gc_timeline_progress"),
      AsyncStorage.getItem("prophecy_viewed"),
      AsyncStorage.getItem("beliefs_viewed"),
    ]).then(([gc, proph, beliefs]) => {
      setLocalProgress({
        gcProgress: gc ? JSON.parse(gc) : null,
        prophecyViewed: proph ? JSON.parse(proph) : null,
        beliefsViewed: beliefs ? JSON.parse(beliefs) : null,
      });
      setLocalLoaded(true);
    }).catch(() => setLocalLoaded(true));
  }, []);

  const { data: sessions, refetch: refetchSessions } = useQuery<StudySession[]>({
    queryKey: [`/api/study-guide/sessions?userId=${userId}`],
    staleTime: 30_000,
  });

  const { data: todayData, refetch: refetchToday } = useQuery<{
    today: { id: string; title: string; dayNumber: number; planId: string } | null;
    enrollment: { id: string; planId: string; plan?: { title: string; totalDays: number } } | null;
    completedCount: number;
    totalDays: number;
  }>({
    queryKey: [`/api/devotionals/today?userId=${userId}`],
    staleTime: 30_000,
  });

  const { data: trackProgress, refetch: refetchTracks } = useQuery<TrackProgress[]>({
    queryKey: [`/api/tracks/progress?userId=${userId}`],
    staleTime: 30_000,
  });

  const { data: recentReads, refetch: refetchReads } = useQuery<{ id: string; bookId: number; bookName: string; chapter: number; translation: string }[]>({
    queryKey: [`/api/reading-history/recent?userId=${userId}`],
    staleTime: 30_000,
  });

  const { data: ssData, refetch: refetchSS } = useQuery<{
    currentLesson: { title: string; lessonNumber: number } | null;
    completedDays: number;
  }>({
    queryKey: [`/api/sabbath-school/current?userId=${userId}`],
    staleTime: 30_000,
  });

  const refresh = useCallback(() => {
    refetchSessions();
    refetchToday();
    refetchTracks();
    refetchReads();
    refetchSS();
  }, [refetchSessions, refetchToday, refetchTracks, refetchReads, refetchSS]);

  const loading = !localLoaded;

  const candidates: ResumeItem[] = [];

  const activeSession = sessions?.find((s) => !s.completed);
  if (activeSession) {
    const stage = getStageLabel(activeSession.progression);
    candidates.push({
      ...TYPE_META.guided_study,
      type: "guided_study",
      id: activeSession.id,
      title: `Study Guide`,
      subtitle: `Stage: ${stage}`,
      progressLabel: `Continue Study`,
      route: "/study-guide",
      params: {
        bookId: String(activeSession.bookId),
        chapter: String(activeSession.chapter),
        ...(activeSession.verse ? { verse: String(activeSession.verse) } : {}),
      },
      updatedAt: activeSession.updatedAt || activeSession.createdAt,
    });
  }

  if (todayData?.today && todayData.enrollment) {
    const planTitle = todayData.enrollment.plan?.title || "Devotional Plan";
    candidates.push({
      ...TYPE_META.devotional,
      type: "devotional",
      id: todayData.enrollment.planId,
      title: planTitle,
      subtitle: `Day ${todayData.today.dayNumber} of ${todayData.totalDays}`,
      progressLabel: "Continue",
      route: "/devotional-day",
      params: { planId: todayData.enrollment.planId },
      updatedAt: new Date().toISOString(),
    });
  }

  if (trackProgress) {
    const activeTracks = trackProgress.filter((t) => t.percentComplete > 0 && t.percentComplete < 100);
    if (activeTracks.length > 0) {
      const best = activeTracks.sort((a, b) => {
        const aDate = a.updatedAt || "";
        const bDate = b.updatedAt || "";
        return bDate.localeCompare(aDate);
      })[0];
      const trackTitle = best.track?.title || "Study Path";
      const totalModules = best.track?.totalModules || 0;
      const completedModules = Math.round((best.percentComplete / 100) * totalModules);
      candidates.push({
        ...TYPE_META.study_path,
        type: "study_path",
        id: best.trackId,
        title: trackTitle,
        subtitle: totalModules > 0
          ? `Module ${completedModules + 1} of ${totalModules}`
          : `${Math.round(best.percentComplete)}% complete`,
        progressLabel: "Continue",
        route: `/study-path/${best.trackId}`,
        updatedAt: best.updatedAt || new Date().toISOString(),
      });
    }
  }

  if (localProgress.gcProgress?.viewedNodes?.length) {
    const viewedCount = localProgress.gcProgress.viewedNodes.length;
    const lastPhase = localProgress.gcProgress.lastPhase || "creation";
    candidates.push({
      ...TYPE_META.great_controversy,
      type: "great_controversy",
      id: "gc-timeline",
      title: "Great Controversy Timeline",
      subtitle: `${viewedCount} of 15 nodes explored`,
      progressLabel: "Continue Timeline",
      route: "/great-controversy",
      updatedAt: new Date().toISOString(),
    });
  }

  if (localProgress.prophecyViewed?.length) {
    const viewedCount = localProgress.prophecyViewed.length;
    candidates.push({
      ...TYPE_META.prophecy,
      type: "prophecy",
      id: "prophecy-explorer",
      title: "Prophecy Explorer",
      subtitle: `${viewedCount} symbols explored`,
      progressLabel: "Continue",
      route: "/prophecy-explorer",
      updatedAt: new Date().toISOString(),
    });
  }

  if (localProgress.beliefsViewed?.length) {
    const viewedCount = localProgress.beliefsViewed.length;
    candidates.push({
      ...TYPE_META.belief,
      type: "belief",
      id: "beliefs",
      title: "Fundamental Beliefs",
      subtitle: `${viewedCount} of 28 explored`,
      progressLabel: "Continue",
      route: "/sda-studies",
      updatedAt: new Date().toISOString(),
    });
  }

  if (recentReads?.length) {
    const last = recentReads[0];
    candidates.push({
      ...TYPE_META.reading,
      type: "reading",
      id: `read-${last.bookId}-${last.chapter}`,
      title: `${last.bookName} ${last.chapter}`,
      subtitle: "Pick up where you left off",
      progressLabel: "Continue Reading",
      route: `/read/${last.bookId}/${last.chapter}`,
      params: { translation: last.translation || "KJV" },
      updatedAt: new Date().toISOString(),
    });
  }

  if (ssData?.currentLesson) {
    const completedDays = ssData.completedDays || 0;
    const ssSubtitle = completedDays === 0
      ? "Start Lesson"
      : completedDays >= 7
        ? "Completed"
        : `Day ${completedDays + 1} of 7`;
    candidates.push({
      ...TYPE_META.sabbath_school,
      type: "sabbath_school",
      id: `ss-${ssData.currentLesson.lessonNumber}`,
      title: `Lesson ${ssData.currentLesson.lessonNumber} · ${ssData.currentLesson.title}`,
      subtitle: ssSubtitle,
      progressLabel: "Continue",
      route: "/sabbath-school",
      updatedAt: new Date().toISOString(),
    });
  }

  const PRIORITY_ORDER: ResumeType[] = [
    "guided_study",
    "devotional",
    "study_path",
    "great_controversy",
    "prophecy",
    "belief",
    "reading",
    "sabbath_school",
  ];

  candidates.sort((a, b) => {
    const ai = PRIORITY_ORDER.indexOf(a.type);
    const bi = PRIORITY_ORDER.indexOf(b.type);
    return ai - bi;
  });

  const item = candidates[0] || null;

  useEffect(() => {
    if (item) {
      AsyncStorage.setItem(RESUME_CACHE_KEY, JSON.stringify(item)).catch(() => {});
    }
  }, [item?.id, item?.type]);

  return { item, loading, refresh };
}
