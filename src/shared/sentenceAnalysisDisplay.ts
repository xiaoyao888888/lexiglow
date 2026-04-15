import type { SentenceClauseBlock } from "./types";

export interface MatchedSentenceClauseBlock extends SentenceClauseBlock {
  start: number;
  end: number;
}

const REVIEWABLE_PREPOSITIONS = new Set([
  "of", "in", "on", "at", "by", "for", "with", "from", "about", "between", "among",
  "over", "under", "into", "onto", "through", "across", "around",
]);

export function matchClauseBlocks(
  sentence: string,
  blocks: SentenceClauseBlock[],
): MatchedSentenceClauseBlock[] {
  const matchedBlocks: MatchedSentenceClauseBlock[] = [];
  let cursor = 0;

  for (const block of blocks) {
    const text = block.text.trim();

    if (!text) {
      continue;
    }

    const start = sentence.indexOf(text, cursor);

    if (start < 0) {
      continue;
    }

    matchedBlocks.push({
      ...block,
      start,
      end: start + text.length,
    });
    cursor = start + text.length;
  }

  return matchedBlocks;
}

export function mergeDisplayClauseBlocks(
  sentence: string,
  blocks: MatchedSentenceClauseBlock[],
): MatchedSentenceClauseBlock[] {
  if (blocks.length < 2) {
    return blocks;
  }

  const merged: MatchedSentenceClauseBlock[] = [];
  let index = 0;

  while (index < blocks.length) {
    const current = blocks[index];
    const next = blocks[index + 1];
    const currentText = current.text.trim().toLowerCase();
    const currentWords = currentText.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) ?? [];

    if (
      next &&
      currentWords.length === 1 &&
      REVIEWABLE_PREPOSITIONS.has(currentWords[0]) &&
      /^[\s,;:()]*$/.test(sentence.slice(current.end, next.start))
    ) {
      merged.push({
        ...next,
        start: current.start,
        text: sentence.slice(current.start, next.end),
      });
      index += 2;
      continue;
    }

    merged.push(current);
    index += 1;
  }

  return merged;
}

export function splitDisplayClauseBlocks(
  sentence: string,
  blocks: MatchedSentenceClauseBlock[],
): MatchedSentenceClauseBlock[] {
  const refined: MatchedSentenceClauseBlock[] = [];
  const branchPattern =
    /\b(of|in|with|by|through|over|under|for|from|on|at|to)\s+(what|which|who|whom|whose|where|when|how|whether|why)\b/i;

  for (const block of blocks) {
    const blockText = sentence.slice(block.start, block.end);
    const match = branchPattern.exec(blockText);

    if (!match || match.index < 0) {
      refined.push(block);
      continue;
    }

    const splitStart = block.start + match.index;
    const prefixText = sentence.slice(block.start, splitStart).trim();
    const branchText = sentence.slice(splitStart, block.end).trim();
    const prefixWords = prefixText.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) ?? [];
    const branchWords = branchText.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) ?? [];

    if (prefixWords.length < 3 || branchWords.length < 3) {
      refined.push(block);
      continue;
    }

    refined.push({
      ...block,
      text: sentence.slice(block.start, splitStart).replace(/\s+$/u, ""),
      start: block.start,
      end: splitStart,
    });
    refined.push({
      ...block,
      text: sentence.slice(splitStart, block.end).replace(/^\s+/u, ""),
      start: splitStart,
      end: block.end,
    });
  }

  return refined;
}

export function attachCommaGapsToPreviousBlock(
  sentence: string,
  blocks: MatchedSentenceClauseBlock[],
): MatchedSentenceClauseBlock[] {
  if (blocks.length < 2) {
    return blocks;
  }

  const adjusted = [{ ...blocks[0] }];

  for (let index = 1; index < blocks.length; index += 1) {
    const current = blocks[index];
    const previous = adjusted[adjusted.length - 1];
    const gapText = sentence.slice(previous.end, current.start);

    if (/[，,]/.test(gapText) && /^[\s，,]*$/u.test(gapText)) {
      const trailingWhitespaceLength = gapText.match(/\s*$/u)?.[0].length ?? 0;
      const commaEnd = current.start - trailingWhitespaceLength;
      previous.end = commaEnd;
      previous.text = sentence.slice(previous.start, commaEnd);
    }

    adjusted.push({ ...current });
  }

  return adjusted;
}

export function getDisplayClauseBlocks(
  sentence: string,
  blocks: SentenceClauseBlock[],
): MatchedSentenceClauseBlock[] {
  return attachCommaGapsToPreviousBlock(
    sentence,
    splitDisplayClauseBlocks(
      sentence,
      mergeDisplayClauseBlocks(
        sentence,
        matchClauseBlocks(sentence, blocks),
      ),
    ),
  );
}
