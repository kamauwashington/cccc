// Deterministic changelog renderer.
//
// This exists to prove one claim mechanically. Given the same version, the same
// history, and the same date, it returns the same bytes every time. The test in
// tests/repeatable.test.ts renders twice and compares.
//
// The /ship command does not call this. /ship writes CHANGELOG.md itself from
// the git output that the command injects. This module is the machine version
// of the same idea, so the repeatability claim in the README is checked and not
// just asserted.

import { parseHistory, releasable, sectionFor, Section, type Commit } from './parse.js';

export interface RenderOptions {
  /** ISO date stamped into the version header. */
  date: string;
}

const SECTION_ORDER: readonly Section[] = [Section.Added, Section.Fixed, Section.Changed];

/** One bullet. The short sha at the end is what traces the entry back to git. */
export function renderEntry(commit: Commit): string {
  const scope = commit.scope ? '**' + commit.scope + '**: ' : '';
  return '- ' + scope + commit.summary + ' (`' + commit.sha + '`)';
}

export function renderChangelog(
  version: string,
  historyText: string,
  options: RenderOptions
): string {
  const commits = releasable(parseHistory(historyText));
  const lines: string[] = ['# Changelog', '', '## ' + version + ' (' + options.date + ')', ''];

  for (const section of SECTION_ORDER) {
    const inSection = commits.filter((c) => sectionFor(c.kind) === section);
    if (inSection.length === 0) continue;
    lines.push('### ' + section, '');
    for (const commit of inSection) lines.push(renderEntry(commit));
    lines.push('');
  }

  return lines.join('\n');
}
