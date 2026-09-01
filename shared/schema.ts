import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  jsonb,
  timestamp,
  check,
  index,
  uniqueIndex,
  uuid,
  doublePrecision,
  real,
  smallint,
  serial,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── USERS ───────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  email: text("email").unique(),
  familyId: varchar("family_id"),
  role: varchar("role", { length: 24 }).default("member").notNull(),
  profileType: varchar("profile_type", { length: 24 }),
  isPro: boolean("is_pro").default(false).notNull(),
  isPatron: boolean("is_patron").default(false),
  donationAmount: integer("donation_amount").default(0),
  lastMissionInvite: timestamp("last_mission_invite"),
  preferredLanguage: varchar("preferred_language", { length: 10 }).default("en"),
  preferredBibleTranslation: varchar("preferred_bible_translation", { length: 10 }),
  preferredNarrator: varchar("preferred_narrator", { length: 10 }).default("george"),
  preferredCurriculum: varchar("preferred_curriculum", { length: 16 }).default("adult"),
  organizationId: varchar("organization_id"),
  organizationType: varchar("organization_type", { length: 12 }),
  hierarchyNodeId: varchar("hierarchy_node_id"),
  ageGroup: varchar("age_group", { length: 16 }),
  /** Claimed Adventist directory church (`sda_church.id`). Profile "My Church". */
  sdaChurchId: varchar("sda_church_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── ORGANIZATIONS ──────────────────────────────────────────────────────────

export const organizations = pgTable("organizations", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: varchar("type", { length: 12 }).notNull(),
  parentId: varchar("parent_id"),
  joinCode: varchar("join_code", { length: 8 }).unique().notNull(),
  ownerId: varchar("owner_id").notNull(),
  memberCount: integer("member_count").default(0).notNull(),
  tier: varchar("tier", { length: 6 }).default("free").notNull(),
  maxMembers: integer("max_members").default(50).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const organizationMembers = pgTable("organization_members", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 12 }).notNull().default("member"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
}, (table) => ({
  orgUserUnique: uniqueIndex("org_member_org_user").on(table.organizationId, table.userId),
}));

export const userActivityCounters = pgTable("user_activity_counter", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  featureType: varchar("feature_type", { length: 50 }).notNull(),
  useCount: integer("use_count").default(0),
  lastUsedAt: timestamp("last_used_at").defaultNow(),
}, (table) => ({
  userFeatureUnique: uniqueIndex("activity_user_feature").on(table.userId, table.featureType),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ─── FAMILIES ─────────────────────────────────────────────────────────────────

export const families = pgTable("families", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  inviteCode: varchar("invite_code", { length: 10 }).notNull().unique(),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Family = typeof families.$inferSelect;

// ─── PRAYER GROUPS ────────────────────────────────────────────────────────────

export const prayerGroups = pgTable("prayer_groups", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  joinCode: varchar("join_code", { length: 10 }).notNull().unique(),
  createdBy: varchar("created_by").notNull(),
  memberCount: integer("member_count").default(1).notNull(),
  groupType: varchar("group_type", { length: 30 }).default("prayer").notNull(),
  isPublic: boolean("is_public").default(false).notNull(),
  churchId: varchar("church_id"),
  assignedTrackId: varchar("assigned_track_id"),
  groupPlanId: varchar("group_plan_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PrayerGroup = typeof prayerGroups.$inferSelect;

export const prayerGroupMembers = pgTable(
  "prayer_group_member",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    groupId: varchar("group_id")
      .notNull()
      .references(() => prayerGroups.id, { onDelete: "cascade" }),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    displayName: text("display_name"),
    role: varchar("role", { length: 20 }).default("member").notNull(),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (table) => ({
    groupUserUnique: uniqueIndex("group_member_unique").on(table.groupId, table.userId),
    groupIdx: index("group_member_group_idx").on(table.groupId),
  })
);

export type PrayerGroupMember = typeof prayerGroupMembers.$inferSelect;

// ─── GROUP DISCUSSIONS ───────────────────────────────────────────────────────

export const groupDiscussions = pgTable(
  "group_discussion",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    groupId: varchar("group_id").notNull(),
    userId: varchar("user_id").notNull(),
    authorName: text("author_name"),
    content: text("content").notNull(),
    isPinned: boolean("is_pinned").default(false).notNull(),
    replyCount: integer("reply_count").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    groupIdx: index("discussion_group_idx").on(table.groupId),
    createdIdx: index("discussion_created_idx").on(table.createdAt),
  })
);

export type GroupDiscussion = typeof groupDiscussions.$inferSelect;

export const groupDiscussionReplies = pgTable(
  "group_discussion_reply",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    discussionId: varchar("discussion_id").notNull(),
    userId: varchar("user_id").notNull(),
    authorName: text("author_name"),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    discussionIdx: index("reply_discussion_idx").on(table.discussionId),
  })
);

export type GroupDiscussionReply = typeof groupDiscussionReplies.$inferSelect;

// ─── GROUP ANNOUNCEMENTS ─────────────────────────────────────────────────────

export const groupAnnouncements = pgTable(
  "group_announcement",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    groupId: varchar("group_id").notNull(),
    userId: varchar("user_id").notNull(),
    authorName: text("author_name"),
    title: text("title").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    groupIdx: index("announcement_group_idx").on(table.groupId),
  })
);

export type GroupAnnouncement = typeof groupAnnouncements.$inferSelect;

// ─── HEYGEN VIDEOS ──────────────────────────────────────────────────────────

export const heygenVideos = pgTable(
  "heygen_video",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    videoId: varchar("video_id").notNull().unique(),
    title: text("title"),
    avatarId: varchar("avatar_id"),
    script: text("script"),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    videoUrl: text("video_url"),
    userId: varchar("user_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    videoIdIdx: index("heygen_video_id_idx").on(table.videoId),
    userIdx: index("heygen_video_user_idx").on(table.userId),
  })
);

export type HeygenVideo = typeof heygenVideos.$inferSelect;

// ─── BIBLE ────────────────────────────────────────────────────────────────────

export const bibleTranslations = pgTable("bible_translation", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  abbreviation: varchar("abbreviation", { length: 10 }).notNull(),
  language: varchar("language", { length: 10 }).default("en").notNull(),
});

export const bibleBooks = pgTable("bible_book", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  abbreviation: varchar("abbreviation", { length: 10 }).notNull(),
  testament: varchar("testament", { length: 3 }).notNull(),
  chapterCount: integer("chapter_count").notNull(),
  orderIndex: integer("order_index").notNull(),
});

export const bibleVerses = pgTable(
  "bible_verse",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    translationId: varchar("translation_id")
      .notNull()
      .references(() => bibleTranslations.id),
    bookId: integer("book_id")
      .notNull()
      .references(() => bibleBooks.id),
    chapter: integer("chapter").notNull(),
    verse: integer("verse").notNull(),
    text: text("text").notNull(),
    searchVector: text("search_vector"),
  },
  (table) => ({
    bookChapterIdx: index("bible_verse_book_chapter_idx").on(
      table.bookId,
      table.chapter
    ),
    translationIdx: index("bible_verse_translation_idx").on(
      table.translationId
    ),
    bookChapterVerseUnique: uniqueIndex("bible_verse_unique").on(
      table.translationId,
      table.bookId,
      table.chapter,
      table.verse
    ),
  })
);

export type BibleVerse = typeof bibleVerses.$inferSelect;

export const bibleCache = pgTable(
  "bible_cache",
  {
    id: serial("id").primaryKey(),
    translation: varchar("translation", { length: 10 }).notNull(),
    bookId: integer("book_id")
      .notNull()
      .references(() => bibleBooks.id),
    bookName: varchar("book_name", { length: 50 }).notNull(),
    chapter: integer("chapter").notNull(),
    versesJson: jsonb("verses_json").notNull(),
    verseCount: integer("verse_count").notNull().default(0),
    fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
    sourceApi: varchar("source_api", { length: 20 }).notNull(),
  },
  (table) => ({
    cacheUnique: uniqueIndex("bible_cache_unique").on(
      table.translation,
      table.bookId,
      table.chapter
    ),
    translationIdx: index("bible_cache_translation_idx").on(table.translation),
  })
);

export const bibleCacheStats = pgTable(
  "bible_cache_stats",
  {
    id: serial("id").primaryKey(),
    translation: varchar("translation", { length: 10 }).notNull(),
    cacheHits: integer("cache_hits").notNull().default(0),
    cacheMisses: integer("cache_misses").notNull().default(0),
    lastHitAt: timestamp("last_hit_at"),
    lastMissAt: timestamp("last_miss_at"),
  },
  (table) => ({
    translationUnique: uniqueIndex("bible_cache_stats_translation_unique").on(table.translation),
  })
);

// ─── WORD STUDY (STRONG'S) ────────────────────────────────────────────────────

export const strongEntries = pgTable("strong_entry", {
  id: varchar("id").primaryKey(),
  language: varchar("language", { length: 2 }).notNull(),
  lemma: text("lemma").notNull(),
  transliteration: text("transliteration"),
  pronunciation: text("pronunciation"),
  definition: text("definition").notNull(),
  extendedDefinition: text("extended_definition"),
  kjvUsage: text("kjv_usage"),
  derivation: text("derivation"),
});

export const verseStrongMaps = pgTable(
  "verse_strong_map",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    verseId: varchar("verse_id")
      .notNull()
      .references(() => bibleVerses.id),
    strongId: varchar("strong_id")
      .notNull()
      .references(() => strongEntries.id),
    wordPosition: integer("word_position").notNull(),
    originalWord: text("original_word").notNull(),
    translatedWord: text("translated_word"),
  },
  (table) => ({
    verseIdx: index("verse_strong_verse_idx").on(table.verseId),
  })
);

