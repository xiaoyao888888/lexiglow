import { describe, expect, test } from "vitest";

import { cleanSurfaceToken, getLemmaCandidates, toLemma } from "../src/shared/normalize";

describe("normalize helpers", () => {
  test("cleans punctuation from edges", () => {
    expect(cleanSurfaceToken("...Running!")).toBe("Running");
  });

  test("rejects digit-containing words", () => {
    expect(cleanSurfaceToken("gpt4")).toBe("");
  });

  test("normalizes common inflections", () => {
    expect(toLemma("running")).toBe("run");
    expect(toLemma("worked")).toBe("work");
    expect(toLemma("stories")).toBe("story");
  });

  test("provides lexicon-friendly candidates for past tense words", () => {
    expect(getLemmaCandidates("received")).toEqual(
      expect.arrayContaining(["received", "receiv", "receive"]),
    );
  });

  test("keeps doubled-consonant stems available for mastery resolution", () => {
    expect(getLemmaCandidates("added")).toEqual(expect.arrayContaining(["added", "add", "ad"]));
    expect(getLemmaCandidates("adding")).toEqual(expect.arrayContaining(["adding", "add", "ad"]));
    expect(getLemmaCandidates("houses")).toEqual(expect.arrayContaining(["houses", "hous", "house"]));
  });
});
