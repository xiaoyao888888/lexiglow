import { describe, expect, test } from "vitest";

import { lookupRank, resolveLookupLemma, resolveMasteryKey } from "../src/shared/lexicon";

describe("lexicon lookup", () => {
  test("prefers an exact ranked word over a broken stem", () => {
    expect(resolveLookupLemma("received")).toBe("received");
    expect(lookupRank(resolveLookupLemma("received"))).toBe(891);
  });

  test("falls back to a lemma candidate when the exact word is not ranked", () => {
    expect(resolveLookupLemma("running")).toBe("running");
    expect(lookupRank(resolveLookupLemma("houses"))).not.toBeNull();
  });

  test("uses base forms for mastery keys when an inflected form is ranked", () => {
    expect(resolveMasteryKey("added")).toBe("add");
    expect(resolveMasteryKey("adding")).toBe("add");
    expect(resolveMasteryKey("houses")).toBe("house");
    expect(resolveMasteryKey("addition")).toBe("addition");
  });
});