export type StrongEntry = typeof strongEntries.$inferSelect;

// ─── CONTEXT CARDS ────────────────────────────────────────────────────────────

export const contextCards = pgTable("context_card", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  bookId: integer("book_id").references(() => bibleBooks.id),
  chapter: integer("chapter"),
  title: text("title").notNull(),
  content: text("content").notNull(),
  historicalBackground: text("historical_background"),
  culturalNotes: text("cultural_notes"),
  authorInfo: text("author_info"),
  dateWritten: text("date_written"),
  audience: text("audience"),
  themes: jsonb("themes").$type<string[]>(),
});

export type ContextCard = typeof contextCards.$inferSelect;

// ─── COMMENTARY ───────────────────────────────────────────────────────────────

export const commentators = pgTable("commentator", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  dates: text("dates"),
  bio: text("bio"),
  tradition: text("tradition"),
});

export const commentaryEntries = pgTable(
  "commentary_entry",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    commentatorId: varchar("commentator_id")
      .notNull()
      .references(() => commentators.id),
    bookId: integer("book_id")
      .notNull()
      .references(() => bibleBooks.id),
    chapter: integer("chapter").notNull(),
    verseStart: integer("verse_start"),
    verseEnd: integer("verse_end"),
    content: text("content").notNull(),
    title: text("title"),
  },
  (table) => ({
    bookChapterIdx: index("commentary_book_chapter_idx").on(
      table.bookId,
      table.chapter
    ),
  })
);

export type CommentaryEntry = typeof commentaryEntries.$inferSelect;

// ─── APPLICATION LAYER ────────────────────────────────────────────────────────

export const applicationTemplates = pgTable("application_template", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  bookId: integer("book_id").references(() => bibleBooks.id),
  chapter: integer("chapter"),
  thenContext: text("then_context").notNull(),
  nowApplication: text("now_application").notNull(),
  reflectionQuestions: jsonb("reflection_questions").$type<string[]>().notNull(),
  prayerPrompt: text("prayer_prompt"),
  keyTheme: text("key_theme"),
});

export type ApplicationTemplate = typeof applicationTemplates.$inferSelect;

// ─── MAPS & GEOGRAPHY ─────────────────────────────────────────────────────────

export const locations = pgTable("location", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  modernName: text("modern_name"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  description: text("description"),
  imageUrl: text("image_url"),
  locationType: varchar("location_type", { length: 50 }),
  era: text("era"),
});

export const locationVerseMaps = pgTable(
  "location_verse_map",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    locationId: varchar("location_id")
      .notNull()
      .references(() => locations.id),
    verseId: varchar("verse_id")
      .notNull()
      .references(() => bibleVerses.id),
    note: text("note"),
  },
  (table) => ({
    locationIdx: index("location_verse_location_idx").on(table.locationId),
    verseIdx: index("location_verse_verse_idx").on(table.verseId),
  })
);

export type Location = typeof locations.$inferSelect;

// ─── TIMELINE ─────────────────────────────────────────────────────────────────

export const timelineEvents = pgTable("timeline_event", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  yearApprox: integer("year_approx"),
  yearLabel: text("year_label"),
  period: text("period"),
  category: varchar("category", { length: 50 }),
  locationId: varchar("location_id").references(() => locations.id),
});

export const eventVerseMaps = pgTable(
  "event_verse_map",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    eventId: varchar("event_id")
      .notNull()
      .references(() => timelineEvents.id),
    verseId: varchar("verse_id")
      .notNull()
      .references(() => bibleVerses.id),
  },
  (table) => ({
    eventIdx: index("event_verse_event_idx").on(table.eventId),
  })
);

export type TimelineEvent = typeof timelineEvents.$inferSelect;

// ─── ILLUSTRATIONS ─────────────────────────────────────────────────────────────

export const illustrations = pgTable("illustration", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  credit: text("credit"),
  era: text("era"),
});

export const illustrationLinks = pgTable("illustration_link", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  illustrationId: varchar("illustration_id")
    .notNull()
    .references(() => illustrations.id),
  verseId: varchar("verse_id").references(() => bibleVerses.id),
  bookId: integer("book_id").references(() => bibleBooks.id),
  chapter: integer("chapter"),
});

// ─── DEVOTIONALS ──────────────────────────────────────────────────────────────

export const devotionalPlans = pgTable(
  "devotional_plan",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    title: text("title").notNull(),
    description: text("description"),
    totalDays: integer("total_days").notNull(),
    theme: text("theme"),
    targetGoals: jsonb("target_goals").$type<string[]>(),
    difficultyLevel: varchar("difficulty_level", { length: 20 }),
    estimatedMinutesPerDay: integer("estimated_minutes_per_day"),
    category: varchar("category", { length: 20 }).default("thematic"),
    traditionKey: varchar("tradition_key", { length: 30 }).default("core").notNull(),
    isPublished: boolean("is_published").default(false),
    isAiGenerated: boolean("is_ai_generated").default(false),
    generatedForUserId: varchar("generated_for_user_id"),
    // Catalog eligibility is deliberately explicit. Legacy records stay readable
    // through an enrollment, but require editorial review before being offered.
    provenance: varchar("provenance", { length: 30 }).default("legacy_unclassified").notNull(),
    curatedBy: varchar("curated_by", { length: 120 }),
    curatedAt: timestamp("curated_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    catalogAuthorshipCheck: check(
      "devotional_plan_catalog_authorship_check",
      sql`${table.isPublished} IS NOT TRUE
        OR (
          ${table.createdAt} < TIMESTAMP '2026-04-01 00:00:00'
          AND ${table.provenance} = 'legacy_unclassified'
          AND ${table.isAiGenerated} IS NOT TRUE
        )
        OR (
          ${table.provenance} = 'human_curated'
          AND ${table.isAiGenerated} IS NOT TRUE
          AND ${table.curatedBy} IS NOT NULL
          AND ${table.curatedAt} IS NOT NULL
        )`,
    ),
  }),
);

export const devotionalDays = pgTable("devotional_day", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  planId: varchar("plan_id")
    .notNull()
    .references(() => devotionalPlans.id),
  dayNumber: integer("day_number").notNull(),
  title: text("title").notNull(),
  bookId: integer("book_id").references(() => bibleBooks.id),
  chapter: integer("chapter"),
  verseStart: integer("verse_start"),
  verseEnd: integer("verse_end"),
  passageLabel: text("passage_label"),
  contextNote: text("context_note"),
  keyTermStrongId: varchar("key_term_strong_id").references(
    () => strongEntries.id
  ),
  locationId: varchar("location_id").references(() => locations.id),
  timelineEventId: varchar("timeline_event_id").references(
    () => timelineEvents.id
  ),
  commentatorId: varchar("commentator_id").references(() => commentators.id),
  historicVoiceExcerpt: text("historic_voice_excerpt"),
  reflectionQuestions: jsonb("reflection_questions").$type<string[]>().notNull(),
  prayerPrompt: text("prayer_prompt"),
  thenContext: text("then_context"),
  nowApplication: text("now_application"),
});

export type DevotionalPlan = typeof devotionalPlans.$inferSelect;
export type DevotionalDay = typeof devotionalDays.$inferSelect;

export const devotionalPlanProvenanceAudits = pgTable(
  "devotional_plan_provenance_audit",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    planId: varchar("plan_id").notNull().references(() => devotionalPlans.id),
    previousProvenance: varchar("previous_provenance", { length: 30 }),
    provenance: varchar("provenance", { length: 30 }).notNull(),
    reason: text("reason").notNull(),
    recordedBy: varchar("recorded_by", { length: 120 }).notNull().default("system"),
    recordedAt: timestamp("recorded_at").defaultNow().notNull(),
  },
  (table) => ({
    planIdx: index("devotional_plan_provenance_audit_plan_idx").on(table.planId),
  }),
);

export const userPlanEnrollments = pgTable(
  "user_plan_enrollment",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    planId: varchar("plan_id")
      .notNull()
      // Devotional history must outlive catalog curation. A plan cannot be
      // deleted while any member enrollment still references it.
      .references(() => devotionalPlans.id, { onDelete: "restrict" }),
    enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
    startedAt: timestamp("started_at"),
    isActive: boolean("is_active").default(true),
  },
  (table) => ({
    userPlanUnique: uniqueIndex("user_plan_unique").on(
      table.userId,
      table.planId
    ),
  })
);

export const userPlanProgress = pgTable(
  "user_plan_progress",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    enrollmentId: varchar("enrollment_id")
      .notNull()
      .references(() => userPlanEnrollments.id),
    dayId: varchar("day_id")
      .notNull()
      .references(() => devotionalDays.id),
    completedAt: timestamp("completed_at").defaultNow().notNull(),
    journalEntry: text("journal_entry"),
  },
  (table) => ({
    enrollmentDayUnique: uniqueIndex("enrollment_day_unique").on(
      table.enrollmentId,
      table.dayId
    ),
  })
);

// ─── USER ANNOTATIONS ─────────────────────────────────────────────────────────

export const userNotes = pgTable(
  "user_note",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id),
    verseId: varchar("verse_id")
      .notNull()
      .references(() => bibleVerses.id),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("user_note_user_idx").on(table.userId),
    verseIdx: index("user_note_verse_idx").on(table.verseId),
  })
);

