// Structural check for prose. It enforces the repository writing rules.
//
// The BANNED list below is a copy of the one in `scripts/lint-prose.mjs` at the
// repository root. Same patterns, same labels, same fixes, same order. The
// linter gates CI. This module gates one piece of text on demand. They have to
// agree, so when one list changes the other changes with it.
//
// No model runs here. Same input, same output, every time.
//
// Read tests/concise-check.test.ts and fixtures/prose-*.txt for the spec.

/** One id per entry in the shared banned list. */
export enum BannedPhraseId {
  EmDash = 'em-dash',
  EnDash = 'en-dash',
  ItIsWorthNoting = 'it-is-worth-noting',
  ItsWorthNoting = 'its-worth-noting',
  Importantly = 'importantly',
  ItShouldBeNoted = 'it-should-be-noted',
  NeedlessToSay = 'needless-to-say',
  InTodaysWorld = 'in-todays-world',
  DelveInto = 'delve-into',
  Leverage = 'leverage',
  AtTheEndOfTheDay = 'at-the-end-of-the-day',
  NotXButY = 'not-x-but-y',
}

/** Every way a piece of text can fail the check. */
export enum ConciseRule {
  BannedPhrase = 'banned-phrase',
  TooManyLines = 'too-many-lines',
  BulletHeavy = 'bullet-heavy',
}

export interface BannedPhrase {
  id: BannedPhraseId;
  pattern: string | RegExp;
  label: string;
  fix: string;
}

// Built from a char code so the file never holds the mark it bans.
const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);

