import { YOUVERSION_CODE_IN_TEXT } from "../../shared/youversion";

export class YouVersionInAiRequestError extends Error {
  constructor() {
    super("YouVersion Scripture may not be sent to an AI model");
    this.name = "YouVersionInAiRequestError";
  }
}

/** Throws when a serialized AI request names a YouVersion version. */
export function assertNoYouVersionInAiRequest(body: unknown): void {
  if (typeof body === "string" && YOUVERSION_CODE_IN_TEXT.test(body)) {
    throw new YouVersionInAiRequestError();
  }
}

/**
 * `fetch` for every OpenAI client. AI features read the local KJV only; YouVersion
 * text and version ids must never leave the server towards a model.
 */
export const aiRequestFetch: typeof fetch = async (input, init) => {
  assertNoYouVersionInAiRequest(init?.body);
  return fetch(input, init);
};
