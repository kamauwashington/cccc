// Structural check for a sharpened prompt.
//
// No model runs here. The check reads text and returns findings. Same input,
// same output, every time. That is the whole point of this file.
//
// Read tests/sharpen-check.test.ts and fixtures/prompt-*.txt for the spec.

/** The five sections a sharpened prompt has to fill. */
export enum SharpenSection {
  Goal = 'goal',
  Constraints = 'constraints',
  OutputFormat = 'output-format',
  SuccessCriteria = 'success-criteria',
  Avoid = 'avoid',
}

/** Every way a candidate prompt can fail the check. */
export enum SharpenRule {
  MissingSection = 'missing-section',
  VagueSuccessCriteria = 'vague-success-criteria',
  TooLong = 'too-long',
}

export interface SharpenFinding {
  rule: SharpenRule;
  message: string;
  /** Set when the finding is about one section. */
  section?: SharpenSection;
}

export interface SharpenReport {
  ok: boolean;
  wordCount: number;
  sectionsFound: SharpenSection[];
  findings: SharpenFinding[];
}

/** A sharpened prompt longer than this stopped being a prompt. */
export const SHARPEN_WORD_LIMIT = 400;

/** Section order, used for the heading scan and for the missing list. */
export const SHARPEN_SECTIONS: readonly SharpenSection[] = [
  SharpenSection.Goal,
  SharpenSection.Constraints,
  SharpenSection.OutputFormat,
  SharpenSection.SuccessCriteria,
  SharpenSection.Avoid,
];

/** Wording each section answers to. Longest spelling first. */
const SECTION_HEADINGS: Record<SharpenSection, readonly string[]> = {
  [SharpenSection.Goal]: ['goal'],
  [SharpenSection.Constraints]: ['constraints', 'constraint'],
  [SharpenSection.OutputFormat]: ['output format', 'output'],
  [SharpenSection.SuccessCriteria]: ['success criteria', 'success criterion'],
  [SharpenSection.Avoid]: ['what to avoid', 'avoid'],
};

/** Plain English for each section, used in the missing section message. */
const SECTION_LABELS: Record<SharpenSection, string> = {
  [SharpenSection.Goal]: 'Goal',
  [SharpenSection.Constraints]: 'Constraints',
  [SharpenSection.OutputFormat]: 'Output format',
  [SharpenSection.SuccessCriteria]: 'Success criteria',
  [SharpenSection.Avoid]: 'What to avoid',
};

// A success criterion counts as testable when it names a number, a command in
// backticks, or a file to look at.
const HAS_NUMBER = /\d/;
const HAS_COMMAND = /`[^`]+`/;
const HAS_SLASH_PATH = /[\w.-]+\/[\w./-]+/;
const HAS_FILE_NAME =
  /\b[\w-]+\.(?:ts|tsx|js|jsx|mjs|cjs|json|md|txt|ya?ml|css|html|sql|py|go|rs|sh)\b/i;

/**
 * The section a line announces, or null. A heading is the section wording at
 * the start of the line, then a colon or the end of the line. Leading markdown
 * hashes are stripped first, so `Goal:` and `## Goal` both count and
 * `Goals are good` does not.
 */
function headingOf(line: string): SharpenSection | null {
  const stripped = line.replace(/^\s*#{1,6}\s*/, '').trim();
  if (stripped === '') return null;
  const lower = stripped.toLowerCase();
  for (const section of SHARPEN_SECTIONS) {
    for (const wording of SECTION_HEADINGS[section]) {
      if (!lower.startsWith(wording)) continue;
      const rest = lower.slice(wording.length).trimStart();
      if (rest === '' || rest.startsWith(':')) return section;
    }
  }
  return null;
}

/**
 * Everything under a heading: the rest of the heading line after its colon,
 * plus every line up to the next heading.
 */
function bodyOf(lines: string[], headings: Map<number, SharpenSection>, start: number): string {
  const head = lines[start] ?? '';
  const colon = head.indexOf(':');
  const parts: string[] = colon >= 0 ? [head.slice(colon + 1)] : [];
  for (let i = start + 1; i < lines.length; i += 1) {
    if (headings.has(i)) break;
    parts.push(lines[i] ?? '');
  }
  return parts.join('\n');
}

function isTestable(body: string): boolean {
  return (
    HAS_NUMBER.test(body) ||
    HAS_COMMAND.test(body) ||
    HAS_SLASH_PATH.test(body) ||
    HAS_FILE_NAME.test(body)
  );
}

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
}

/**
 * Check one candidate improved prompt.
 *
 * Three rules:
 *   1. All five checklist sections are present. A heading counts when the line
 *      starts with the section word and then ends or hits a colon. Both
 *      `Goal:` and `## Goal` count. `Goals are good` does not.
 *   2. The success criteria section names something testable: a number, a
 *      command to run, or a file path.
 *   3. The whole prompt stays under SHARPEN_WORD_LIMIT words.
 */
export function sharpenCheck(candidate: string): SharpenReport {
  const lines = candidate.split('\n');
  const headings = new Map<number, SharpenSection>();
  const firstLineOf = new Map<SharpenSection, number>();

  lines.forEach((line, index) => {
    const section = headingOf(line);
    if (!section) return;
    headings.set(index, section);
    if (!firstLineOf.has(section)) firstLineOf.set(section, index);
  });

  const sectionsFound = SHARPEN_SECTIONS.filter((section) => firstLineOf.has(section));
  const findings: SharpenFinding[] = [];

  for (const section of SHARPEN_SECTIONS) {
    if (firstLineOf.has(section)) continue;
    findings.push({
      rule: SharpenRule.MissingSection,
      message: 'No "' + SECTION_LABELS[section] + '" section. Add one line for it.',
      section,
    });
  }

  const criteriaLine = firstLineOf.get(SharpenSection.SuccessCriteria);
  if (criteriaLine !== undefined) {
    const body = bodyOf(lines, headings, criteriaLine);
    if (!isTestable(body)) {
      findings.push({
        rule: SharpenRule.VagueSuccessCriteria,
        message:
          'Nothing to measure in the success criteria. Name a number, a command in backticks, or a file.',
        section: SharpenSection.SuccessCriteria,
      });
    }
  }

  const wordCount = countWords(candidate);
  if (wordCount > SHARPEN_WORD_LIMIT) {
    findings.push({
      rule: SharpenRule.TooLong,
      message: wordCount + ' words. The limit is ' + SHARPEN_WORD_LIMIT + '. Cut it or link a file.',
    });
  }

  return {
    ok: findings.length === 0,
    wordCount,
    sectionsFound,
    findings,
  };
}
