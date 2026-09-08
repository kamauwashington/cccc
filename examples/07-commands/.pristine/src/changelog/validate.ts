// The rules a CHANGELOG.md has to satisfy.
//
// Used twice. Once against the file /ship writes, and once against the output
// of the deterministic renderer. Both have to clear the same bar.

const PLACEHOLDERS = ['todo', 'tbd', 'lorem', 'xxx', 'fixme', 'coming soon'];

export interface Problem {
  rule: string;
  detail: string;
}

export interface ChangelogShape {
  /** Text of the `## <version>` heading line, if one is there. */
  versionHeading: string | null;
  /** Section headings (`### Added`) mapped to their bullet lines. */
  sections: Map<string, string[]>;
  /** Every bullet in the file, in order. */
  bullets: string[];
}

export function readShape(text: string, version: string): ChangelogShape {
  const sections = new Map<string, string[]>();
  const bullets: string[] = [];
  let versionHeading: string | null = null;
  let current: string | null = null;
  let inVersion = false;

  for (const raw of text.split('\n')) {
    const line = raw.trimEnd();
    if (/^##\s+\S/.test(line) && !/^###/.test(line)) {
      inVersion = line.includes(version);
      if (inVersion) versionHeading = line;
      current = null;
      continue;
    }
    if (/^###\s+\S/.test(line)) {
      current = line.replace(/^###\s+/, '').trim();
      if (inVersion && !sections.has(current)) sections.set(current, []);
      continue;
    }
    if (/^\s*[-*]\s+\S/.test(line) && inVersion) {
      bullets.push(line.trim());
      if (current) sections.get(current)?.push(line.trim());
    }
  }

  return { versionHeading, sections, bullets };
}

/** Short shas that appear anywhere in the history text. */
export function shasIn(historyText: string): Set<string> {
  const out = new Set<string>();
  for (const m of historyText.matchAll(/\b[0-9a-f]{7}\b/g)) out.add(m[0]);
  return out;
}

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'into', 'that', 'this', 'when', 'than',
  'then', 'now', 'not', 'add', 'adds', 'added', 'use', 'uses', 'used',
]);

function significantWords(text: string): Set<string> {
  const out = new Set<string>();
  for (const w of text.toLowerCase().match(/[a-z]{4,}/g) ?? []) {
    if (!STOPWORDS.has(w)) out.add(w);
  }
  return out;
}

/** True when a bullet can be traced to a line in the history. */
export function tracesToHistory(bullet: string, historyText: string): boolean {
  const shas = shasIn(historyText);
  for (const sha of shas) {
    if (bullet.includes(sha)) return true;
  }
  const bulletWords = significantWords(bullet);
  for (const line of historyText.split('\n')) {
    if (!line.trim()) continue;
    const lineWords = significantWords(line);
    let shared = 0;
    for (const w of bulletWords) if (lineWords.has(w)) shared++;
    if (shared >= 2) return true;
  }
  return false;
}

export interface CheckOptions {
  version: string;
  historyText: string;
  /** How many distinct short shas the changelog has to mention. */
  minTracedShas?: number;
  /** How many bullets the release needs in total. */
  minBullets?: number;
}

export function checkChangelog(text: string, options: CheckOptions): Problem[] {
  const { version, historyText } = options;
  const minTracedShas = options.minTracedShas ?? 8;
  const minBullets = options.minBullets ?? 6;
  const problems: Problem[] = [];
  const shape = readShape(text, version);

  if (!shape.versionHeading) {
    problems.push({
      rule: 'version-header',
      detail: 'no `## ' + version + '` heading in CHANGELOG.md',
    });
    return problems; // nothing below this can be judged without the header
  }

  if (shape.sections.size === 0) {
    problems.push({ rule: 'sections', detail: 'the ' + version + ' release has no `###` sections' });
  }
  for (const [name, entries] of shape.sections) {
    if (entries.length === 0) {
      problems.push({ rule: 'sections', detail: 'section "' + name + '" has no entries' });
    }
  }

  if (shape.bullets.length < minBullets) {
    problems.push({
      rule: 'coverage',
      detail: 'only ' + shape.bullets.length + ' entries, expected at least ' + minBullets,
    });
  }

  const lower = text.toLowerCase();
  for (const word of PLACEHOLDERS) {
    if (lower.includes(word)) {
      problems.push({ rule: 'placeholder', detail: 'placeholder text "' + word + '" is still there' });
    }
  }

  const untraced = shape.bullets.filter((b) => !tracesToHistory(b, historyText));
  for (const b of untraced) {
    problems.push({ rule: 'traceable', detail: 'entry does not match any commit: ' + b });
  }

  const shas = shasIn(historyText);
  let mentioned = 0;
  for (const sha of shas) if (text.includes(sha)) mentioned++;
  if (mentioned < minTracedShas) {
    problems.push({
      rule: 'traceable',
      detail: 'only ' + mentioned + ' commit shas cited, expected at least ' + minTracedShas,
    });
  }

  return problems;
}
