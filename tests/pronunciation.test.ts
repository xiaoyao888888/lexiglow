import { afterEach, describe, expect, test, vi } from "vitest";

import {
  buildPronunciationCandidates,
  extractPronunciation,
  extractPronunciationFromWiktionaryRaw,
  hasEnglishVoice,
  lookupBestPronunciation,
  selectVoiceForAccent,
} from "../src/shared/pronunciation";

afterEach(() => {
  vi.restoreAllMocks();
});

function jsonResponse(payload: unknown, ok = true) {
  return {
    ok,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  };
}

function textResponse(payload: string, ok = true) {
  return {
    ok,
    json: async () => null,
    text: async () => payload,
  };
}

describe("selectVoiceForAccent", () => {
  test("prefers exact british voices", () => {
    const voice = selectVoiceForAccent(
      [
        { voiceName: "English US", lang: "en-US", remote: false },
        { voiceName: "English UK", lang: "en-GB", remote: false },
      ],
      "en-GB",
    );

    expect(voice?.lang).toBe("en-GB");
  });

  test("prefers exact american voices", () => {
    const voice = selectVoiceForAccent(
      [
        { voiceName: "English UK", lang: "en-GB", remote: false },
        { voiceName: "English US", lang: "en-US", remote: false },
      ],
      "en-US",
    );

    expect(voice?.lang).toBe("en-US");
  });

  test("does not fall back to a mismatched accent", () => {
    expect(
      selectVoiceForAccent(
        [
          { voiceName: "English UK", lang: "en-GB", remote: false },
          { voiceName: "English AU", lang: "en-AU", remote: false },
        ],
        "en-US",
      ),
    ).toBeNull();
  });

  test("returns null when no english voice exists", () => {
    expect(
      selectVoiceForAccent(
        [{ voiceName: "Deutsch", lang: "de-DE", remote: false }],
        "en-US",
      ),
    ).toBeNull();
  });

  test("detects whether any english voice exists", () => {
    expect(hasEnglishVoice([{ voiceName: "English UK", lang: "en-GB" }])).toBe(true);
    expect(hasEnglishVoice([{ voiceName: "Deutsch", lang: "de-DE" }])).toBe(false);
  });

  test("does not mistake australian voice names for american voices", () => {
    expect(
      selectVoiceForAccent(
        [{ voiceName: "Australian Karen", lang: "en-AU", remote: false }],
        "en-US",
      ),
    ).toBeNull();
  });

  test("prefers natural american voices over novelty voices", () => {
    const voice = selectVoiceForAccent(
      [
        { voiceName: "Whisper", lang: "en-US", remote: false },
        { voiceName: "Reed", lang: "en-US", remote: false },
      ],
      "en-US",
    );

    expect(voice?.voiceName).toBe("Reed");
  });

  test("prefers daniel for british voice when available", () => {
    const voice = selectVoiceForAccent(
      [
        { voiceName: "Daniel", lang: "en-GB", remote: false },
        { voiceName: "Sandy", lang: "en-GB", remote: false },
      ],
      "en-GB",
    );

    expect(voice?.voiceName).toBe("Daniel");
  });

  test("prefers male american voices when available", () => {
    const voice = selectVoiceForAccent(
      [
        { voiceName: "Alex", lang: "en-US", remote: false },
        { voiceName: "Kathy", lang: "en-US", remote: false },
        { voiceName: "Reed", lang: "en-US", remote: false },
        { voiceName: "Daniel", lang: "en-GB", remote: false },
      ],
      "en-US",
    );

    expect(voice?.voiceName).toBe("Reed");
  });
});