export const userHighlights = pgTable(
  "user_highlight",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id),
    verseId: varchar("verse_id")
      .notNull()
      .references(() => bibleVerses.id),
    color: varchar("color", { length: 20 }).default("yellow").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userVerseUnique: uniqueIndex("user_highlight_unique").on(
      table.userId,
      table.verseId,
      table.color
    ),
    userIdx: index("user_highlight_user_idx").on(table.userId),
  })
);

export const userBookmarks = pgTable(
  "user_bookmark",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id),
    verseId: varchar("verse_id")
      .notNull()
      .references(() => bibleVerses.id),
    label: text("label"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userVerseUnique: uniqueIndex("user_bookmark_unique").on(
      table.userId,
      table.verseId
    ),
    userIdx: index("user_bookmark_user_idx").on(table.userId),
  })
);

export type UserNote = typeof userNotes.$inferSelect;
export type UserHighlight = typeof userHighlights.$inferSelect;
export type UserBookmark = typeof userBookmarks.$inferSelect;

// ─── KIDS CLUB ────────────────────────────────────────────────────────────────

export const kidsCollections = pgTable("kids_collection", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  ageGroup: varchar("age_group", { length: 20 }).notNull(),
  icon: varchar("icon", { length: 50 }),
  imageUrl: text("image_url"),
  storyCount: integer("story_count").default(0),
  orderIndex: integer("order_index").default(0),
  published: boolean("published").default(true),
});

export const kidsStories = pgTable(
  "kids_story",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    title: text("title").notNull(),
    scriptureRef: text("scripture_ref"),
    bookId: integer("book_id").references(() => bibleBooks.id),
    chapter: integer("chapter"),
    ageGroup: varchar("age_group", { length: 20 }).notNull(),
    collectionId: varchar("collection_id").references(() => kidsCollections.id),
    orderInCollection: integer("order_in_collection").default(0),
    imageUrl: text("image_url"),
    storyText: text("story_text").notNull(),
    memoryVerse: text("memory_verse"),
    memoryVerseRef: text("memory_verse_ref"),
    thinkQuestions: jsonb("think_questions").$type<string[]>().default([]),
    prayerPrompt: text("prayer_prompt"),
    activitySuggestion: text("activity_suggestion"),
    estimatedMinutes: integer("estimated_minutes").default(5),
    published: boolean("published").default(true),
  },
  (table) => ({
    collectionIdx: index("kids_story_collection_idx").on(table.collectionId),
    ageGroupIdx: index("kids_story_age_group_idx").on(table.ageGroup),
  })
);

export const kidsQuizQuestions = pgTable(
  "kids_quiz_question",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    storyId: varchar("story_id")
      .notNull()
      .references(() => kidsStories.id),
    question: text("question").notNull(),
    options: jsonb("options").$type<string[]>().notNull(),
    correctIndex: integer("correct_index").notNull(),
    explanation: text("explanation"),
  },
  (table) => ({
    storyIdx: index("kids_quiz_story_idx").on(table.storyId),
  })
);

export const kidsProgress = pgTable(
  "kids_progress",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull(),
    storyId: varchar("story_id")
      .notNull()
      .references(() => kidsStories.id),
    completed: boolean("completed").default(false),
    quizScore: integer("quiz_score"),
    memoryVerseMemorized: boolean("memory_verse_memorized").default(false),
    wonderAnswers: jsonb("wonder_answers").$type<number[]>().default([]),
    completedAt: timestamp("completed_at"),
  },
  (table) => ({
    userStoryUnique: uniqueIndex("kids_progress_user_story").on(
      table.userId,
      table.storyId
    ),
  })
);

export const kidsWonderCache = pgTable(
  "kids_wonder_cache",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    storyId: varchar("story_id")
      .notNull()
      .references(() => kidsStories.id),
    ageGroup: varchar("age_group", { length: 20 }).notNull().default("little_lambs"),
    moments: jsonb("moments")
      .$type<
        {
          afterParagraph: number;
          question: string;
          options: { emoji: string; label: string }[];
          correctIndex: number;
        }[]
      >()
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    storyAgeUnique: uniqueIndex("kids_wonder_story_age_unique").on(table.storyId, table.ageGroup),
  })
);

export const kidsStoryScenes = pgTable(
  "kids_story_scene",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    storyId: varchar("story_id")
      .notNull()
      .references(() => kidsStories.id),
    sceneIndex: integer("scene_index").notNull(),
    narration: text("narration").notNull(),
    illustrationPrompt: text("illustration_prompt").notNull(),
    imageUrl: text("image_url"),
    videoUrl: text("video_url"),
    videoTimecodes: jsonb("video_timecodes").$type<{
      segments: { startMs: number; endMs: number; text: string }[];
    } | null>(),
    mood: varchar("mood", { length: 20 }).default("PEACE").notNull(),
    pauseAndWonder: jsonb("pause_and_wonder").$type<{
      question: string;
      options: { emoji: string; label: string }[];
      correctIndex: number;
    } | null>(),
    interactionType: varchar("interaction_type", { length: 30 }),
    interactionConfig: jsonb("interaction_config").$type<Record<string, any> | null>(),
    soundEffects: jsonb("sound_effects").$type<{ key: string; url?: string; trigger: string }[] | null>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    storySceneUnique: uniqueIndex("kids_story_scene_story_idx_unique").on(
      table.storyId,
      table.sceneIndex
    ),
  })
);

export const kidsBadges = pgTable("kids_badge", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }),
  requirement: text("requirement"),
  requiredCount: integer("required_count").default(1),
});

export const kidsUserBadges = pgTable(
  "kids_user_badge",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull(),
    badgeId: varchar("badge_id")
      .notNull()
      .references(() => kidsBadges.id),
    earnedAt: timestamp("earned_at").defaultNow().notNull(),
  },
  (table) => ({
    userBadgeUnique: uniqueIndex("kids_user_badge_unique").on(
      table.userId,
      table.badgeId
    ),
  })
);

export const kidsStreaks = pgTable("kids_streak", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull(),
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  lastActivityDate: text("last_activity_date"),
});

export const childProfiles = pgTable(
  "child_profile",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    parentId: varchar("parent_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(),
    ageGroup: varchar("age_group", { length: 20 }).default("little_lambs").notNull(),
    avatarUrl: text("avatar_url"),
    totalPoints: integer("total_points").default(0),
    currentLevel: integer("current_level").default(1),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    parentIdx: index("child_profile_parent_idx").on(table.parentId),
  })
);

export type KidsCollection = typeof kidsCollections.$inferSelect;
export type KidsStory = typeof kidsStories.$inferSelect;
export type KidsQuizQuestion = typeof kidsQuizQuestions.$inferSelect;
export type KidsProgress = typeof kidsProgress.$inferSelect;
export type KidsBadge = typeof kidsBadges.$inferSelect;
export type KidsUserBadge = typeof kidsUserBadges.$inferSelect;
export type KidsStreak = typeof kidsStreaks.$inferSelect;
export type KidsWonderCache = typeof kidsWonderCache.$inferSelect;
export type ChildProfile = typeof childProfiles.$inferSelect;

// ─── DINNER TABLE TOPICS (Parent Bridge) ────────────────────────────────────

export const dinnerTableTopics = pgTable(
  "dinner_table_topic",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    parentId: varchar("parent_id").notNull(),
    childProfileId: varchar("child_profile_id").references(() => childProfiles.id),
    childName: text("child_name").notNull(),
    storyId: varchar("story_id").references(() => kidsStories.id),
    storyTitle: text("story_title").notNull(),
    scriptureRef: text("scripture_ref"),
    quizScore: integer("quiz_score"),
    notificationText: text("notification_text").notNull(),
    dinnerQuestion: text("dinner_question").notNull(),
    followUpQuestions: jsonb("follow_up_questions").$type<string[]>().default([]),
    discussed: boolean("discussed").default(false),
    discussedAt: timestamp("discussed_at"),
    bonusPointsAwarded: boolean("bonus_points_awarded").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    parentIdx: index("dinner_topic_parent_idx").on(table.parentId),
    childIdx: index("dinner_topic_child_idx").on(table.childProfileId),
  })
);

export type DinnerTableTopic = typeof dinnerTableTopics.$inferSelect;

// ─── KIDS STAR SHOP ─────────────────────────────────────────────────────────

export const kidsPurchases = pgTable(
  "kids_purchase",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull(),
    childProfileId: varchar("child_profile_id").references(() => childProfiles.id),
    itemId: varchar("item_id", { length: 60 }).notNull(),
    category: varchar("category", { length: 30 }).notNull(),
    starCost: integer("star_cost").notNull(),
    equipped: boolean("equipped").default(false),
    purchasedAt: timestamp("purchased_at").defaultNow().notNull(),
  },
  (table) => ({
    userChildIdx: index("kids_purchase_user_child_idx").on(table.userId, table.childProfileId),
  })
);

export type KidsPurchase = typeof kidsPurchases.$inferSelect;

// ─── KIDS DAILY QUESTS ──────────────────────────────────────────────────────

export const kidsDailyQuests = pgTable(
  "kids_daily_quest",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull(),
    childProfileId: varchar("child_profile_id").references(() => childProfiles.id),
    questDate: varchar("quest_date", { length: 10 }).notNull(),
    readStory: boolean("read_story").default(false),
    practiceVerse: boolean("practice_verse").default(false),
    takeQuiz: boolean("take_quiz").default(false),
    bonusClaimed: boolean("bonus_claimed").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userDateIdx: index("kids_quest_user_date_idx").on(table.userId, table.childProfileId, table.questDate),
  })
);

