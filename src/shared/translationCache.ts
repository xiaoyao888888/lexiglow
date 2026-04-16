import type { TranslationProviderChoice } from "./messages";
import type { CacheEntry } from "./types";

export function shouldReuseCachedTranslation(
  cached: CacheEntry | null,
  provider: TranslationProviderChoice,
  options?: {
    requireContextualPartOfSpeech?: boolean;
  },
): boolean {
  if (!cached?.translation) {
    return false;
  }

  if (provider === "llm" && cached.provider !== "llm") {
    return false;
  }

  if (options?.requireContextualPartOfSpeech && !cached.contextualPartOfSpeech) {
    return false;
  }

  return true;
}
