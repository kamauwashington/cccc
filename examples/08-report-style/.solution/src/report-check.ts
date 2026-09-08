// Structural check for a finished report. It enforces the contract that
// `.claude/output-styles/report.md` asks Claude to follow.
//
// No model runs here. Same input, same output, every time. That is the point.
// A style is a request. This file is the check that tells you whether the
// request was honored.

/** The five headings, in the order they have to appear. */
export enum ReportHeading {
  Done = 'Done',
  Works = 'Works',
  DoesNotWork = "Doesn't work",
  Fixed = 'Fixed',
  Suggestions = 'Suggestions',
}

/** Every way a report can break the contract. */
export enum ReportRule {
  Preamble = 'preamble',
  UnknownHeading = 'unknown-heading',
  EmptyBody = 'empty-body',
  FillerBody = 'filler-body',
  DuplicateHeading = 'duplicate-heading',
  OutOfOrder = 'out-of-order',
  MissingDone = 'missing-done',
  Evidence = 'evidence',
  TooLong = 'too-long',
}

export const REPORT_ORDER: readonly ReportHeading[] = [
  ReportHeading.Done,
  ReportHeading.Works,
  ReportHeading.DoesNotWork,
  ReportHeading.Fixed,
  ReportHeading.Suggestions,
];

/** All five headings together stay under this. */
export const REPORT_WORD_LIMIT = 200;

/**
 * A heading with one of these under it should have been dropped instead.
 * This is the rule that separates the style from the one in a BOE style
 * report, which writes "nothing" and keeps the heading.
 */
export const FILLER_BODIES: readonly string[] = [
  'nothing',
  'none',
  'n/a',
  'na',
  'nothing to report',
  'nothing here',
  'no',
];

export interface ReportSection {
  heading: ReportHeading;
  /** Everything under the heading, joined with single newlines and trimmed. */
  body: string;
  /** 1 based line number of the heading. */
  line: number;
}

export interface ReportFinding {
  rule: ReportRule;
  message: string;
  /** 1 based line number. 0 when the finding is about the whole report. */
  line: number;
  heading?: ReportHeading;
}

export interface ReportCheckResult {
  ok: boolean;
  sections: ReportSection[];
  /** Canonical headings in the order they appeared, duplicates included. */
  headings: ReportHeading[];
  /** Whitespace separated tokens across the whole report. */
  wordCount: number;
  findings: ReportFinding[];
}

