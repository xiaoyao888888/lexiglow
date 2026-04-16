# Current Flow

## Code Entrypoints

- `src/content/index.ts`
  - selection text first renders the compact translation card through `renderSelectionTooltip(...)`
  - selection flow immediately requests `TRANSLATE_SELECTION` with Google via `requestSelectionTranslation("google", context)`
  - the selection card exposes a `长难句翻译` button; clicking it calls `requestSentenceAnalysis(...)`
  - the analysis panel sends `ANALYZE_SELECTION` with only `text`
  - the analysis view renders in this order: `原句拆解` -> `翻译` -> `主干结构` -> `分析过程`
- `src/background/index.ts`
  - `ANALYZE_SELECTION` forwards to `handleAnalyzeSelection(...)`
  - `TRANSLATE_SELECTION` remains the default selection-translation path before sentence analysis
- `src/shared/translator.ts`
  - performs a single LLM call with `max_tokens: 1000` and `response_format: json_object`
  - `parseSentenceAnalysisResponse(...)` accepts either `analysisSteps` array output or the legacy `cutSummary/backboneSummary/branchSummary/translationSummary` field set
- `src/shared/sentenceAnalysisDisplay.ts`
  - owns display-side clause matching, merge, split, and comma-attachment logic
  - `getDisplayClauseBlocks(...)` is the only clause-block shaping path consumed by the tooltip

## Current Prompt Shape

- single-shot analysis; no retry path
- `translation`: one polished Chinese sentence for the full English sentence
- `structure`: short English backbone sentence with branches removed
- `analysisSteps`: exactly 4 Chinese steps
  1. cut layers by connectors, punctuation, clauses, coordination, and nonfinite structures
  2. identify the main clause backbone and core meaning
  3. explain logical groups, clauses, nonfinite phrases, modifiers, and what each part modifies
  4. explain Chinese translation order first, then support the final translation
- each analysis step is capped at 500 Chinese characters
- `highlights`: 5 to 8 structural signal words
- `clauseBlocks`: 2 to 6 exact sentence chunks that must cover the whole sentence without overlap

## Verified Commands

- Translator-focused regression:
  ```bash
  npx vitest run tests/translator.test.ts
  ```
  Expected good signal:
  - `tests/translator.test.ts` passes

- Full test suite:
  ```bash
  npm test
  ```
  Expected good signal:
  - all 6 Vitest files pass

- Extension build:
  ```bash
  npm run build
  ```
  Expected good signal:
  - `dist/background.js`, `dist/popup.js`, `dist/options.js` rebuilt successfully

- Display regression for a fixed long sentence:
  ```bash
  npx vitest run tests/translator.test.ts -t "keeps commas attached to the preceding clause in display blocks for real analysis text"
  ```
  Expected good signal:
  - the fixed sample sentence passes parser-to-display regression
  - commas stay attached to the preceding clause block
  - the comma-following spaces do not get absorbed into the highlighted block

- Type check caveat:
  ```bash
  npx tsc --noEmit
  ```
  Current observed result:
  - still fails on pre-existing `src/background/index.ts` `cached` union-type errors
  - also now fails on `src/content/index.ts` sentence-translation response narrowing around `renderTooltip(response.result, ...)` and `renderSelectionTooltip(... response.result.* ...)`

- Real API validation:
  - use a temporary local runner that imports `src/shared/translator.ts`
  - call `analyzeSentenceWithLlm` with a valid API key provided through the shell
  - do not store API keys in repo files

## Current Display Validation Sample

- fixed regression sentence:
  - `It is designed to run on a single GPU node, the code is minimal/hackable, and it covers all major LLM stages including tokenization, pretraining, finetuning, evaluation, inference, and a chat UI.`
- current expected display blocks:
  1. `It is designed to run on a single GPU node,`
  2. `the code is minimal/hackable,`
  3. `and it covers all major LLM stages including tokenization, pretraining, finetuning, evaluation, inference, and a chat UI.`

## Verified UI Copy

- selection card action:
  - `长难句翻译`
- analysis panel trigger:
  - `开始分析`
- loading title:
  - `正在翻译长难句`
- loading caption:
  - `正在整理句子结构、译序和核心意思，请稍等。`
- analysis step tags:
  1. `切层次`
  2. `抓主干`
  3. `理枝叶`
  4. `顺译序`

## Verified Rendering Behavior

- `renderAnalysisStepsMarkup(...)` strips leading `1.` / `1)` / `Step 1:` / `第1步` style prefixes before the ordered list renders
- long analysis steps can still show internal sub-items when the model emits inline `1) 2)` style fragments
- clause blocks remain inline, can wrap across lines, and keep comma-only gaps attached to the previous block while leaving trailing spaces outside the highlight