export type KidsDailyQuest = typeof kidsDailyQuests.$inferSelect;

// ─── PRAYER JOURNAL ──────────────────────────────────────────────────────────

export const prayerRequests = pgTable(
  "prayer_request",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull(),
    familyId: varchar("family_id"),
    groupId: varchar("group_id"),
    title: text("title").notNull(),
    content: text("content"),
    category: varchar("category", { length: 30 }).default("personal").notNull(),
    authorName: text("author_name"),
    answered: boolean("answered").default(false),
    answeredAt: timestamp("answered_at"),
    supportCount: integer("support_count").default(0),
    supportedBy: jsonb("supported_by").$type<string[]>().default([]),
    scripturalVerse: text("scriptural_verse"),
    scripturalNote: text("scriptural_note"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("prayer_user_idx").on(table.userId),
    familyIdx: index("prayer_family_idx").on(table.familyId),
    groupIdx: index("prayer_group_idx").on(table.groupId),
  })
);

export type PrayerRequest = typeof prayerRequests.$inferSelect;

// ─── READING HISTORY & STREAKS ───────────────────────────────────────────────

export const readingHistory = pgTable(
  "reading_history",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull(),
    bookId: integer("book_id").notNull(),
    bookName: text("book_name").notNull(),
    chapter: integer("chapter").notNull(),
    translation: varchar("translation", { length: 10 }).default("KJV"),
    readAt: timestamp("read_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("reading_history_user_idx").on(table.userId),
    readAtIdx: index("reading_history_read_at_idx").on(table.readAt),
    userReadAtIdx: index("reading_history_user_read_at_idx").on(table.userId, table.readAt),
  })
);

export const readingStreaks = pgTable("reading_streak", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  lastReadDate: text("last_read_date"),
});

export type ReadingHistory = typeof readingHistory.$inferSelect;
export type ReadingStreak = typeof readingStreaks.$inferSelect;

// ─── SOCRATIC STUDY GUIDE ───────────────────────────────────────────────────

export const studyGuideSessions = pgTable(
  "study_guide_session",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull(),
    verseReference: text("verse_reference").notNull(),
    verseText: text("verse_text").notNull(),
    bookName: text("book_name").notNull(),
    chapter: integer("chapter").notNull(),
    verse: integer("verse").notNull(),
    phase: varchar("phase", { length: 20 }).default("observe").notNull(),
    persona: varchar("persona", { length: 20 }).default("pastoral").notNull(),
    messages: text("messages").default("[]").notNull(),
    progression: text("progression").default("{}").notNull(),
    summary: text("summary"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("study_guide_user_idx").on(table.userId),
  })
);

export type StudyGuideSession = typeof studyGuideSessions.$inferSelect;

// ─── VERSE MAP CACHE ────────────────────────────────────────────────────────

export const verseMapCache = pgTable(
  "verse_map_cache",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    verseId: varchar("verse_id").notNull().unique(),
    crossReferences: text("cross_references").default("[]").notNull(),
    contextSnippet: text("context_snippet"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    verseIdx: index("verse_map_verse_idx").on(table.verseId),
  })
);

export type VerseMapCache = typeof verseMapCache.$inferSelect;

// ─── 4D SCRIPTURE — CHAPTER CONTEXT CACHE ───────────────────────────────────

export const chapterContextCache = pgTable(
  "chapter_context_cache",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    bookId: integer("book_id").notNull(),
    chapter: integer("chapter").notNull(),
    locations: text("locations").default("[]").notNull(),
    timelineEvents: text("timeline_events").default("[]").notNull(),
    keyFigures: text("key_figures").default("[]").notNull(),
    culturalInsights: text("cultural_insights"),
    geographicalNotes: text("geographical_notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    bookChapterIdx: index("chapter_context_book_chapter_idx").on(table.bookId, table.chapter),
  })
);

export type ChapterContextCache = typeof chapterContextCache.$inferSelect;

// ─── LAYER COMPLETION TRACKING ─────────────────────────────────────────────

export const layerCompletions = pgTable(
  "layer_completions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull(),
    bookId: integer("book_id").notNull(),
    chapter: integer("chapter").notNull(),
    layer: varchar("layer", { length: 20 }).notNull(),
    verseStart: integer("verse_start").notNull().default(0),
    verseEnd: integer("verse_end").notNull().default(0),
    completedAt: timestamp("completed_at").defaultNow().notNull(),
  },
  (table) => ({
    userBookChapterLayerVerse: uniqueIndex("layer_completions_unique").on(
      table.userId,
      table.bookId,
      table.chapter,
      table.layer,
      table.verseStart,
      table.verseEnd
    ),
    userBookIdx: index("layer_user_book_idx").on(table.userId, table.bookId),
  })
);

export type LayerCompletion = typeof layerCompletions.$inferSelect;

// ─── STUDY JOURNAL ENTRIES ─────────────────────────────────────────────────

export const studyJournalEntries = pgTable(
  "study_journal_entries",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull(),
    bookId: integer("book_id").notNull(),
    chapter: integer("chapter").notNull(),
    layer: varchar("layer", { length: 20 }).notNull(),
    sectionKey: varchar("section_key", { length: 60 }).notNull(),
    verseStart: integer("verse_start").notNull().default(0),
    verseEnd: integer("verse_end").notNull().default(0),
    content: text("content").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userChapterSectionVerse: uniqueIndex("journal_entries_unique").on(
      table.userId,
      table.bookId,
      table.chapter,
      table.layer,
      table.sectionKey,
      table.verseStart,
      table.verseEnd
    ),
    userBookIdx: index("journal_user_book_idx").on(table.userId, table.bookId),
  })
);

export type StudyJournalEntry = typeof studyJournalEntries.$inferSelect;

// ─── CHAPTER PASSAGE SECTIONS ─────────────────────────────────────────────

export const chapterPassageSections = pgTable(
  "chapter_passage_sections",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    bookId: integer("book_id").notNull(),
    chapter: integer("chapter").notNull(),
    sections: jsonb("sections").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    bookChapter: uniqueIndex("passage_sections_book_chapter").on(
      table.bookId,
      table.chapter
    ),
  })
);

export type ChapterPassageSection = typeof chapterPassageSections.$inferSelect;

// ─── CHAPTER SUMMARIES (Deep Study Orientation) ──────────────────────────────

export const chapterSummaries = pgTable(
  "chapter_summary",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    bookId: integer("book_id").notNull(),
    chapter: integer("chapter").notNull(),
    bigIdea: text("big_idea").notNull(),
    narrativeRole: text("narrative_role").notNull(),
    focusThemes: text("focus_themes").notNull().default("[]"),
    pastoralFrame: text("pastoral_frame").notNull(),
    thesisStatement: text("thesis_statement"),
    doctrinalAnchor: text("doctrinal_anchor"),
    narrativePlacement: text("narrative_placement"),
    version: integer("version").default(1).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    bookChapterUnique: uniqueIndex("chapter_summary_book_chapter_unique").on(
      table.bookId,
      table.chapter
    ),
  })
);

export type ChapterSummary = typeof chapterSummaries.$inferSelect;

// ─── FORMATION SYSTEM ─────────────────────────────────────────────────────────

export const formationTracks = pgTable("formation_track", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }).default("school"),
  color: varchar("color", { length: 20 }).default("#C9933A"),
  category: varchar("category", { length: 30 }).notNull(),
  totalModules: integer("total_modules").default(0),
  totalWeeks: integer("total_weeks").default(0),
  difficulty: varchar("difficulty", { length: 20 }).default("beginner"),
  isPublished: boolean("is_published").default(false),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const formationModules = pgTable("formation_module", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  trackId: varchar("track_id")
    .notNull()
    .references(() => formationTracks.id),
  title: text("title").notNull(),
  description: text("description"),
  learningObjective: text("learning_objective"),
  moduleOrder: integer("module_order").notNull(),
  totalLessons: integer("total_lessons").default(0),
});

export const formationLessons = pgTable("formation_lesson", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  moduleId: varchar("module_id")
    .notNull()
    .references(() => formationModules.id),
  title: text("title").notNull(),
  description: text("description"),
  lessonOrder: integer("lesson_order").notNull(),
  anchorText: text("anchor_text"),
  anchorBookId: integer("anchor_book_id"),
  anchorChapter: integer("anchor_chapter"),
  anchorVerseStart: integer("anchor_verse_start"),
  anchorVerseEnd: integer("anchor_verse_end"),
  estimatedMinutes: integer("estimated_minutes").default(30),
});

export const lessonSections = pgTable("lesson_section", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  lessonId: varchar("lesson_id")
    .notNull()
    .references(() => formationLessons.id),
  sectionType: varchar("section_type", { length: 20 }).notNull(),
  title: text("title").notNull(),
  content: text("content"),
  sortOrder: integer("sort_order").notNull(),
});

export const formationAssessments = pgTable("formation_assessment", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  lessonId: varchar("lesson_id")
    .notNull()
    .references(() => formationLessons.id),
  title: text("title").notNull(),
  passingScore: integer("passing_score").default(70),
});

export const assessmentItems = pgTable("assessment_item", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  assessmentId: varchar("assessment_id")
    .notNull()
    .references(() => formationAssessments.id),
  question: text("question").notNull(),
  options: jsonb("options").$type<string[]>().notNull(),
  correctIndex: integer("correct_index").notNull(),
  explanation: text("explanation"),
});

