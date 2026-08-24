import {
  DISCOVER_FEATURED_SERIES,
  DISCOVER_WATCH_RAIL,
  PROPHECY_TEACHING_VIDEOS,
} from "../../data/curatedYoutubeVideos";
import {
  BIBLE_PROJECT_VIDEOS,
} from "./bibleProjectVideos";
import { TOUCHPOINTS_DATA } from "./touchpoints";
import {
  collectCuratedYoutubeVideoReferences,
  type CuratedYoutubeVideoReference,
} from "../services/youtubeVideoAvailabilityAudit";

function youtubeUrl(youtubeId: string): string {
  return `https://www.youtube.com/watch?v=${youtubeId}`;
}

function collectTouchpointResourceReferences(): CuratedYoutubeVideoReference[] {
  return TOUCHPOINTS_DATA.flatMap((topic) =>
    (topic.resources ?? []).map((resource) => ({
      surface: "Touchpoint resources",
      topicId: topic.id,
      cardId: `${topic.id}-${resource.videoId}`,
      title: resource.title,
      youtubeId: resource.videoId,
      url: youtubeUrl(resource.videoId),
      sourceFile: "server/data/touchpoints.ts",
    })),
  );
}

function collectDiscoverReferences(): CuratedYoutubeVideoReference[] {
  return [
    {
      surface: "Discover featured series",
      cardId: "great-controversy-featured-series",
      title: DISCOVER_FEATURED_SERIES.title,
      youtubeId: DISCOVER_FEATURED_SERIES.firstYoutubeId,
      url: youtubeUrl(DISCOVER_FEATURED_SERIES.firstYoutubeId),
      sourceFile: "data/curatedYoutubeVideos.ts",
    },
    ...DISCOVER_WATCH_RAIL.map((video) => ({
      surface: "Discover watch rail",
      cardId: video.id,
      title: video.title,
      youtubeId: video.youtubeId,
      url: youtubeUrl(video.youtubeId),
      sourceFile: "data/curatedYoutubeVideos.ts",
    })),
  ];
}

function collectProphecyReferences(): CuratedYoutubeVideoReference[] {
  const explorerVideos = [
    ...PROPHECY_TEACHING_VIDEOS.daniel2,
    ...PROPHECY_TEACHING_VIDEOS.daniel7,
    ...PROPHECY_TEACHING_VIDEOS.daniel89,
    ...PROPHECY_TEACHING_VIDEOS.revelation,
  ];

  return [
    ...explorerVideos.map((video) => ({
      surface: "Prophecy Explorer teacher rail",
      cardId: video.id,
      title: video.title,
      youtubeId: video.id,
      url: youtubeUrl(video.id),
      sourceFile: "data/curatedYoutubeVideos.ts",
    })),
    ...PROPHECY_TEACHING_VIDEOS.greatControversy.map((video) => ({
      surface: "Great Controversy teacher rail",
      cardId: video.id,
      title: video.title,
      youtubeId: video.id,
      url: youtubeUrl(video.id),
      sourceFile: "data/curatedYoutubeVideos.ts",
    })),
  ];
}

export function collectAllCuratedYoutubeVideoReferences(): CuratedYoutubeVideoReference[] {
  return [
    ...collectCuratedYoutubeVideoReferences(BIBLE_PROJECT_VIDEOS),
    ...collectTouchpointResourceReferences(),
    ...collectDiscoverReferences(),
    ...collectProphecyReferences(),
  ];
}