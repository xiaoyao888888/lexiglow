# Current Flow

## Code Entrypoints

- `src/content/index.ts`
  - hover word cards render through `renderTooltip(...)`
  - selected text cards render through `renderSelectionTooltip(...)`
  - selection triggering now uses `selectionchange` plus a small debounce via `scheduleSelectionTriggerUpdate(...)` instead of relying only on a single `mouseup`
  - mixed selection that crosses normal text and inline ``code`` is accepted through `shouldIgnoreSelectionRange(...)`; only fully ignored containers such as `input`, `textarea`, `contenteditable`, and pure `code/pre` blocks are suppressed
  - DOM-aware context expansion now flows through `extractContextAroundDomRange(...)` for hover words, selected text, and highlight scanning so metadata like `by <username>` can survive split text nodes
  - selection cards use a wider card layout via `data-layout="selection"` and long-form translation typography in the selection-specific CSS rules
- `src/background/index.ts`
  - `TRANSLATE_WORD` and `LOOKUP_WORD` both apply `resolveFlagsWithContext(...)` so context-marked names and handles can be ignored before translation
  - `TRANSLATE_SELECTION` short-circuits through `shouldPreserveSelectionText(...)` when the selected text is itself an obvious name or username
- `src/shared/settings.ts`
  - `looksLikeContextualSpecialTerm(...)` recognizes context patterns such as `by <name>`, Hacker News style age metadata, and simple full-name shapes
- `src/shared/translator.ts`
  - word translation, selection translation, and sentence analysis prompts all include `PRESERVE_PROPER_NAMES_INSTRUCTION`
  - proper names, usernames, brand names, and product names are requested in original English form rather than translated or transliterated
- `src/shared/word.ts`
  - selection text now allows longer English passages up to `MAX_SELECTION_TEXT_LENGTH = 1200`
  - sentences containing `@name` or `#tag` are allowed unless the whole selection is basically only handles or tags
  - single obvious technical tokens such as URLs, `.yaml`, `dev_err`, or `reg16` are still rejected

## Verified Behavior

- selected sentence cards are wider than hover word cards and use a more reading-oriented translation style
- long selections no longer fail just because they cross inline Markdown code like ``OpenAI / Compatible``
- selection cards appear more reliably after drag-select and keyboard-adjusted selections because `selectionchange` now participates in triggering
- author handles and person names are more likely to be ignored in hover/highlight flows because DOM ancestor context is considered, not just the immediate text node
- a selected standalone name can now be preserved as-is instead of being sent through translation first
- normal English sentences that contain `@alice` or `#release` are accepted for selection translation

## Verified Commands

- Targeted word and selection text tests:
  ```bash
  npm test -- --run tests/word.test.ts tests/settings.test.ts
  ```
  Expected good signal:
  - both files pass with selection-filter and contextual-special-term coverage

- Translator prompt and parsing tests:
  ```bash
  npm test -- --run tests/translator.test.ts
  ```
  Expected good signal:
  - selection and sentence-analysis prompt assertions still pass

- Type check:
  ```bash
  npx tsc --noEmit
  ```
  Expected good signal:
  - `src/content/index.ts` passes after selection-trigger and DOM-context changes

- Extension build:
  ```bash
  npm run build
  ```
  Expected good signal:
  - `dist/background.js`, `dist/options.js`, and `dist/chunks/storage.js` rebuild successfully

## Test Coverage Worth Reusing

- `tests/word.test.ts`
  - accepts normal sentences containing `@name`, `#tag`, and longer English text
  - still rejects pure handles, pure tags, and obvious technical identifiers
- `tests/settings.test.ts`
  - covers contextual special-term detection such as `by mikeeavns ...` and simple full names
- `tests/translator.test.ts`
  - asserts the proper-name preservation instruction is present in OpenAI, Gemini, Claude, and sentence-analysis prompts

## Known Caveats

- name preservation still depends on the DOM ancestor search finding useful surrounding text within a few levels; sites with heavily fragmented metadata may still need extra tuning
- pure `code` / `pre` selections are still intentionally ignored
- there is still no browser-level DOM or screenshot coverage for tooltip width, long-text wrapping, or the selection card typography
