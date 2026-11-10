import { eq, inArray, sql } from "drizzle-orm";
import { db, pool } from "../db";
import {
  bibleSmallGroupMembers,
  bibleSmallGroupPosts,
  bibleSmallGroups,
  bibleSmallGroupLiveSessions,
  deviceTokens,
  groupAnnouncements,
  groupDiscussionReplies,
  groupDiscussions,
  hierarchyBroadcastReceipt,
  hierarchyMembership,
  heygenVideos,
  layerCompletions,
  leaderRequests,
  liveSessions,
  memberPastoralOptin,
  organizationMembers,
  prayerGroupMembers,
  prayerRequests,
  progressLessons,
  progressTracks,
  pushSubscriptions,
  readingHistory,
  readingStreaks,
  resourceBookmarks,
  resourceProgress,
  sabbathReflections,
  sabbathSchoolDayAnswers,
  sabbathSchoolUserProgress,
  searchCache,
  studyGuideSessions,
  studyJournalEntries,
  topicEngagement,
  userActivityCounters,
  userBookmarks,
  userFeedback,
  userHighlights,
  userLocation,
  userNotes,
  userPlanEnrollments,
  userPlanProgress,
  userPlans,
  users,
} from "../../shared/schema";

async function deleteWhere(
  run: () => Promise<unknown>,
): Promise<void> {
  try {
    await run();
  } catch {
    // Older databases may not have every table.
  }
}

/** Removes a member and the rows that would otherwise block DELETE FROM users. */
export async function deleteUserAccount(userId: string): Promise<void> {
  const enrollments = await db
    .select({ id: userPlanEnrollments.id })
    .from(userPlanEnrollments)
    .where(eq(userPlanEnrollments.userId, userId));
  if (enrollments.length > 0) {
    await db
      .delete(userPlanProgress)
      .where(
        inArray(
          userPlanProgress.enrollmentId,
          enrollments.map((row) => row.id),
        ),
      );
  }

  const owned = [
    { table: userNotes, col: userNotes.userId },
    { table: userHighlights, col: userHighlights.userId },
    { table: userBookmarks, col: userBookmarks.userId },
    { table: userActivityCounters, col: userActivityCounters.userId },
    { table: readingHistory, col: readingHistory.userId },
    { table: readingStreaks, col: readingStreaks.userId },
    { table: layerCompletions, col: layerCompletions.userId },
    { table: studyJournalEntries, col: studyJournalEntries.userId },
    { table: studyGuideSessions, col: studyGuideSessions.userId },
    { table: prayerRequests, col: prayerRequests.userId },
    { table: prayerGroupMembers, col: prayerGroupMembers.userId },
    { table: sabbathSchoolUserProgress, col: sabbathSchoolUserProgress.userId },
    { table: sabbathSchoolDayAnswers, col: sabbathSchoolDayAnswers.userId },
    { table: sabbathReflections, col: sabbathReflections.userId },
    { table: progressTracks, col: progressTracks.userId },
    { table: progressLessons, col: progressLessons.userId },
    { table: userPlanEnrollments, col: userPlanEnrollments.userId },
    { table: userPlans, col: userPlans.userId },
    { table: deviceTokens, col: deviceTokens.userId },
    { table: pushSubscriptions, col: pushSubscriptions.userId },
    { table: organizationMembers, col: organizationMembers.userId },
    { table: bibleSmallGroupPosts, col: bibleSmallGroupPosts.userId },
    { table: bibleSmallGroupMembers, col: bibleSmallGroupMembers.userId },
    { table: bibleSmallGroupLiveSessions, col: bibleSmallGroupLiveSessions.startedBy },
    { table: resourceProgress, col: resourceProgress.userId },
    { table: resourceBookmarks, col: resourceBookmarks.userId },
    { table: userFeedback, col: userFeedback.userId },
    { table: leaderRequests, col: leaderRequests.userId },
    { table: hierarchyMembership, col: hierarchyMembership.userId },
    { table: topicEngagement, col: topicEngagement.userId },
    { table: memberPastoralOptin, col: memberPastoralOptin.userId },
    { table: userLocation, col: userLocation.userId },
    { table: searchCache, col: searchCache.userId },
    { table: heygenVideos, col: heygenVideos.userId },
  ] as const;

  for (const { table, col } of owned) {
    await deleteWhere(() => db.delete(table).where(eq(col, userId)));
  }

  await deleteWhere(() =>
    db.delete(groupDiscussionReplies).where(eq(groupDiscussionReplies.userId, userId)),
  );
  await deleteWhere(() =>
    db.delete(groupDiscussionReplies).where(
      sql`${groupDiscussionReplies.discussionId} IN (SELECT id FROM group_discussion WHERE user_id = ${userId})`,
    ),
  );
  await deleteWhere(() =>
    db.delete(groupDiscussions).where(eq(groupDiscussions.userId, userId)),
  );
  await deleteWhere(() =>
    db.delete(groupAnnouncements).where(eq(groupAnnouncements.userId, userId)),
  );
  await deleteWhere(() =>
    pool.query(
      `UPDATE group_discussion
          SET reply_count = (
            SELECT count(*)::int FROM group_discussion_reply
             WHERE discussion_id = group_discussion.id
          )`,
    ),
  );

  await deleteWhere(() =>
    db.delete(bibleSmallGroups).where(eq(bibleSmallGroups.hostUserId, userId)),
  );
  await deleteWhere(() =>
    db.delete(liveSessions).where(eq(liveSessions.hostUserId, userId)),
  );
  await deleteWhere(() =>
    db
      .delete(hierarchyBroadcastReceipt)
      .where(eq(hierarchyBroadcastReceipt.recipientUserId, userId)),
  );

  await db.delete(users).where(eq(users.id, userId));
}
