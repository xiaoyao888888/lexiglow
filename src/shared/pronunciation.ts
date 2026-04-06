import type { PronunciationAccent } from "./types";

export interface TtsVoiceLike {
  voiceName?: string;
  lang?: string;
  remote?: boolean;
  eventTypes?: string[];
}

export interface DictionaryPhoneticLike {
  text?: string;
  audio?: string;
  sourceUrl?: string;
}

export interface DictionaryEntryLike {
  phonetic?: string;
  phonetics?: DictionaryPhoneticLike[];
}

function normalizeLang(lang: string | undefined): string {
  return (lang ?? "").trim().toLowerCase();
}

function normalizeVoiceName(voiceName: string | undefined): string {
  return (voiceName ?? "").trim().toLowerCase();
}

function exactLangAliases(accent: PronunciationAccent): string[] {
  return accent === "en-GB"
    ? ["en-gb", "en_gb", "en-gb-x-gb", "en-gb-oed", "en-uk"]
    : ["en-us", "en_us", "en-us-x-us", "en-us-x-tpd"];
}

function voiceNameRegex(accent: PronunciationAccent): RegExp {
  return accent === "en-GB"
    ? /\b(english\s*\(?uk\)?|british|great britain|united kingdom|en-gb|en_gb|uk)\b/i
    : /\b(english\s*\(?us\)?|american|united states|en-us|en_us|us)\b/i;
}

function preferredVoicePatterns(accent: PronunciationAccent): RegExp[] {
  return accent === "en-GB"
    ? [/\bdaniel\b/i, /\breed\b/i, /\brocko\b/i, /\beddy\b/i]
    : [/\breed\b/i, /\beddy\b/i, /\brocko\b/i, /\balex\b/i, /\bralph\b/i, /\bfred\b/i];
}

const NOVELTY_VOICE_PATTERNS = [
  /\bbad news\b/i,
  /\bbahh\b/i,
  /\bbells\b/i,
  /\bboing\b/i,
  /\bbubbles\b/i,
  /\bcellos\b/i,
  /\bgood news\b/i,
  /\bjester\b/i,
  /\borgan\b/i,
  /\bsuperstar\b/i,
  /\btrinoids\b/i,
  /\bwhisper\b/i,
  /\bwobble\b/i,
  /\bzarvox\b/i,
];

function matchesAccent(voice: TtsVoiceLike, accent: PronunciationAccent): boolean {
  const lang = normalizeLang(voice.lang);
  const voiceName = normalizeVoiceName(voice.voiceName);

  if (exactLangAliases(accent).some((alias) => lang.includes(alias))) {
    return true;
  }

  return voiceNameRegex(accent).test(voiceName);
}

function scoreVoice(voice: TtsVoiceLike, accent: PronunciationAccent): number {
  const lang = normalizeLang(voice.lang);
  const voiceName = normalizeVoiceName(voice.voiceName);
  let score = 0;

  if (!voice.remote) {
    score += 120;
  }

  if (exactLangAliases(accent).some((alias) => lang === alias || lang.startsWith(`${alias}-`))) {
    score += 220;
  } else if (matchesAccent(voice, accent)) {
    score += 120;
  }

  const preferredIndex = preferredVoicePatterns(accent).findIndex((pattern) => pattern.test(voiceName));

  if (preferredIndex >= 0) {
    score += 300 - preferredIndex * 20;
  }

  if (NOVELTY_VOICE_PATTERNS.some((pattern) => pattern.test(voiceName))) {
    score -= 500;
  }

  return score;
}

function isEnglishVoice(voice: TtsVoiceLike): boolean {
  const lang = normalizeLang(voice.lang);
  const voiceName = normalizeVoiceName(voice.voiceName);

  return lang.startsWith("en") || voiceName.includes("english");
}

function normalizePhoneticText(value: string | undefined): string | undefined {
  const compact = (value ?? "").trim();

  if (!compact) {
    return undefined;
  }

  if (compact.startsWith("/") && compact.endsWith("/")) {
    return compact;
  }

  return `/${compact.replace(/^\/+|\/+$/g, "")}/`;
}

function markerRegex(accent: PronunciationAccent): RegExp {
  return accent === "en-GB"
    ? /(^|[^a-z])(uk|gb|british|united-kingdom|great-britain)([^a-z]|$)/i
    : /(^|[^a-z])(us|american|united-states)([^a-z]|$)/i;
}

function pickAccentPhonetic(
  phonetics: DictionaryPhoneticLike[],
  accent: PronunciationAccent,
): string | undefined {
  const withText = phonetics.filter((item) => typeof item.text === "string" && item.text.trim());
  const matched = withText.find((item) =>
    markerRegex(accent).test(`${item.audio ?? ""} ${item.sourceUrl ?? ""}`.toLowerCase()),
  );

  if (matched) {
    return normalizePhoneticText(matched.text);
  }

  return undefined;
}

export function extractPronunciation(entry: DictionaryEntryLike): {
  ukPhonetic?: string;
  usPhonetic?: string;
  ukAudioUrl?: string;
  usAudioUrl?: string;
} {
  const phonetics = Array.isArray(entry.phonetics) ? entry.phonetics : [];
  const generic = normalizePhoneticText(
    typeof entry.phonetic === "string"
      ? entry.phonetic
      : phonetics.find((item) => typeof item.text === "string" && item.text.trim())?.text,
  );

  const ukPhonetic = pickAccentPhonetic(phonetics, "en-GB") ?? generic;
  const usPhonetic = pickAccentPhonetic(phonetics, "en-US") ?? generic;
  const ukAudioUrl = phonetics.find((item) =>
    typeof item.audio === "string" &&
    item.audio.trim() &&
    markerRegex("en-GB").test(`${item.audio ?? ""} ${item.sourceUrl ?? ""}`.toLowerCase()),
  )?.audio?.trim();
  const usAudioUrl = phonetics.find((item) =>
    typeof item.audio === "string" &&
    item.audio.trim() &&
    markerRegex("en-US").test(`${item.audio ?? ""} ${item.sourceUrl ?? ""}`.toLowerCase()),
  )?.audio?.trim();

  return {
    ukPhonetic,
    usPhonetic,
    ukAudioUrl: ukAudioUrl || undefined,
    usAudioUrl: usAudioUrl || undefined,
  };
}

export function hasEnglishVoice(voices: TtsVoiceLike[]): boolean {
  return voices.some(isEnglishVoice);
}

export function selectVoiceForAccent(
  voices: TtsVoiceLike[],
  accent: PronunciationAccent,
): TtsVoiceLike | null {
  const englishVoices = voices.filter((voice) => isEnglishVoice(voice) && matchesAccent(voice, accent));

  if (!englishVoices.length) {
    return null;
  }

  return [...englishVoices].sort((left, right) => scoreVoice(right, accent) - scoreVoice(left, accent))[0] ?? null;
}
