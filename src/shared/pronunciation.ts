import { lookupRank } from "./lexicon";
import { getLemmaCandidates } from "./normalize";
import type { PronunciationAccent, PronunciationResult } from "./types";

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

type PronunciationData = Omit<PronunciationResult, "cached">;
type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<{
  ok: boolean;
  json(): Promise<unknown>;
  text(): Promise<string>;
}>;

const PRONUNCIATION_REQUEST_TIMEOUT_MS = 2500;
const DICTIONARY_API_BASE_URL = "https://api.dictionaryapi.dev/api/v2/entries/en";
const WIKTIONARY_RAW_PAGE_URL = "https://en.wiktionary.org/w/index.php?action=raw&title=";
const WIKIMEDIA_FILE_PATH_URL = "https://commons.wikimedia.org/wiki/Special:FilePath/";

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

function countDistinctSignals(values: Array<string | undefined>): number {
  return new Set(values.filter((value): value is string => Boolean(value))).size;
}

function getPronunciationStrength(result: PronunciationData): number {
  const phonetics = countDistinctSignals([result.ukPhonetic, result.usPhonetic]);
  const audios = countDistinctSignals([result.ukAudioUrl, result.usAudioUrl]);

  return (phonetics > 0 ? 100 : 0) + phonetics * 10 + audios;
}

function hasPronunciationData(result: PronunciationData): boolean {
  return getPronunciationStrength(result) > 0;
}

function hasPhoneticData(result: PronunciationData): boolean {
  return Boolean(result.ukPhonetic || result.usPhonetic);
}

function pickBetterPronunciation(
  left: PronunciationData | null,
  right: PronunciationData | null,
): PronunciationData | null {
  if (!left) {
    return right;
  }

  if (!right) {
    return left;
  }

  return getPronunciationStrength(right) > getPronunciationStrength(left) ? right : left;
}

function mergePronunciationData(
  primary: PronunciationData,
  fallback: PronunciationData,
): PronunciationData {
  const primaryLooksGeneric =
    Boolean(primary.ukPhonetic) &&
    primary.ukPhonetic === primary.usPhonetic;

  return {
    ukPhonetic: primaryLooksGeneric
      ? fallback.ukPhonetic ?? primary.ukPhonetic
      : primary.ukPhonetic ?? fallback.ukPhonetic,
    usPhonetic: primaryLooksGeneric
      ? fallback.usPhonetic ?? primary.usPhonetic
      : primary.usPhonetic ?? fallback.usPhonetic,
    ukAudioUrl: primary.ukAudioUrl ?? fallback.ukAudioUrl,
    usAudioUrl: primary.usAudioUrl ?? fallback.usAudioUrl,
  };
}

function scorePronunciationCandidate(candidate: string, index: number): number {
  let score = -index;

  if (lookupRank(candidate) !== null) {
    score += 100;
  }

  if (candidate.endsWith("fe")) {
    score += 15;
  } else if (/[eyf]$/.test(candidate)) {
    score += 10;
  }

  return score;
}

export function buildPronunciationCandidates(surface: string): string[] {
  const candidates = getLemmaCandidates(surface);

  if (!candidates.length) {
    return [];
  }

  const [exact, ...variants] = candidates;

  return [
    exact,
    ...variants
      .map((candidate, index) => ({
        candidate,
        index,
        score: scorePronunciationCandidate(candidate, index),
      }))
      .sort((left, right) => right.score - left.score || left.index - right.index)
      .map((item) => item.candidate),
  ].filter((candidate, index, values) => values.indexOf(candidate) === index).slice(0, 4);
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

export function extractBestPronunciationEntry(entries: DictionaryEntryLike[]): PronunciationData {
  let best: PronunciationData | null = null;

  for (const entry of entries) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    best = pickBetterPronunciation(best, extractPronunciation(entry));
  }

  return best ?? {};
}

function getHeadingLevel(line: string): number | null {
  const match = line.match(/^(=+)[^=].*[^=]\1$/);
  return match ? match[1].length : null;
}

