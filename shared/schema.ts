import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

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

export const devotionalPlans = pgTable("devotional_plan", {
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
  isPublished: boolean("is_published").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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

export const userPlanEnrollments = pgTable(
  "user_plan_enrollment",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id),
    planId: varchar("plan_id")
      .notNull()
      .references(() => devotionalPlans.id),
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
      .notNull()
      .references(() => users.id),
    storyId: varchar("story_id")
      .notNull()
      .references(() => kidsStories.id),
    completed: boolean("completed").default(false),
    quizScore: integer("quiz_score"),
    memoryVerseMemorized: boolean("memory_verse_memorized").default(false),
    completedAt: timestamp("completed_at"),
  },
  (table) => ({
    userStoryUnique: uniqueIndex("kids_progress_user_story").on(
      table.userId,
      table.storyId
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
      .notNull()
      .references(() => users.id),
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
    .notNull()
    .references(() => users.id),
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  lastActivityDate: text("last_activity_date"),
});

export type KidsCollection = typeof kidsCollections.$inferSelect;
export type KidsStory = typeof kidsStories.$inferSelect;
export type KidsQuizQuestion = typeof kidsQuizQuestions.$inferSelect;
export type KidsProgress = typeof kidsProgress.$inferSelect;
export type KidsBadge = typeof kidsBadges.$inferSelect;
export type KidsUserBadge = typeof kidsUserBadges.$inferSelect;
export type KidsStreak = typeof kidsStreaks.$inferSelect;