const CURLY_APOSTROPHE = String.fromCharCode(0x2019);
const LIST_MARKER = /^\s*(?:[-*+]\s+)?/;
const BOLD_HEADING = /^\*\*([^*]+?)[.:]\*\*\s*(.*)$/;
const PLAIN_HEADING = /^([A-Za-z][A-Za-z' ]{1,18}?)\.\s*(.*)$/;
const FENCE = /^\s*(?:```|~~~)/;

/** A stack frame, such as `at parseDuration (src/duration.ts:41:11)`. */
const STACK_FRAME = /^\s*at\s+\S+/;
/** A file reference carrying a line number, such as `src/duration.ts:41`. */
const FILE_LINE = /[\w/.-]+\.[a-z]{2,4}:\d+/i;

function normalize(text: string): string {
  return text.split(CURLY_APOSTROPHE).join("'");
}

function canonical(label: string): ReportHeading | null {
  const want = normalize(label).trim().toLowerCase();
  return REPORT_ORDER.find((h) => h.toLowerCase() === want) ?? null;
}

interface HeadingHit {
  heading: ReportHeading | null;
  label: string;
  rest: string;
}

/**
 * Decide whether a line opens a section.
 *
 * The bold form (`**Summary.**`) always opens one, so an invented heading gets
 * caught instead of being read as prose. The plain form (`Works. 18 tests`)
 * only opens one when the word is a real heading, otherwise every sentence
 * that starts with a capitalized word would look like a heading.
 */
function matchHeading(line: string): HeadingHit | null {
  const stripped = normalize(line).replace(LIST_MARKER, '');

  const bold = stripped.match(BOLD_HEADING);
  if (bold) {
    const label = bold[1].trim();
    return { heading: canonical(label), label, rest: bold[2].trim() };
  }

  const plain = stripped.match(PLAIN_HEADING);
  if (plain) {
    const heading = canonical(plain[1]);
    if (heading) return { heading, label: plain[1].trim(), rest: plain[2].trim() };
  }

  return null;
}

function isFiller(body: string): boolean {
  const bare = body.trim().toLowerCase().replace(/[.!]+$/, '').trim();
  return FILLER_BODIES.includes(bare);
}

export function reportCheck(text: string): ReportCheckResult {
  const lines = text.split('\n');
  const findings: ReportFinding[] = [];
  const sections: ReportSection[] = [];
  const headings: ReportHeading[] = [];

  // Pass one. Split the report into sections and remember which lines sat
  // inside a fenced block, so the evidence pass can skip their contents.
  let fenced = false;
  const fencedLines = new Set<number>();
  const preambleLines: number[] = [];
  let seenHeading = false;
  let open: { heading: ReportHeading | null; line: number; body: string[] } | null = null;

  const closeOpen = (): void => {
    if (!open || !open.heading) {
      open = null;
      return;
    }
    sections.push({
      heading: open.heading,
      body: open.body.join('\n').trim(),
      line: open.line,
    });
    open = null;
  };

  lines.forEach((raw, index) => {
    const lineNo = index + 1;

    if (FENCE.test(raw)) {
      fenced = !fenced;
      if (open) open.body.push(raw);
      return;
    }
    if (fenced) {
      fencedLines.add(lineNo);
      if (open) open.body.push(raw);
      return;
    }

    const hit = matchHeading(raw);
    if (hit) {
      closeOpen();
      seenHeading = true;
      if (hit.heading) {
        headings.push(hit.heading);
      } else {
        findings.push({
          rule: ReportRule.UnknownHeading,
          message: 'Unknown heading "' + hit.label + '". The contract has five headings.',
          line: lineNo,
        });
      }
      open = { heading: hit.heading, line: lineNo, body: hit.rest ? [hit.rest] : [] };
      return;
    }

    if (!seenHeading) {
      if (raw.trim()) preambleLines.push(lineNo);
      return;
    }
    if (open) open.body.push(raw);
  });
  closeOpen();

  // Pass two. Preamble.
  if (preambleLines.length) {
    findings.push({
      rule: ReportRule.Preamble,
      message: 'Text before the first heading. The report starts at "Done."',
      line: preambleLines[0],
    });
  }

  // Pass three. Per section rules, in document order.
  const seen = new Set<ReportHeading>();
  for (const section of sections) {
    if (!section.body) {
      findings.push({
        rule: ReportRule.EmptyBody,
        message: '"' + section.heading + '" has no body. Drop the heading instead.',
        line: section.line,
        heading: section.heading,
      });
    } else if (isFiller(section.body)) {
      findings.push({
        rule: ReportRule.FillerBody,
        message:
          '"' +
          section.heading +
          '" says "' +
          section.body.trim() +
          '". Drop the heading instead of filling it.',
        line: section.line,
        heading: section.heading,
      });
    }

    if (seen.has(section.heading)) {
      findings.push({
        rule: ReportRule.DuplicateHeading,
        message: '"' + section.heading + '" appears twice. Merge the two.',
        line: section.line,
        heading: section.heading,
      });
    }
    seen.add(section.heading);
  }

  // Pass four. Order, over the first appearance of each heading.
  let highest = -1;
  const ordered = new Set<ReportHeading>();
  for (const section of sections) {
    if (ordered.has(section.heading)) continue;
    ordered.add(section.heading);
    const rank = REPORT_ORDER.indexOf(section.heading);
    if (rank < highest) {
      findings.push({
        rule: ReportRule.OutOfOrder,
        message: '"' + section.heading + '" came after a later heading.',
        line: section.line,
        heading: section.heading,
      });
      continue;
    }
    highest = rank;
  }

  // Pass five. Done is the one heading that is always there.
  if (sections.length && !seen.has(ReportHeading.Done)) {
    findings.push({
      rule: ReportRule.MissingDone,
      message: 'No "Done." heading. Every report says what changed.',
      line: 0,
    });
  }

  // Pass six. Evidence, in document order. Fenced blocks are flagged at the
  // opening fence and their contents are skipped.
  let inFence = false;
  lines.forEach((raw, index) => {
    const lineNo = index + 1;
    if (FENCE.test(raw)) {
      if (!inFence) {
        findings.push({
          rule: ReportRule.Evidence,
          message: 'Fenced output in the report. Put the run in the commit message.',
          line: lineNo,
        });
      }
      inFence = !inFence;
      return;
    }
    if (inFence || fencedLines.has(lineNo)) return;
    if (STACK_FRAME.test(raw)) {
      findings.push({
        rule: ReportRule.Evidence,
        message: 'Stack frame in the report. Say where the trace lives instead.',
        line: lineNo,
      });
      return;
    }
    if (FILE_LINE.test(raw)) {
      findings.push({
        rule: ReportRule.Evidence,
        message: 'File and line reference. Name the file, drop the line number.',
        line: lineNo,
      });
    }
  });

  // Pass seven. Length.
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (wordCount > REPORT_WORD_LIMIT) {
    findings.push({
      rule: ReportRule.TooLong,
      message:
        wordCount + ' words. The cap is ' + REPORT_WORD_LIMIT + ' across all headings.',
      line: 0,
    });
  }

  return { ok: findings.length === 0, sections, headings, wordCount, findings };
}