function extractNamedSection(content: string, heading: string, level: number): string {
  const targetHeading = `${"=".repeat(level)}${heading}${"=".repeat(level)}`;
  const lines = content.split(/\r?\n/);
  let collecting = false;
  const sectionLines: string[] = [];

  for (const line of lines) {
    if (!collecting) {
      if (line.trim() === targetHeading) {
        collecting = true;
      }

      continue;
    }

    const headingLevel = getHeadingLevel(line.trim());

    if (headingLevel !== null && headingLevel <= level) {
      break;
    }

    sectionLines.push(line);
  }

  return sectionLines.join("\n").trim();
}

function parseTemplateFields(body: string): {
  positional: string[];
  named: Map<string, string>;
} {
  const positional: string[] = [];
  const named = new Map<string, string>();

  for (const segment of body.split("|").map((part) => part.trim()).filter(Boolean)) {
    const separatorIndex = segment.indexOf("=");

    if (separatorIndex > 0) {
      named.set(
        segment.slice(0, separatorIndex).trim(),
        segment.slice(separatorIndex + 1).trim(),
      );
      continue;
    }

    positional.push(segment);
  }

  return { positional, named };
}

function resolveWiktionaryAccentHint(value: string | undefined): PronunciationAccent | undefined {
  const normalized = (value ?? "").trim().toLowerCase();

  if (!normalized) {
    return undefined;
  }

  if (/\b(us|u\.s\.|ga|general american|american|canada|canadian)\b/.test(normalized)) {
    return "en-US";
  }

  if (/\b(uk|u\.k\.|rp|british|gb|england|southern england|received pronunciation)\b/.test(normalized)) {
    return "en-GB";
  }

  return undefined;
}

function extractInlineAccentHint(line: string): string | undefined {
  const matches = [...line.matchAll(/\{\{a\|([^{}]+?)\}\}/g)]
    .map((match) => match[1]?.trim())
    .filter(Boolean);

  return matches.length ? matches.join(", ") : undefined;
}

function toWikimediaFileUrl(fileName: string): string {
  return `${WIKIMEDIA_FILE_PATH_URL}${encodeURIComponent(fileName.trim())}`;
}

export function extractPronunciationFromWiktionaryRaw(raw: string): PronunciationData {
  const englishSection = extractNamedSection(raw, "English", 2);

  if (!englishSection) {
    return {};
  }

  const pronunciationSection = extractNamedSection(englishSection, "Pronunciation", 3);

  if (!pronunciationSection) {
    return {};
  }

  let genericPhonetic: string | undefined;
  let ukPhonetic: string | undefined;
  let usPhonetic: string | undefined;
  let genericAudioUrl: string | undefined;
  let ukAudioUrl: string | undefined;
  let usAudioUrl: string | undefined;

  for (const line of pronunciationSection.split(/\r?\n/)) {
    const inlineAccentHint = extractInlineAccentHint(line);

    for (const match of line.matchAll(/\{\{IPA\|en\|([^{}]+?)\}\}/g)) {
      const { positional, named } = parseTemplateFields(match[1] ?? "");
      const accent = resolveWiktionaryAccentHint(named.get("a") ?? inlineAccentHint);
      const phonetic = positional
        .map((value) => normalizePhoneticText(value))
        .find((value): value is string => Boolean(value));

      if (!phonetic) {
        continue;
      }

      if (accent === "en-GB") {
        ukPhonetic ??= phonetic;
      } else if (accent === "en-US") {
        usPhonetic ??= phonetic;
      } else {
        genericPhonetic ??= phonetic;
      }
    }

    for (const match of line.matchAll(/\{\{audio(?:-IPA)?\|en\|([^{}]+?)\}\}/g)) {
      const { positional, named } = parseTemplateFields(match[1] ?? "");
      const fileName = positional[0]?.trim();

      if (!fileName) {
        continue;
      }

      const accent = resolveWiktionaryAccentHint(
        named.get("a") ?? positional.slice(1).join(", ") ?? inlineAccentHint,
      );
      const audioUrl = toWikimediaFileUrl(fileName);

      if (accent === "en-GB") {
        ukAudioUrl ??= audioUrl;
      } else if (accent === "en-US") {
        usAudioUrl ??= audioUrl;
      } else {
        genericAudioUrl ??= audioUrl;
      }
    }
  }

  return {
    ukPhonetic: ukPhonetic ?? genericPhonetic,
    usPhonetic: usPhonetic ?? genericPhonetic,
    ukAudioUrl: ukAudioUrl ?? genericAudioUrl,
    usAudioUrl: usAudioUrl ?? genericAudioUrl,
  };
}