describe("extractPronunciation", () => {
  test("picks british and american phonetics separately when markers exist", () => {
    expect(
      extractPronunciation({
        phonetics: [
          { text: "kriˈeɪt", audio: "https://cdn.example.com/uk/create.mp3" },
          { text: "kriˈeɪt̬", audio: "https://cdn.example.com/us/create.mp3" },
        ],
      }),
    ).toEqual({
      ukPhonetic: "/kriˈeɪt/",
      usPhonetic: "/kriˈeɪt̬/",
      ukAudioUrl: "https://cdn.example.com/uk/create.mp3",
      usAudioUrl: "https://cdn.example.com/us/create.mp3",
    });
  });

  test("falls back to generic phonetic when accent-specific markers are absent", () => {
    expect(
      extractPronunciation({
        phonetic: "rɪˈsiːvd",
      }),
    ).toEqual({
      ukPhonetic: "/rɪˈsiːvd/",
      usPhonetic: "/rɪˈsiːvd/",
      ukAudioUrl: undefined,
      usAudioUrl: undefined,
    });
  });
});

describe("pronunciation lookup fallbacks", () => {
  test("prioritizes likely base-form candidates ahead of broken stems", () => {
    expect(buildPronunciationCandidates("configured").slice(0, 2)).toEqual([
      "configured",
      "configure",
    ]);

    expect(buildPronunciationCandidates("preserves").slice(0, 2)).toEqual([
      "preserves",
      "preserve",
    ]);
  });

  test("parses english IPA and audio from wiktionary raw pages", () => {
    expect(
      extractPronunciationFromWiktionaryRaw(`==English==

===Pronunciation===
* {{IPA|en|/kənˈfɪɡə(ɹ)/|a=UK}}
** {{audio|en|LL-Q1860 (eng)-Vealhurl-configure.wav|a=Southern England}}
* {{IPA|en|/kənˈfɪɡ(j)ɚ/|a=US,CA}}
`),
    ).toEqual({
      ukPhonetic: "/kənˈfɪɡə(ɹ)/",
      usPhonetic: "/kənˈfɪɡ(j)ɚ/",
      ukAudioUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/LL-Q1860%20(eng)-Vealhurl-configure.wav",
      usAudioUrl: undefined,
    });
  });

  test("falls back from inflected dictionary entries to the base-form pronunciation", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("action=raw&title=configure")) {
        return textResponse(`==English==

===Pronunciation===
* {{IPA|en|/kənˈfɪɡə(ɹ)/|a=UK}}
** {{audio|en|LL-Q1860 (eng)-Vealhurl-configure.wav|a=Southern England}}
* {{IPA|en|/kənˈfɪɡ(j)ɚ/|a=US,CA}}
`);
      }

      if (url.endsWith("/configured")) {
        return jsonResponse([{ word: "configured", phonetics: [] }]);
      }

      if (url.endsWith("/configure")) {
        return jsonResponse([{
          word: "configure",
          phonetic: "/kənˈfɪɡə(ɹ)/",
          phonetics: [
            { text: "/kənˈfɪɡə(ɹ)/", audio: "" },
            { text: "/kənˈfɪɡ(j)ɚ/", audio: "" },
          ],
        }]);
      }

      return jsonResponse(null, false);
    });

    const result = await lookupBestPronunciation("configured", fetchMock as unknown as typeof fetch);

    expect(result).toEqual({
      ukPhonetic: "/kənˈfɪɡə(ɹ)/",
      usPhonetic: "/kənˈfɪɡ(j)ɚ/",
      ukAudioUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/LL-Q1860%20(eng)-Vealhurl-configure.wav",
      usAudioUrl: undefined,
    });
  });

  test("falls back to wiktionary audio when no IPA is available from dictionaryapi", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("action=raw&title=contextual")) {
        return textResponse(`==English==

===Pronunciation===
* {{audio|en|LL-Q1860 (eng)-Wodencafe-contextual.wav|a=US}}
`);
      }

      if (url.endsWith("/contextual")) {
        return jsonResponse([{ word: "contextual", phonetics: [] }]);
      }

      return jsonResponse(null, false);
    });

    const result = await lookupBestPronunciation("contextual", fetchMock as unknown as typeof fetch);

    expect(result).toEqual({
      ukPhonetic: undefined,
      usPhonetic: undefined,
      ukAudioUrl: undefined,
      usAudioUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/LL-Q1860%20(eng)-Wodencafe-contextual.wav",
    });
  });
});
