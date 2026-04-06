import { describe, expect, test } from "vitest";

import {
  extractPronunciation,
  hasEnglishVoice,
  selectVoiceForAccent,
} from "../src/shared/pronunciation";

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