export const progressTracks = pgTable(
  "progress_track",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull(),
    trackId: varchar("track_id")
      .notNull()
      .references(() => formationTracks.id),
    enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
    currentModuleId: varchar("current_module_id"),
    currentLessonId: varchar("current_lesson_id"),
    percentComplete: integer("percent_complete").default(0),
    moduleConfidence: jsonb("module_confidence").$type<Record<string, number>>().default({}),
  },
  (table) => ({
    userTrackUnique: uniqueIndex("progress_user_track_unique").on(
      table.userId,
      table.trackId
    ),
  })
);

export const progressLessons = pgTable(
  "progress_lesson",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull(),
    lessonId: varchar("lesson_id")
      .notNull()
      .references(() => formationLessons.id),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
    sectionsCompleted: jsonb("sections_completed").$type<string[]>().default([]),
    assessmentScore: integer("assessment_score"),
    assessmentPassed: boolean("assessment_passed"),
  },
  (table) => ({
    userLessonUnique: uniqueIndex("progress_user_lesson_unique").on(
      table.userId,
      table.lessonId
    ),
  })
);

export type FormationTrack = typeof formationTracks.$inferSelect;
export type FormationModule = typeof formationModules.$inferSelect;
export type FormationLesson = typeof formationLessons.$inferSelect;
export type LessonSection = typeof lessonSections.$inferSelect;
export type FormationAssessment = typeof formationAssessments.$inferSelect;
export type AssessmentItem = typeof assessmentItems.$inferSelect;
export type ProgressTrack = typeof progressTracks.$inferSelect;
export type ProgressLesson = typeof progressLessons.$inferSelect;

// ─── CONTENT i18n OVERLAY TABLES ─────────────────────────────────────────────

export const CONTENT_LANGUAGES = [
  "en", "es", "fr", "pt", "fil", "zh",
  "de", "sw", "id", "ko", "ja", "hi", "ar",
  "ru", "hr", "it", "nl", "tr", "pl", "ro", "uk", "am",
] as const;
export type ContentLanguage = (typeof CONTENT_LANGUAGES)[number];

export const formationModuleI18n = pgTable(
  "formation_module_i18n",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    moduleId: varchar("module_id")
      .notNull()
      .references(() => formationModules.id),
    language: varchar("language", { length: 10 }).notNull(),
    title: text("title").notNull(),
    description: text("description"),
  },
  (table) => ({
    moduleLangUnique: uniqueIndex("module_i18n_module_lang").on(
      table.moduleId,
      table.language
    ),
  })
);

export const formationLessonI18n = pgTable(
  "formation_lesson_i18n",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    lessonId: varchar("lesson_id")
      .notNull()
      .references(() => formationLessons.id),
    language: varchar("language", { length: 10 }).notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
  },
  (table) => ({
    lessonLangUnique: uniqueIndex("lesson_i18n_lesson_lang").on(
      table.lessonId,
      table.language
    ),
  })
);

export const lessonSectionI18n = pgTable(
  "lesson_section_i18n",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    sectionId: varchar("section_id")
      .notNull()
      .references(() => lessonSections.id),
    language: varchar("language", { length: 10 }).notNull(),
    heading: text("heading"),
    content: text("content").notNull(),
  },
  (table) => ({
    sectionLangUnique: uniqueIndex("section_i18n_section_lang").on(
      table.sectionId,
      table.language
    ),
  })
);

export const assessmentItemI18n = pgTable(
  "assessment_item_i18n",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    itemId: varchar("item_id")
      .notNull()
      .references(() => assessmentItems.id),
    language: varchar("language", { length: 10 }).notNull(),
    question: text("question").notNull(),
    options: jsonb("options").$type<string[]>().notNull(),
    explanation: text("explanation"),
  },
  (table) => ({
    itemLangUnique: uniqueIndex("item_i18n_item_lang").on(
      table.itemId,
      table.language
    ),
  })
);

export type FormationModuleI18n = typeof formationModuleI18n.$inferSelect;
export type FormationLessonI18n = typeof formationLessonI18n.$inferSelect;
export type LessonSectionI18n = typeof lessonSectionI18n.$inferSelect;
export type AssessmentItemI18n = typeof assessmentItemI18n.$inferSelect;

// ─── SDA CHURCHES ────────────────────────────────────────────────────────────

export const sdaChurches = pgTable(
  "sda_church",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    address: text("address").notNull(),
    city: text("city").notNull(),
    state: text("state"),
    country: text("country").notNull(),
    lat: varchar("lat", { length: 20 }).notNull(),
    lng: varchar("lng", { length: 20 }).notNull(),
    serviceTimes: text("service_times"),
    contactPhone: text("contact_phone"),
    contactEmail: text("contact_email"),
    website: text("website"),
    pastorName: text("pastor_name"),
    membershipSize: varchar("membership_size", { length: 20 }),
    source: varchar("source").default("unknown").notNull(),
    verified: boolean("verified").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    cityIdx: index("church_city_idx").on(table.city),
    countryIdx: index("church_country_idx").on(table.country),
    nameAddressCityCountryUniq: uniqueIndex(
      "sda_church_name_address_city_country_uniq",
    ).on(table.name, table.address, table.city, table.country),
  })
);

export type SdaChurch = typeof sdaChurches.$inferSelect;

/** User-reported churches missing from the verified directory. Never auto-inserted into sda_church. */
export const churchSubmissions = pgTable("church_submissions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  city: text("city").notNull(),
  country: text("country").notNull(),
  address: text("address"),
  userId: varchar("user_id"),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ChurchSubmission = typeof churchSubmissions.$inferSelect;

// ─── LIVE STREAMING ──────────────────────────────────────────────────────────

export const liveSessions = pgTable(
  "live_session",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    title: text("title").notNull(),
    groupId: varchar("group_id"),
    churchId: varchar("church_id"),
    hostUserId: varchar("host_user_id").notNull(),
    hostDisplayName: text("host_display_name"),
    roomUrl: text("room_url").notNull(),
    status: varchar("status", { length: 20 }).default("live").notNull(),
    participantCount: integer("participant_count").default(1),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    endedAt: timestamp("ended_at"),
  },
  (table) => ({
    statusIdx: index("live_session_status_idx").on(table.status),
    groupIdx: index("live_session_group_idx").on(table.groupId),
    hostIdx: index("live_session_host_idx").on(table.hostUserId),
  })
);

export type LiveSession = typeof liveSessions.$inferSelect;

// ─── SABBATH REFLECTIONS ──────────────────────────────────────────────────────

export const sabbathReflections = pgTable(
  "sabbath_reflection",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull(),
    date: varchar("date", { length: 10 }).notNull(),
    prompt: text("prompt").notNull(),
    response: text("response").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    userDatePromptUnique: uniqueIndex("sabbath_reflection_user_date_prompt").on(
      table.userId,
      table.date,
      table.prompt
    ),
  })
);

export type SabbathReflection = typeof sabbathReflections.$inferSelect;

// ─── SEMANTIC SEARCH CACHE ──────────────────────────────────────────────────

export const searchCache = pgTable("search_cache", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  queryText: text("query_text").notNull(),
  queryHash: varchar("query_hash", { length: 64 }).notNull().unique(),
  userId: varchar("user_id"),
  results: jsonb("results").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
}, (table) => ({
  userIdx: index("search_cache_user_idx").on(table.userId),
}));

export type SearchCache = typeof searchCache.$inferSelect;

// ─── GREAT CONTROVERSY EXPLORATION CACHE ────────────────────────────────────

