// Parses `git log --oneline` output into structured commits.
//
// The demo feeds this the contents of fixtures/history.txt. A real project
// would feed it the output of `git log --oneline v1.3.0..HEAD`. The shape of
// the two is identical, which is the whole reason the fixture works.

/** Conventional commit type, as it appears before the colon in a subject. */
export enum CommitKind {
  Feat = 'feat',
  Fix = 'fix',
  Perf = 'perf',
  Refactor = 'refactor',
  Docs = 'docs',
  Chore = 'chore',
  Other = 'other',
}

/** Changelog heading a commit kind is filed under. */
export enum Section {
  Added = 'Added',
  Fixed = 'Fixed',
  Changed = 'Changed',
}

export interface Commit {
  /** Short sha, exactly as git printed it. */
  sha: string;
  kind: CommitKind;
  /** Scope in parentheses, or an empty string when there is none. */
  scope: string;
  /** Subject with the type and scope prefix removed. */
  summary: string;
  /** The full original line, kept so entries can be traced back. */
  raw: string;
}

const LINE = /^([0-9a-f]{7,40})\s+(.*)$/;
const SUBJECT = /^([a-z]+)(?:\(([^)]+)\))?!?:\s*(.*)$/;

const KIND_BY_NAME = new Map<string, CommitKind>([
  ['feat', CommitKind.Feat],
  ['fix', CommitKind.Fix],
  ['perf', CommitKind.Perf],
  ['refactor', CommitKind.Refactor],
  ['docs', CommitKind.Docs],
  ['chore', CommitKind.Chore],
]);

/** Kinds that never earn a changelog entry. */
export const SKIPPED_KINDS: readonly CommitKind[] = [CommitKind.Chore, CommitKind.Docs];

export function sectionFor(kind: CommitKind): Section {
  switch (kind) {
    case CommitKind.Feat:
      return Section.Added;
    case CommitKind.Fix:
      return Section.Fixed;
    case CommitKind.Perf:
    case CommitKind.Refactor:
    case CommitKind.Docs:
    case CommitKind.Chore:
    case CommitKind.Other:
      return Section.Changed;
  }
}

export function parseHistory(text: string): Commit[] {
  const commits: Commit[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const m = LINE.exec(trimmed);
    if (!m) continue;
    const [, sha, subject] = m;
    const s = SUBJECT.exec(subject);
    if (!s) {
      commits.push({
        sha,
        kind: CommitKind.Other,
        scope: '',
        summary: subject,
        raw: trimmed,
      });
      continue;
    }
    const [, type, scope, summary] = s;
    commits.push({
      sha,
      kind: KIND_BY_NAME.get(type) ?? CommitKind.Other,
      scope: scope ?? '',
      summary,
      raw: trimmed,
    });
  }
  return commits;
}

/** The commits that belong in a changelog, in the order git printed them. */
export function releasable(commits: Commit[]): Commit[] {
  return commits.filter((c) => !SKIPPED_KINDS.includes(c.kind));
}
