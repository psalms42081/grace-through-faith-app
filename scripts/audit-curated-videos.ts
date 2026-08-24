import { collectAllCuratedYoutubeVideoReferences } from "../server/data/curatedYoutubeVideoRegistry";
import {
  auditCuratedYoutubeVideoAvailability,
  formatUnavailableCuratedVideoReport,
  YoutubeVideoAvailabilityAuditError,
} from "../server/services/youtubeVideoAvailabilityAudit";

async function main(): Promise<void> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error(
      "CURATED VIDEO AUDIT NOT RUN: YOUTUBE_API_KEY is not configured. Add it as a Replit Secret and rerun npm run audit:touchpoint-videos before release.",
    );
    process.exitCode = 2;
    return;
  }

  try {
    const result = await auditCuratedYoutubeVideoAvailability(
      collectAllCuratedYoutubeVideoReferences(),
      apiKey,
    );
    const report = formatUnavailableCuratedVideoReport(result);

    if (result.unavailable.length > 0) {
      console.error(report);
      process.exitCode = 1;
      return;
    }

    console.log(report);
  } catch (error) {
    const message =
      error instanceof YoutubeVideoAvailabilityAuditError
        ? error.message
        : "The curated video availability audit failed unexpectedly.";
    console.error(`CURATED VIDEO AUDIT INCONCLUSIVE: ${message}`);
    process.exitCode = 2;
  }
}

void main();