export const gcExplorationCache = pgTable("gc_exploration_cache", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  nodeId: varchar("node_id", { length: 64 }).notNull().unique(),
  narrativeExplanation: text("narrative_explanation").notNull(),
  connections: jsonb("connections").notNull(),
  reflectionQuestion: text("reflection_question").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type GCExplorationCache = typeof gcExplorationCache.$inferSelect;

export const sabbathSchoolQuarterlies = pgTable("sabbath_school_quarterly", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  quarterCode: varchar("quarter_code", { length: 16 }).notNull().unique(),
  language: varchar("language", { length: 8 }).notNull().default("en"),
  curriculumType: varchar("curriculum_type", { length: 16 }).notNull().default("adult"),
  title: text("title").notNull(),
  description: text("description"),
  humanDate: varchar("human_date", { length: 100 }),
  startDate: varchar("start_date", { length: 16 }),
  endDate: varchar("end_date", { length: 16 }),
  colorPrimary: varchar("color_primary", { length: 16 }),
  coverUrl: text("cover_url"),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sabbathSchoolLessons = pgTable("sabbath_school_lesson", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  quarterlyId: varchar("quarterly_id")
    .notNull()
    .references(() => sabbathSchoolQuarterlies.id),
  lessonNumber: integer("lesson_number").notNull(),
  title: text("title").notNull(),
  startDate: varchar("start_date", { length: 16 }),
  endDate: varchar("end_date", { length: 16 }),
  videoByArtist: jsonb("video_by_artist"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sabbathSchoolDays = pgTable("sabbath_school_day", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  lessonId: varchar("lesson_id")
    .notNull()
    .references(() => sabbathSchoolLessons.id),
  dayNumber: integer("day_number").notNull(),
  title: text("title"),
  date: varchar("date", { length: 16 }),
  contentMarkdown: text("content_markdown"),
  audioUrl: text("audio_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sabbathSchoolUserProgress = pgTable("sabbath_school_user_progress", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  dayId: varchar("day_id")
    .notNull()
    .references(() => sabbathSchoolDays.id),
  completed: boolean("completed").notNull().default(false),
  journalEntry: text("journal_entry"),
  completedAt: timestamp("completed_at").defaultNow(),
});

export const sabbathSchoolDiscussionPrep = pgTable("sabbath_school_discussion_prep", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  lessonId: varchar("lesson_id")
    .notNull()
    .references(() => sabbathSchoolLessons.id),
  keyQuestions: jsonb("key_questions").notNull(),
  aiSummary: text("ai_summary").notNull(),
  reflectionPrompts: jsonb("reflection_prompts").notNull(),
  lifeApplicationVideoUrl: text("life_application_video_url"),
  depth: varchar("depth", { length: 16 }).default("standard").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── LESSON SOURCE PACKETS ──────────────────────────────────────────────────

export const lessonSourcePackets = pgTable("lesson_source_packets", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  quarterlyId: varchar("quarterly_id").notNull(),
  lessonId: varchar("lesson_id").notNull(),
  weekNumber: integer("week_number").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  sourceJson: jsonb("source_json").notNull(),
  sourceHash: varchar("source_hash", { length: 64 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("ingested"),
  ingestedAt: timestamp("ingested_at").defaultNow().notNull(),
  sourceVersion: varchar("source_version", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  lessonIdx: index("source_packets_lesson_idx").on(table.lessonId),
  quarterlyIdx: index("source_packets_quarterly_idx").on(table.quarterlyId),
  statusIdx: index("source_packets_status_idx").on(table.status),
  hashIdx: uniqueIndex("source_packets_hash_idx").on(table.lessonId, table.sourceHash),
}));

// ─── RESOURCES ──────────────────────────────────────────────────────────────

export const resources = pgTable("resources", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description").notNull(),
  resourceType: varchar("resource_type", { length: 50 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  tier: varchar("tier", { length: 10 }).notNull().default("free"),
  coverImageUrl: text("cover_image_url"),
  contentJson: jsonb("content_json").notNull(),
  sourceRef: jsonb("source_ref"),
  sourcePacketId: varchar("source_packet_id"),
  promptVersion: varchar("prompt_version", { length: 20 }),
  generationStatus: varchar("generation_status", { length: 20 }).default("completed"),
  reviewStatus: varchar("review_status", { length: 20 }).default("pending"),
  ageGroup: varchar("age_group", { length: 20 }),
  estimatedMinutes: integer("estimated_minutes").default(15),
  tags: jsonb("tags").default([]),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  generatedBy: varchar("generated_by", { length: 20 }).notNull().default("ai"),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: varchar("reviewed_by"),
  reviewNotes: text("review_notes"),
  previousContentJson: jsonb("previous_content_json"),
  supersedesResourceId: varchar("supersedes_resource_id"),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  statusIdx: index("resources_status_idx").on(table.status),
  categoryIdx: index("resources_category_idx").on(table.category),
  tierIdx: index("resources_tier_idx").on(table.tier),
  typeIdx: index("resources_type_idx").on(table.resourceType),
  sourcePacketIdx: index("resources_source_packet_idx").on(table.sourcePacketId),
  generationStatusIdx: index("resources_generation_status_idx").on(table.generationStatus),
}));

export const resourceReviewNotes = pgTable("resource_review_notes", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  resourceId: varchar("resource_id").notNull(),
  action: varchar("action", { length: 30 }).notNull(),
  statusFrom: varchar("status_from", { length: 20 }),
  statusTo: varchar("status_to", { length: 20 }),
  notes: text("notes"),
  createdBy: varchar("created_by").notNull(),
  isSystem: boolean("is_system").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  resourceIdx: index("review_notes_resource_idx").on(table.resourceId),
  createdAtIdx: index("review_notes_created_at_idx").on(table.createdAt),
}));

export const resourceProgress = pgTable("resource_progress", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  resourceId: varchar("resource_id").notNull(),
  started: boolean("started").default(true).notNull(),
  completed: boolean("completed").default(false).notNull(),
  progressPercent: integer("progress_percent").default(0).notNull(),
  lastAccessedAt: timestamp("last_accessed_at").defaultNow().notNull(),
  notes: text("notes"),
}, (table) => ({
  userResourceUnique: uniqueIndex("progress_user_resource").on(table.userId, table.resourceId),
}));

export const resourceBookmarks = pgTable("resource_bookmarks", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  resourceId: varchar("resource_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userBookmarkUnique: uniqueIndex("bookmark_user_resource").on(table.userId, table.resourceId),
}));

export const insertResourceSchema = createInsertSchema(resources);
export const insertResourceProgressSchema = createInsertSchema(resourceProgress);
export const insertResourceBookmarkSchema = createInsertSchema(resourceBookmarks);

export const userFeedback = pgTable("user_feedback", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  topic: varchar("topic", { length: 32 }).notNull(),
  message: text("message").notNull(),
  context: text("context"),
  email: varchar("email", { length: 255 }),
  appVersion: varchar("app_version", { length: 32 }),
  platform: varchar("platform", { length: 16 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── DEVICE TOKENS (Push Notifications) ──────────────────────────────────────

export const deviceTokens = pgTable(
  "device_tokens",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    pushToken: text("push_token").notNull(),
    platform: varchar("platform", { length: 16 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("device_tokens_user_idx").on(table.userId),
    tokenUnique: uniqueIndex("device_tokens_token_unique").on(table.pushToken),
  })
);

export type DeviceToken = typeof deviceTokens.$inferSelect;

// ─── LEADER REQUESTS ─────────────────────────────────────────────────────────

export const leaderRequests = pgTable(
  "leader_requests",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    churchName: text("church_name").notNull(),
    role: varchar("role", { length: 30 }).notNull(),
    contactEmail: text("contact_email").notNull(),
    description: text("description"),
    status: varchar("status", { length: 12 }).default("pending").notNull(),
    reviewedBy: varchar("reviewed_by"),
    reviewedAt: timestamp("reviewed_at"),
    reviewNotes: text("review_notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("leader_requests_user_idx").on(table.userId),
    statusIdx: index("leader_requests_status_idx").on(table.status),
  })
);

export type LeaderRequest = typeof leaderRequests.$inferSelect;

// ─── VIDEO PIPELINE JOBS ─────────────────────────────────────────────────────

export const videoPipelineJobs = pgTable(
  "video_pipeline_jobs",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    topic: text("topic").notNull(),
    script: text("script").notNull(),
    status: text("status").default("pending").notNull(),
    avatarVideoUrl: text("avatar_video_url"),
    brollImageUrls: jsonb("broll_image_urls").$type<string[]>(),
    brollVideoUrls: jsonb("broll_video_urls").$type<string[]>(),
    assembledVideoUrl: text("assembled_video_url"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  }
);

export type VideoPipelineJob = typeof videoPipelineJobs.$inferSelect;

// ─── VIDEO TOPICS ───────────────────────────────────────────────────────────

export const videoAvatars = pgTable("video_avatars", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  heygenAvatarId: text("heygen_avatar_id").notNull(),
  heygenVoiceId: text("heygen_voice_id").notNull(),
  gender: text("gender"),
  ethnicity: text("ethnicity"),
  ageGroup: text("age_group").default("teens"),
  description: text("description"),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  elevenlabsVoiceId: text("elevenlabs_voice_id"),
  characterDescription: text("character_description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type VideoAvatar = typeof videoAvatars.$inferSelect;

export const videoTopics = pgTable(
  "video_topics",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    title: text("title").notNull(),
    description: text("description"),
    targetAgeGroup: text("target_age_group").default("teens"),
    scriptureAnchor: text("scripture_anchor"),
    category: text("category"),
    status: text("status").default("pending"),
    priority: integer("priority").default(0),
    generatedScript: text("generated_script"),
    avatarVideoUrl: text("avatar_video_url"),
    finalVideoUrl: text("final_video_url"),
    language: text("language").default("en"),
    avatarId: varchar("avatar_id"),
    musicTrack: text("music_track"),
    pipelineMode: text("pipeline_mode").default("cinematic"),
    assemblyStatus: text("assembly_status"),
    assembledVideoUrl: text("assembled_video_url"),
    cinematicScenes: jsonb("cinematic_scenes"),
    voiceoverUrl: text("voiceover_url"),
    characterAnchorUrl: text("character_anchor_url"),
    thumbnailUrl: text("thumbnail_url"),
    reviewStatus: text("review_status"),
    reviewNotes: text("review_notes"),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    statusIdx: index("video_topics_status_idx").on(table.status),
    categoryIdx: index("video_topics_category_idx").on(table.category),
    titleLangUniq: uniqueIndex("video_topics_title_language_idx").on(table.title, table.language),
  })
);

export type VideoTopic = typeof videoTopics.$inferSelect;

// ─── TOPIC VIDEOS (Multiple videos per topic, each with unique scripture) ─────

export const topicVideos = pgTable(
  "topic_videos",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    topicId: varchar("topic_id").notNull(),
    scriptureAnchor: text("scripture_anchor").notNull(),
    generatedScript: text("generated_script"),
    voiceoverUrl: text("voiceover_url"),
    characterAnchorUrl: text("character_anchor_url"),
    cinematicScenes: jsonb("cinematic_scenes"),
    assembledVideoUrl: text("assembled_video_url"),
    finalVideoUrl: text("final_video_url"),
    thumbnailUrl: text("thumbnail_url"),
    musicTrack: text("music_track"),
    assemblyStatus: text("assembly_status"),
    reviewStatus: text("review_status"),
    reviewNotes: text("review_notes"),
    crossRefOf: text("cross_ref_of"),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    topicIdx: index("topic_videos_topic_id_idx").on(table.topicId),
    statusIdx: index("topic_videos_assembly_status_idx").on(table.assemblyStatus),
    topicScriptureUniq: uniqueIndex("topic_videos_topic_scripture_idx").on(table.topicId, table.scriptureAnchor),
  })
);

export type TopicVideo = typeof topicVideos.$inferSelect;

// ─── BIBLICAL SERIES ──────────────────────────────────────────────────────────

export const biblicalSeries = pgTable("biblical_series", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  description: text("description"),
  tag: varchar("tag", { length: 50 }),
  speaker: varchar("speaker", { length: 100 }),
  gradientColors: jsonb("gradient_colors").$type<string[]>(),
  episodeCount: integer("episode_count").default(0).notNull(),
  status: varchar("status", { length: 20 }).default("published").notNull(),
  isFeatured: boolean("is_featured").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type BiblicalSeries = typeof biblicalSeries.$inferSelect;

export const biblicalEpisodes = pgTable(
  "biblical_episode",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    seriesId: varchar("series_id")
      .notNull()
      .references(() => biblicalSeries.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    scriptureAnchor: text("scripture_anchor"),
    videoUrl: text("video_url"),
    duration: integer("duration"),
    orderIndex: integer("order_index").notNull(),
    status: varchar("status", { length: 20 }).default("ready").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    seriesIdx: index("biblical_episode_series_idx").on(table.seriesId),
    orderIdx: index("biblical_episode_order_idx").on(table.seriesId, table.orderIndex),
  })
);

export type BiblicalEpisode = typeof biblicalEpisodes.$inferSelect;

// ─── READING PLANS ──────────────────────────────────────────────────────────

export const readingPlans = pgTable("reading_plan", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  category: varchar("category", { length: 40 }),
  coverImageUrl: text("cover_image_url"),
  durationDays: integer("duration_days").notNull(),
  type: varchar("type", { length: 12 }).default("ready-made").notNull(),
  status: varchar("status", { length: 20 }).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ReadingPlan = typeof readingPlans.$inferSelect;

export const planDays = pgTable(
  "plan_day",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    planId: varchar("plan_id")
      .notNull()
      .references(() => readingPlans.id, { onDelete: "cascade" }),
    dayNumber: integer("day_number").notNull(),
    bookId: integer("book_id"),
    chapter: integer("chapter"),
    verseStart: integer("verse_start"),
    verseEnd: integer("verse_end"),
    completedAt: timestamp("completed_at"),
  },
  (table) => ({
    planIdx: index("plan_day_plan_idx").on(table.planId),
    dayOrderIdx: index("plan_day_order_idx").on(table.planId, table.dayNumber),
  })
);

export type PlanDay = typeof planDays.$inferSelect;

export const userPlans = pgTable(
  "user_plan",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull(),
    planId: varchar("plan_id")
      .notNull()
      .references(() => readingPlans.id, { onDelete: "cascade" }),
    startDate: timestamp("start_date").defaultNow().notNull(),
    currentDay: integer("current_day").default(1).notNull(),
    completedAt: timestamp("completed_at"),
    notificationTime: varchar("notification_time", { length: 10 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("user_plan_user_idx").on(table.userId),
    userPlanIdx: index("user_plan_user_plan_idx").on(table.userId, table.planId),
  })
);

export type UserPlan = typeof userPlans.$inferSelect;

export const sabbathTypes = pgTable(
  "sabbath_types",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    hebrewName: text("hebrew_name").notNull(),
    type: text("type").notNull(),
    anchorScripture: text("anchor_scripture").notNull(),
    description: text("description").notNull(),
    historicalContext: text("historical_context").notNull(),
    propheticSignificance: text("prophetic_significance").notNull(),
    frequencyDescription: text("frequency_description").notNull(),
    orderIndex: integer("order_index").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    typeIdx: index("sabbath_types_type_idx").on(table.type),
    orderIdx: index("sabbath_types_order_idx").on(table.orderIndex),
    nameUniq: uniqueIndex("sabbath_types_name_idx").on(table.name),
  })
);

