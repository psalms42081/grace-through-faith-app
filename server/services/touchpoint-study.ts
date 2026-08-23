import { createHash } from "node:crypto";
import { ZodError } from "zod";
import {
  generatedStudyDraftSchema,
  touchpointGeneratedStudySchema,
  TOUCHPOINT_STUDY_SCHEMA_VERSION,
  TOUCHPOINT_STUDY_TRANSLATION_CONTRACT_VERSION,
  type GeneratedStudyDraft,
  type TouchpointGeneratedStudy,
} from "../../shared/touchpoint-study";
import type { TouchPointTopic } from "../data/touchpoints";
import type {
  HydratedVerse,
  TranslationMetaBlock,
} from "./touchpoint-scripture";

export class GeneratedStudyValidationError extends Error {
  readonly statusCode = 502;

  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "GeneratedStudyValidationError";
  }
}

function validationError(context: string, error: ZodError): GeneratedStudyValidationError {
  const fields = error.issues
    .slice(0, 5)
    .map((issue) => `${issue.path.join(".") || "payload"}: ${issue.message}`)
    .join("; ");
  return new GeneratedStudyValidationError(`${context} failed schema validation: ${fields}`, error);
}

export function parseGeneratedStudyDraft(content: string): GeneratedStudyDraft {
  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch (error) {
    throw new GeneratedStudyValidationError("Generated study was not valid JSON", error);
  }

  const parsed = generatedStudyDraftSchema.safeParse(json);
  if (!parsed.success) {
    throw validationError("Generated study", parsed.error);
  }
  return parsed.data;
}

export function parseCachedTouchpointStudy(payload: unknown): TouchpointGeneratedStudy | null {
  const parsed = touchpointGeneratedStudySchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}

export function attachCanonicalScripture(params: {
  draft: GeneratedStudyDraft;
  byRef: Map<string, HydratedVerse>;
  translationMeta: TranslationMetaBlock;
  resolveSelection: (selectedRef: string, byRef: Map<string, HydratedVerse>) => HydratedVerse;
}): TouchpointGeneratedStudy {
  const { draft, byRef, translationMeta, resolveSelection } = params;
  const candidate = {
    ...draft,
    sections: draft.sections.map((section) => {
      const canonical = resolveSelection(section.scripture, byRef);
      return {
        ...section,
        scripture: canonical.ref,
        scriptureText: canonical.text,
        translation: canonical.translation,
        translationName: canonical.translationName,
        source: canonical.source,
        provider: canonical.provider,
        ...(canonical.providerEditionId
          ? { providerEditionId: canonical.providerEditionId }
          : {}),
        resolved: true as const,
      };
    }),
    translation: translationMeta.translation,
    translationName: translationMeta.translationName,
    source: translationMeta.source,
    provider: translationMeta.provider,
    ...(translationMeta.providerEditionId
      ? { providerEditionId: translationMeta.providerEditionId }
      : {}),
    scriptureResolution: "resolved" as const,
    contentVersion: TOUCHPOINT_STUDY_SCHEMA_VERSION,
  };

  const parsed = touchpointGeneratedStudySchema.safeParse(candidate);
  if (!parsed.success) {
    throw validationError("Canonical generated study", parsed.error);
  }
  return parsed.data;
}

export interface TouchpointStudyCacheIdentity {
  topic: TouchPointTopic;
  translationMeta: TranslationMetaBlock;
  promptRequest: unknown;
  sdaLensVersion: string;
  translationContractVersion?: string;
}

/**
 * Fingerprints every input that can change generated-study meaning. The short
 * prefix plus SHA-256 digest fits search_cache.query_hash's 64-character limit.
 */
export function buildTouchpointStudyCacheKey(
  identity: TouchpointStudyCacheIdentity
): string {
  const fingerprint = JSON.stringify({
    studySchemaVersion: TOUCHPOINT_STUDY_SCHEMA_VERSION,
    translationContractVersion:
      identity.translationContractVersion ??
      TOUCHPOINT_STUDY_TRANSLATION_CONTRACT_VERSION,
    sdaLensVersion: identity.sdaLensVersion,
    topic: identity.topic,
    translationMeta: identity.translationMeta,
    promptRequest: identity.promptRequest,
  });
  const digest = createHash("sha256").update(fingerprint).digest("hex");
  return `tps:${digest.slice(0, 60)}`;
}