async function fetchWithTimeout(
  fetchFn: FetchLike,
  input: string,
): Promise<Awaited<ReturnType<FetchLike>> | null> {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => {
    controller.abort();
  }, PRONUNCIATION_REQUEST_TIMEOUT_MS);

  try {
    return await fetchFn(input, { signal: controller.signal });
  } catch {
    return null;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

async function lookupDictionaryApiPronunciation(
  query: string,
  fetchFn: FetchLike,
): Promise<PronunciationData | null> {
  const response = await fetchWithTimeout(
    fetchFn,
    `${DICTIONARY_API_BASE_URL}/${encodeURIComponent(query)}`,
  );

  if (!response?.ok) {
    return null;
  }

  const payload = await response.json().catch(() => null);

  if (!Array.isArray(payload)) {
    return null;
  }

  const result = extractBestPronunciationEntry(payload as DictionaryEntryLike[]);

  return hasPronunciationData(result) ? result : null;
}

async function lookupWiktionaryPronunciation(
  query: string,
  fetchFn: FetchLike,
): Promise<PronunciationData | null> {
  const response = await fetchWithTimeout(
    fetchFn,
    `${WIKTIONARY_RAW_PAGE_URL}${encodeURIComponent(query)}`,
  );

  if (!response?.ok) {
    return null;
  }

  const raw = await response.text().catch(() => "");

  if (!raw.trim()) {
    return null;
  }

  const result = extractPronunciationFromWiktionaryRaw(raw);

  return hasPronunciationData(result) ? result : null;
}

interface PronunciationLookupHit {
  candidateIndex: number;
  query: string;
  result: PronunciationData;
}

function pickBetterPronunciationHit(
  left: PronunciationLookupHit | null,
  right: PronunciationLookupHit | null,
): PronunciationLookupHit | null {
  if (!left) {
    return right;
  }

  if (!right) {
    return left;
  }

  const leftScore = getPronunciationStrength(left.result) * 10 - left.candidateIndex;
  const rightScore = getPronunciationStrength(right.result) * 10 - right.candidateIndex;

  return rightScore > leftScore ? right : left;
}

export async function lookupBestPronunciation(
  surface: string,
  fetchFn: FetchLike = fetch,
): Promise<PronunciationData> {
  const candidates = buildPronunciationCandidates(surface);

  if (!candidates.length) {
    return {};
  }

  const dictionaryHits = (await Promise.all(candidates.map(async (query, candidateIndex) => {
    const result = await lookupDictionaryApiPronunciation(query, fetchFn);

    return result
      ? {
        candidateIndex,
        query,
        result,
      }
      : null;
  }))).filter((item): item is PronunciationLookupHit => Boolean(item));

  let bestDictionary: PronunciationLookupHit | null = null;

  for (const hit of dictionaryHits) {
    bestDictionary = pickBetterPronunciationHit(bestDictionary, hit);
  }

  if (bestDictionary && hasPhoneticData(bestDictionary.result)) {
    const wiktionaryResult = await lookupWiktionaryPronunciation(bestDictionary.query, fetchFn);

    return wiktionaryResult
      ? mergePronunciationData(bestDictionary.result, wiktionaryResult)
      : bestDictionary.result;
  }

  const wiktionaryHits = (await Promise.all(candidates.map(async (query, candidateIndex) => {
    const result = await lookupWiktionaryPronunciation(query, fetchFn);

    return result
      ? {
        candidateIndex,
        query,
        result,
      }
      : null;
  }))).filter((item): item is PronunciationLookupHit => Boolean(item));

  let bestResult = bestDictionary;

  for (const hit of wiktionaryHits) {
    bestResult = pickBetterPronunciationHit(bestResult, hit);
  }

  return bestResult?.result ?? {};
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