export type SabbathType = typeof sabbathTypes.$inferSelect;

export const sabbathScriptures = pgTable(
  "sabbath_scriptures",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    sabbathTypeId: varchar("sabbath_type_id")
      .notNull()
      .references(() => sabbathTypes.id, { onDelete: "cascade" }),
    bookId: integer("book_id").notNull(),
    chapter: integer("chapter").notNull(),
    verseStart: integer("verse_start").notNull(),
    verseEnd: integer("verse_end"),
    label: text("label").notNull(),
    orderIndex: integer("order_index").notNull(),
  },
  (table) => ({
    sabbathIdx: index("sabbath_scriptures_sabbath_idx").on(table.sabbathTypeId),
    sabbathOrderUniq: uniqueIndex("sabbath_scriptures_type_order_idx").on(table.sabbathTypeId, table.orderIndex),
  })
);

export type SabbathScripture = typeof sabbathScriptures.$inferSelect;

// ─── CHARACTERS (Video Pipeline) ─────────────────────────────────────────────

export const characters = pgTable(
  "characters",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    characterType: varchar("character_type", { length: 30 }).notNull(),
    gender: varchar("gender", { length: 10 }),
    description: text("description"),
    cloudinaryUrl: text("cloudinary_url"),
    thumbnailUrl: text("thumbnail_url"),
    voiceId: varchar("voice_id", { length: 50 }),
    aliases: jsonb("aliases").$type<string[]>().default([]),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    slugUniq: uniqueIndex("characters_slug_idx").on(table.slug),
    activePartialIdx: index("characters_active_partial_idx").on(table.isActive).where(sql`is_active = true`),
    typeIdx: index("characters_type_idx").on(table.characterType),
  })
);

export type Character = typeof characters.$inferSelect;
export type InsertCharacter = typeof characters.$inferInsert;

// ─── STAGE 3 ANALYTICS: CHURCH HIERARCHY ─────────────────────────────────────

export const churchHierarchy = pgTable("church_hierarchy", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  tier: smallint("tier").notNull(),
  parentId: varchar("parent_id"),
  path: text("path").notNull(),
  timezone: varchar("timezone", { length: 64 }).default("UTC"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  parentIdx: index("ch_parent_idx").on(table.parentId),
  tierIdx: index("ch_tier_idx").on(table.tier),
  pathIdx: index("ch_path_idx").on(table.path),
}));

export type ChurchHierarchy = typeof churchHierarchy.$inferSelect;
export type InsertChurchHierarchy = typeof churchHierarchy.$inferInsert;

export const hierarchyMembership = pgTable("hierarchy_membership", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  hierarchyNodeId: varchar("hierarchy_node_id").notNull(),
  role: varchar("role", { length: 32 }).notNull().default("member"),
  isPrimary: boolean("is_primary").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("hm_user_idx").on(table.userId),
  nodeIdx: index("hm_node_idx").on(table.hierarchyNodeId),
  userNodeUniq: uniqueIndex("hm_user_node_uniq").on(table.userId, table.hierarchyNodeId),
}));

export type HierarchyMembership = typeof hierarchyMembership.$inferSelect;
export type InsertHierarchyMembership = typeof hierarchyMembership.$inferInsert;

// ─── STAGE 3 ANALYTICS: TOPIC ENGAGEMENT ─────────────────────────────────────

export const topicEngagement = pgTable("topic_engagement", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  topic: varchar("topic", { length: 128 }).notNull(),
  topicType: varchar("topic_type", { length: 32 }).notNull(),
  contentId: varchar("content_id", { length: 128 }),
  durationSec: integer("duration_sec").default(0).notNull(),
  isSensitive: boolean("is_sensitive").default(false).notNull(),
  hierarchyNodeId: varchar("hierarchy_node_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("te_user_idx").on(table.userId),
  topicIdx: index("te_topic_idx").on(table.topic),
  nodeIdx: index("te_node_idx").on(table.hierarchyNodeId),
  createdIdx: index("te_created_idx").on(table.createdAt),
  sensitivePartialIdx: index("te_sensitive_partial_idx").on(table.isSensitive).where(sql`is_sensitive = true`),
}));

export type TopicEngagement = typeof topicEngagement.$inferSelect;
export type InsertTopicEngagement = typeof topicEngagement.$inferInsert;

export const topicEngagementDaily = pgTable("topic_engagement_daily", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hierarchyNodeId: varchar("hierarchy_node_id").notNull(),
  topic: varchar("topic", { length: 128 }).notNull(),
  topicType: varchar("topic_type", { length: 32 }).notNull(),
  date: varchar("date", { length: 10 }).notNull(),
  totalViews: integer("total_views").default(0).notNull(),
  totalDurationSec: integer("total_duration_sec").default(0).notNull(),
  uniqueUsers: integer("unique_users").default(0).notNull(),
  ageGroupBreakdown: jsonb("age_group_breakdown").$type<Record<string, number>>(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  nodeDateTopicTypeUniq: uniqueIndex("ted_node_date_topic_type_uniq").on(table.hierarchyNodeId, table.date, table.topic, table.topicType),
  dateIdx: index("ted_date_idx").on(table.date),
}));

export type TopicEngagementDaily = typeof topicEngagementDaily.$inferSelect;
export type InsertTopicEngagementDaily = typeof topicEngagementDaily.$inferInsert;

