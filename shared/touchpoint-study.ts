import { z } from "zod";

/**
 * Generated-study response contract. Bump the schema version when the public
 * payload shape changes, and the translation contract version when canonical
 * Scripture resolution/metadata semantics change.
 */
export const TOUCHPOINT_STUDY_SCHEMA_VERSION = "study-schema-v1";
export const TOUCHPOINT_STUDY_TRANSLATION_CONTRACT_VERSION = "canonical-scripture-v2";
export const TOUCHPOINT_STUDY_CLIENT_STALE_TIME_MS = 6 * 60 * 60 * 1000;

const nonEmptyText = z.string().trim().min(1);
const translationSourceSchema = z.enum(["db", "nlt_provider", "api_bible", "unknown"]);

export const generatedStudyDraftSchema = z.object({
  title: nonEmptyText,
  introduction: nonEmptyText,
  sections: z.array(
    z.object({
      heading: nonEmptyText,
      scripture: nonEmptyText,
      teaching: nonEmptyText,
      reflection: nonEmptyText,
    }).strict()
  ).min(3).max(5),
  conclusion: nonEmptyText,
  prayerPrompt: nonEmptyText,
  groupDiscussion: z.array(nonEmptyText).min(3).max(4),
}).strict();

export const resolvedStudySectionSchema = z.object({
  heading: nonEmptyText,
  scripture: nonEmptyText,
  scriptureText: nonEmptyText,
  teaching: nonEmptyText,
  reflection: nonEmptyText,
  translation: nonEmptyText,
  translationName: nonEmptyText,
  source: translationSourceSchema,
  provider: nonEmptyText,
  providerEditionId: nonEmptyText.optional(),
  resolved: z.literal(true),
}).strict();

export const touchpointGeneratedStudySchema = z.object({
  title: nonEmptyText,
  introduction: nonEmptyText,
  sections: z.array(resolvedStudySectionSchema).min(3).max(5),
  conclusion: nonEmptyText,
  prayerPrompt: nonEmptyText,
  groupDiscussion: z.array(nonEmptyText).min(3).max(4),
  translation: nonEmptyText,
  translationName: nonEmptyText,
  source: translationSourceSchema,
  provider: nonEmptyText,
  providerEditionId: nonEmptyText.optional(),
  scriptureResolution: z.literal("resolved"),
  contentVersion: z.literal(TOUCHPOINT_STUDY_SCHEMA_VERSION),
}).strict();

export type GeneratedStudyDraft = z.infer<typeof generatedStudyDraftSchema>;
export type TouchpointGeneratedStudy = z.infer<typeof touchpointGeneratedStudySchema>;