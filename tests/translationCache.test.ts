import { describe, expect, test } from "vitest";

import { shouldReuseCachedTranslation } from "../src/shared/translationCache";

describe("translation cache reuse", () => {
  test("does not reuse google fallback data under llm requests", () => {
    expect(
      shouldReuseCachedTranslation(
        {
          translation: "Google fallback",
          provider: "google-web",
          updatedAt: Date.now(),
        },
        "llm",
      ),
    ).toBe(false);
  });

  test("requires contextual part of speech when requested", () => {
    expect(
      shouldReuseCachedTranslation(
        {
          translation: "语境翻译",
          provider: "llm",
          updatedAt: Date.now(),
        },
        "llm",
        { requireContextualPartOfSpeech: true },
      ),
    ).toBe(false);
  });

  test("reuses matching llm cache entries when they have contextual metadata", () => {
    expect(
      shouldReuseCachedTranslation(
        {
          translation: "语境翻译",
          contextualPartOfSpeech: "v.",
          provider: "llm",
          updatedAt: Date.now(),
        },
        "llm",
        { requireContextualPartOfSpeech: true },
      ),
    ).toBe(true);
  });
});
