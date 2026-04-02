import { describe, expect, test } from "vitest";

import {
  parseGoogleTranslateResponse,
  parseLlmTranslationResponse,
  sanitizeTranslatorSettings,
} from "../src/shared/translator";

describe("google response parsing", () => {
  test("joins translation segments", () => {
    const payload = [[["你好", "hello", null, null, 10]], null, "en"];
    expect(parseGoogleTranslateResponse(payload)).toBe("你好");
  });

  test("returns empty string for unexpected payloads", () => {
    expect(parseGoogleTranslateResponse({})).toBe("");
  });
});

describe("llm response parsing", () => {
  test("reads structured word and sentence translations", () => {
    expect(
      parseLlmTranslationResponse('{"word":"收到的","sentence":"我们昨天收到了你的包裹。"}'),
    ).toEqual({
      translation: "收到的",
      sentenceTranslation: "我们昨天收到了你的包裹。",
    });
  });

  test("falls back to plain text when response is not json", () => {
    expect(parseLlmTranslationResponse("收到的")).toEqual({
      translation: "收到的",
    });
  });

  test("defaults llm display mode to word", () => {
    expect(sanitizeTranslatorSettings({}).llmDisplayMode).toBe("word");
  });
});