/** Copy this from scripts/lint-prose.mjs, one entry per BannedPhraseId. */
export const BANNED: readonly BannedPhrase[] = [
  {
    id: BannedPhraseId.EmDash,
    pattern: EM_DASH,
    label: 'em dash',
    fix: 'Use a period, a comma, or parentheses.',
  },
  {
    id: BannedPhraseId.EnDash,
    pattern: EN_DASH,
    label: 'en dash',
    fix: 'Use a hyphen or the word "to".',
  },
  {
    id: BannedPhraseId.ItIsWorthNoting,
    pattern: /\bit is worth noting\b/i,
    label: '"it is worth noting"',
    fix: 'Delete it.',
  },
  {
    id: BannedPhraseId.ItsWorthNoting,
    pattern: /\bit'?s worth noting\b/i,
    label: '"it\'s worth noting"',
    fix: 'Delete it.',
  },
  {
    id: BannedPhraseId.Importantly,
    pattern: /^\s*importantly[,\s]/im,
    label: 'filler opener "Importantly"',
    fix: 'Delete it.',
  },
  {
    id: BannedPhraseId.ItShouldBeNoted,
    pattern: /\bit should be noted\b/i,
    label: '"it should be noted"',
    fix: 'Delete it.',
  },
  {
    id: BannedPhraseId.NeedlessToSay,
    pattern: /\bneedless to say\b/i,
    label: '"needless to say"',
    fix: 'Delete it.',
  },
  {
    id: BannedPhraseId.InTodaysWorld,
    pattern: /\bin today'?s world\b/i,
    label: '"in today\'s world"',
    fix: 'Delete it.',
  },
  {
    id: BannedPhraseId.DelveInto,
    pattern: /\bdelve into\b/i,
    label: '"delve into"',
    fix: 'Use "look at" or "read".',
  },
  {
    id: BannedPhraseId.Leverage,
    pattern: /\bleverage[sd]?\b(?!\s+ratio)/i,
    label: '"leverage" as a verb',
    fix: 'Use "use".',
  },
  {
    id: BannedPhraseId.AtTheEndOfTheDay,
    pattern: /\bat the end of the day\b/i,
    label: '"at the end of the day"',
    fix: 'Delete it.',
  },
  {
    id: BannedPhraseId.NotXButY,
    pattern: /\bnot (?:just |only |merely |simply )?[a-z][\w' -]{2,40}, but (?:rather |instead )?[a-z]/i,
    label: '"not X, but Y" construction',
    fix: 'Say the thing directly.',
  },
];

/** An answer longer than this is a document, so send a document instead. */
export const CONCISE_LINE_LIMIT = 40;
/** Above this share of bullets the text is a list wearing a coat. */
export const CONCISE_BULLET_RATIO_LIMIT = 0.7;
/** Below this many content lines the ratio means nothing, so skip the rule. */
export const CONCISE_BULLET_MIN_LINES = 4;

export interface ConciseFinding {
  rule: ConciseRule;
  message: string;
  /** 1 based line number. 0 when the finding is about the whole text. */
  line: number;
  /** Set only on banned phrase findings. */
  phrase?: BannedPhraseId;
  fix?: string;
}

export interface ConciseReport {
  ok: boolean;
  /** Non empty lines outside fenced code blocks. */
  lineCount: number;
  bulletLines: number;
  proseLines: number;
  /** bulletLines / lineCount, rounded to two places. 0 for empty text. */
  bulletRatio: number;
  findings: ConciseFinding[];
}

interface ContentLine {
  line: number;
  text: string;
}

const FENCE = /^\s*(?:```|~~~)/;
const IGNORE_LINE = /prose-lint-ignore(?!-file)/;
const BULLET = /^\s*(?:[-*+]|\d+[.)])\s+/;

/**
 * Non empty lines that sit outside a fenced code block, with their original
 * line numbers. The fence markers themselves drop out too, which matches the
 * root linter.
 */
function contentLines(text: string): ContentLine[] {
  const out: ContentLine[] = [];
  let fenced = false;
  text.split('\n').forEach((raw, index) => {
    if (FENCE.test(raw)) {
      fenced = !fenced;
      return;
    }
    if (fenced) return;
    if (raw.trim() === '') return;
    out.push({ line: index + 1, text: raw });
  });
  return out;
}

function hits(pattern: string | RegExp, body: string): boolean {
  return typeof pattern === 'string' ? body.includes(pattern) : pattern.test(body);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Check one piece of text.
 *
 * Three rules:
 *   1. No banned phrase from the shared list.
 *   2. At most CONCISE_LINE_LIMIT content lines.
 *   3. At most CONCISE_BULLET_RATIO_LIMIT of those lines are bullets, once the
 *      text has CONCISE_BULLET_MIN_LINES content lines or more.
 *
 * Fenced code blocks are skipped. A `prose-lint-ignore` marker skips the next
 * line. Both have to match the root linter.
 */
export function conciseCheck(text: string): ConciseReport {
  const lines = contentLines(text);
  const findings: ConciseFinding[] = [];

  let suppressNext = false;
  for (const entry of lines) {
    if (IGNORE_LINE.test(entry.text)) {
      suppressNext = true;
      continue;
    }
    if (suppressNext) {
      suppressNext = false;
      continue;
    }
    for (const rule of BANNED) {
      if (!hits(rule.pattern, entry.text)) continue;
      findings.push({
        rule: ConciseRule.BannedPhrase,
        message: 'banned phrase: ' + rule.label + '. ' + rule.fix,
        line: entry.line,
        phrase: rule.id,
        fix: rule.fix,
      });
    }
  }

  const lineCount = lines.length;
  const bulletLines = lines.filter((entry) => BULLET.test(entry.text)).length;
  const proseLines = lineCount - bulletLines;
  const bulletRatio = lineCount === 0 ? 0 : round2(bulletLines / lineCount);

  if (lineCount > CONCISE_LINE_LIMIT) {
    findings.push({
      rule: ConciseRule.TooManyLines,
      message:
        lineCount + ' content lines. The limit is ' + CONCISE_LINE_LIMIT + '. Send a file instead.',
      line: 0,
    });
  }

  if (lineCount >= CONCISE_BULLET_MIN_LINES && bulletRatio > CONCISE_BULLET_RATIO_LIMIT) {
    findings.push({
      rule: ConciseRule.BulletHeavy,
      message:
        Math.round(bulletRatio * 100) +
        '% of the lines are bullets. The limit is ' +
        Math.round(CONCISE_BULLET_RATIO_LIMIT * 100) +
        '%. Write some of it as sentences.',
      line: 0,
    });
  }

  return {
    ok: findings.length === 0,
    lineCount,
    bulletLines,
    proseLines,
    bulletRatio,
    findings,
  };
}
