# Handover

## Goal

Keep hover and selection translation behavior stable while reducing false-positive translation of names, making selection triggering more reliable, and keeping long selected sentences readable in the default card.

## Current Code State

- selection translation triggering no longer depends only on a one-shot `mouseup`; `selectionchange`, `pointerup`, and a small debounce now participate in `src/content/index.ts`
- mixed selections that span plain text plus inline ``code`` are allowed; the old start-node/end-node hard rejection was removed for that case
- selection filtering in `src/shared/word.ts` is looser for real English sentences:
  - longer passages up to 1200 characters are allowed
  - `@name` and `#tag` inside a sentence no longer block translation
  - pure handle/tag selections and obvious technical tokens are still rejected
- name preservation now has three layers:
  - `looksLikeSpecialTerm(...)` for obvious standalone names or branded terms
  - `looksLikeContextualSpecialTerm(...)` for context clues such as `by <name>` and discussion metadata
  - prompt-level preservation instruction in LLM translation and sentence-analysis requests
- DOM context expansion now looks above the immediate text node when local text is too short, which is important for sites where usernames live inside links and surrounding metadata lives in sibling text nodes
- selection cards now use a wider width and more reading-oriented translation typography than hover word cards

## Verified Results Worth Reusing

- `npm test -- --run tests/word.test.ts tests/settings.test.ts` passes
- `npm test -- --run tests/translator.test.ts` passes
- `npx tsc --noEmit` passes
- `npm run build` passes

## Active Limitations

- browser-level interaction has not been automated; selection-trigger timing and tooltip width are still validated by manual extension reload and page checks
- some sites may still defeat contextual name detection if useful metadata is split across deeper or virtualized DOM structures than the current ancestor scan covers
- Google translation itself still cannot be given prompt instructions; selection-name preservation there depends on local pre-translation checks, not provider-side behavior

## Next-Step Guidance

1. if author names still translate on a specific site, inspect that site’s rendered DOM first and compare the username node with the nearest ancestor text before changing regex rules
2. rerun `tests/settings.test.ts` when changing contextual special-term heuristics
3. rerun `tests/word.test.ts` when changing selection filters, technical-token guards, or allowed text length
4. rerun `tests/translator.test.ts` when changing LLM prompt wording around proper-name preservation
5. if visual tuning continues, validate both a narrow hover word card and a wide selection card so the two layouts do not collapse into one shared compromise

## Important Caveats

- do not move module-specific runbook detail back into `AGENTS.md`
- do not assume all untranslated capitalized text is a person name; current heuristics intentionally combine surface form and context
- do not claim screenshot-level correctness from command-only validation; manual browser checks are still required for final tooltip UX judgment
