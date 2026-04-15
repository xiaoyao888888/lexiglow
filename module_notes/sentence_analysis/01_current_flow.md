# Current Flow

## Code Entrypoints

- `src/content/index.ts`
  sends `ANALYZE_SELECTION` with only `text`
  and renders analysis blocks with `getDisplayClauseBlocks(...)`
- `src/background/index.ts`
  forwards the request to `analyzeSentenceWithLlm`
- `src/shared/translator.ts`
  performs a single LLM call with `max_tokens: 500` and `response_format: json_object`
- `src/shared/sentenceAnalysisDisplay.ts`
  contains the display-side clause matching, merge, split, and comma-attachment logic used by the tooltip

## Current Prompt Shape

- single-shot analysis; no retry path
- `translation`: polished Chinese translation, not word-for-word literal
- `structure`: short English backbone sentence with branches removed
- `analysisSteps`: exactly 5 Chinese steps
  1. cut layers
  2. extract backbone
  3. explain branches and attachment targets
  4. explain nonfinite forms and logical relations
  5. explain Chinese translation order, then support the final translation

## Verified Commands

- Parser-focused test:
  ```bash
  npm test -- tests/translator.test.ts
  ```
  Expected good signal:
  - `tests/translator.test.ts` passes

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
  - no new sentence-analysis type errors were introduced by the display extraction

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

- loading title:
  - `正在按五步法拆句并顺译，请稍等`
- loading steps:
  1. 切层次
  2. 抓主干
  3. 拆枝叶
  4. 看非谓语和逻辑关系
  5. 顺译