export const topicTrend = pgTable("topic_trend", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hierarchyNodeId: varchar("hierarchy_node_id").notNull(),
  topic: varchar("topic", { length: 128 }).notNull(),
  topicType: varchar("topic_type", { length: 32 }).notNull(),
  currentWeekViews: integer("current_week_views").default(0).notNull(),
  previousWeekViews: integer("previous_week_views").default(0).notNull(),
  trendPercent: real("trend_percent").default(0).notNull(),
  trendDirection: varchar("trend_direction", { length: 8 }).notNull().default("stable"),
  avgCompletionRate: real("avg_completion_rate").default(0),
  topAgeGroup: varchar("top_age_group", { length: 16 }),
  topAgeGroupCount: integer("top_age_group_count").default(0),
  weekStartDate: varchar("week_start_date", { length: 10 }).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  nodeWeekUniq: uniqueIndex("tt_node_week_topic_uniq").on(table.hierarchyNodeId, table.weekStartDate, table.topic),
  trendIdx: index("tt_trend_idx").on(table.trendPercent),
}));

export type TopicTrend = typeof topicTrend.$inferSelect;
export type InsertTopicTrend = typeof topicTrend.$inferInsert;

// ─── STAGE 3 ANALYTICS: PASTORAL CARE ────────────────────────────────────────

export const pastoralCareAlert = pgTable("pastoral_care_alert", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hierarchyNodeId: varchar("hierarchy_node_id").notNull(),
  alertType: varchar("alert_type", { length: 24 }).notNull(),
  severity: varchar("severity", { length: 16 }).notNull().default("MODERATE"),
  topic: varchar("topic", { length: 128 }).notNull(),
  memberCount: integer("member_count").default(0).notNull(),
  optedInMembers: jsonb("opted_in_members").$type<{ userId: string; displayName: string }[]>().default([]),
  isReviewed: boolean("is_reviewed").default(false).notNull(),
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  assignedTo: varchar("assigned_to"),
  notes: text("notes"),
  weekStartDate: varchar("week_start_date", { length: 10 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  nodeIdx: index("pca_node_idx").on(table.hierarchyNodeId),
  unreviewedIdx: index("pca_unreviewed_idx").on(table.isReviewed).where(sql`is_reviewed = false`),
  severityIdx: index("pca_severity_idx").on(table.severity),
  weekIdx: index("pca_week_idx").on(table.weekStartDate),
  dedupUniq: uniqueIndex("pca_dedup_uniq").on(table.hierarchyNodeId, table.alertType, table.topic, table.weekStartDate),
}));

export type PastoralCareAlert = typeof pastoralCareAlert.$inferSelect;
export type InsertPastoralCareAlert = typeof pastoralCareAlert.$inferInsert;

export const memberPastoralOptin = pgTable("member_pastoral_optin", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  hierarchyNodeId: varchar("hierarchy_node_id").notNull(),
  isOptedIn: boolean("is_opted_in").default(false).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userNodeUniq: uniqueIndex("mpo_user_node_uniq").on(table.userId, table.hierarchyNodeId),
}));

export type MemberPastoralOptin = typeof memberPastoralOptin.$inferSelect;
export type InsertMemberPastoralOptin = typeof memberPastoralOptin.$inferInsert;

// ─── STAGE 3 ANALYTICS: CACHING & GEO ────────────────────────────────────────

export const analyticsCache = pgTable("analytics_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hierarchyNodeId: varchar("hierarchy_node_id").notNull(),
  cacheType: varchar("cache_type", { length: 32 }).notNull(),
  timeRange: varchar("time_range", { length: 16 }).notNull(),
  data: jsonb("data").$type<Record<string, unknown>>().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  nodeTypeRangeUniq: uniqueIndex("ac_node_type_range_uniq").on(table.hierarchyNodeId, table.cacheType, table.timeRange),
  expiresIdx: index("ac_expires_idx").on(table.expiresAt),
}));

export type AnalyticsCache = typeof analyticsCache.$inferSelect;
export type InsertAnalyticsCache = typeof analyticsCache.$inferInsert;

export const userLocation = pgTable("user_location", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  hierarchyNodeId: varchar("hierarchy_node_id"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userUniq: uniqueIndex("ul_user_uniq").on(table.userId),
  nodeIdx: index("ul_node_idx").on(table.hierarchyNodeId),
}));

export type UserLocation = typeof userLocation.$inferSelect;
export type InsertUserLocation = typeof userLocation.$inferInsert;

export const heatmapTile = pgTable("heatmap_tile", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hierarchyNodeId: varchar("hierarchy_node_id").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  engagementCount: integer("engagement_count").default(0).notNull(),
  engagementScore: integer("engagement_score").default(0).notNull(),
  regionKey: varchar("region_key", { length: 128 }).notNull(),
  regionLevel: varchar("region_level", { length: 24 }).notNull().default("country"),
  timeRange: varchar("time_range", { length: 16 }).notNull().default("month"),
  userCount: integer("user_count").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  nodeRegionUniq: uniqueIndex("ht_node_region_range_uniq").on(table.hierarchyNodeId, table.regionKey, table.timeRange),
  nodeIdx: index("ht_node_idx").on(table.hierarchyNodeId),
  regionLevelIdx: index("ht_region_level_idx").on(table.regionLevel),
}));

export type HeatmapTile = typeof heatmapTile.$inferSelect;
export type InsertHeatmapTile = typeof heatmapTile.$inferInsert;

export const activityPatternTile = pgTable("activity_pattern_tile", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hierarchyNodeId: varchar("hierarchy_node_id").notNull(),
  dayOfWeek: smallint("day_of_week").notNull(),
  timeBlock: smallint("time_block").notNull(),
  engagementCount: integer("engagement_count").default(0).notNull(),
  engagementScore: integer("engagement_score").default(0).notNull(),
  timeRange: varchar("time_range", { length: 16 }).notNull().default("month"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  nodeDayBlockUniq: uniqueIndex("apt_node_day_block_range_uniq").on(table.hierarchyNodeId, table.dayOfWeek, table.timeBlock, table.timeRange),
  nodeIdx: index("apt_node_idx").on(table.hierarchyNodeId),
}));

export type ActivityPatternTile = typeof activityPatternTile.$inferSelect;
export type InsertActivityPatternTile = typeof activityPatternTile.$inferInsert;

// ─── STAGE 3 ANALYTICS: BROADCASTS ───────────────────────────────────────────

export const hierarchyBroadcast = pgTable("hierarchy_broadcast", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderNodeId: varchar("sender_node_id").notNull(),
  senderUserId: varchar("sender_user_id").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  targetTier: smallint("target_tier"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  senderIdx: index("hb_sender_idx").on(table.senderNodeId),
  createdIdx: index("hb_created_idx").on(table.createdAt),
}));

export type HierarchyBroadcast = typeof hierarchyBroadcast.$inferSelect;
export type InsertHierarchyBroadcast = typeof hierarchyBroadcast.$inferInsert;

export const hierarchyBroadcastReceipt = pgTable("hierarchy_broadcast_receipt", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  broadcastId: varchar("broadcast_id").notNull(),
  recipientNodeId: varchar("recipient_node_id").notNull(),
  recipientUserId: varchar("recipient_user_id").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  readAt: timestamp("read_at"),
}, (table) => ({
  broadcastIdx: index("hbr_broadcast_idx").on(table.broadcastId),
  recipientIdx: index("hbr_recipient_idx").on(table.recipientUserId),
  unreadPartialIdx: index("hbr_unread_idx").on(table.isRead).where(sql`is_read = false`),
}));

export type HierarchyBroadcastReceipt = typeof hierarchyBroadcastReceipt.$inferSelect;
export type InsertHierarchyBroadcastReceipt = typeof hierarchyBroadcastReceipt.$inferInsert;

// ─── CONTENT TRANSLATIONS CACHE ──────────────────────────────────────────────
// Stores AI-generated translations permanently so each string is only translated once.

export const contentTranslations = pgTable(
  "content_translations",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    contentKey: varchar("content_key", { length: 64 }).notNull(),
    langCode: varchar("lang_code", { length: 10 }).notNull(),
    originalText: text("original_text").notNull(),
    translatedText: text("translated_text").notNull(),
    translatedAt: timestamp("translated_at").defaultNow().notNull(),
  },
  (table) => ({
    keyLangUniq: uniqueIndex("ct_key_lang_uniq").on(table.contentKey, table.langCode),
    langIdx: index("ct_lang_idx").on(table.langCode),
  })
);

export type ContentTranslation = typeof contentTranslations.$inferSelect;
export type InsertContentTranslation = typeof contentTranslations.$inferInsert;

// ─── EGW LOCAL CHAPTERS (ingested from public-domain EPUBs) ───────────────────

export const egwChapters = pgTable(
  "egw_chapters",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    book: text("book").notNull(),
    bookSlug: varchar("book_slug", { length: 64 }).notNull(),
    chapterNumber: integer("chapter_number").notNull(),
    chapterTitle: text("chapter_title").notNull(),
    paragraphs: jsonb("paragraphs").$type<string[]>().notNull(),
    ingestedAt: timestamp("ingested_at").defaultNow().notNull(),
  },
  (table) => ({
    slugChapterUniq: uniqueIndex("egw_chapters_slug_chapter_uniq").on(
      table.bookSlug,
      table.chapterNumber,
    ),
    slugIdx: index("egw_chapters_slug_idx").on(table.bookSlug),
  }),
);

export type EgwChapter = typeof egwChapters.$inferSelect;
export type InsertEgwChapter = typeof egwChapters.$inferInsert;
