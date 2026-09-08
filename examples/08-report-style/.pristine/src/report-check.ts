// Structural check for a finished report. It enforces the contract that
// `.claude/output-styles/report.md` asks Claude to follow.
// Not implemented yet.
//
// No model runs here. Same input, same output, every time. That is the point.
// A style is a request. This file is the check that tells you whether the
// request was honored.
//
// Two things are missing: the FILLER_BODIES list and the function at the
// bottom. Read tests/report-check.test.ts and fixtures/report-*.txt for the
// spec, and read `.claude/output-styles/report.md` for the rules in prose.

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
 * Fill this list. "nothing" and "none" are the two the tests name. Add the
 * spellings a model actually reaches for when a section is empty.
 */
export const FILLER_BODIES: readonly string[] = [];

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

/**
 * Check one finished report.
 *
 * Split the text into sections first, then run the rules in this order. The
 * order is what the tests assert, so keep it.
 *
 *   1. Preamble. Any text before the first heading.
 *   2. Per section, in document order: unknown heading, empty body, filler
 *      body, duplicate heading.
 *   3. Out of order. Compare the first appearance of each heading against
 *      REPORT_ORDER.
 *   4. Missing Done. Every report says what changed.
 *   5. Evidence, in document order. A fenced block, a stack frame, or a
 *      `file.ts:41` reference.
 *   6. Too long. More than REPORT_WORD_LIMIT words across the whole report.
 *
 * Two parsing rules that the fixtures depend on:
 *   - `**Summary.**` opens a section even though it is not a real heading, so
 *     an invented heading gets caught. `Summary.` on its own does not, since
 *     every sentence would look like a heading.
 *   - A curly apostrophe in "Doesn't work" reads the same as a straight one.
 */
export function reportCheck(text: string): ReportCheckResult {
  void text;
  throw new Error('reportCheck is not implemented. See tests/report-check.test.ts.');
}
