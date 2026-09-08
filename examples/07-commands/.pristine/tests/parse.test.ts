import { describe, expect, it } from 'vitest';
import { CommitKind, parseHistory, releasable, Section, sectionFor } from '../src/changelog/parse.js';
import { historyText } from './helpers.js';

describe('parseHistory', () => {
  it('reads every line of the fixture', () => {
    const commits = parseHistory(historyText());
    expect(commits.length).toBe(15);
    expect(commits[0].sha).toBe('a41c9e2');
    expect(commits[0].kind).toBe(CommitKind.Feat);
    expect(commits[0].scope).toBe('orders');
  });

  it('drops chore and docs commits from a release', () => {
    const commits = releasable(parseHistory(historyText()));
    expect(commits.length).toBe(12);
    expect(commits.some((c) => c.kind === CommitKind.Chore)).toBe(false);
    expect(commits.some((c) => c.kind === CommitKind.Docs)).toBe(false);
  });

  it('files each kind under a heading', () => {
    expect(sectionFor(CommitKind.Feat)).toBe(Section.Added);
    expect(sectionFor(CommitKind.Fix)).toBe(Section.Fixed);
    expect(sectionFor(CommitKind.Perf)).toBe(Section.Changed);
    expect(sectionFor(CommitKind.Refactor)).toBe(Section.Changed);
  });

  it('ignores blank lines and keeps unconventional subjects', () => {
    const commits = parseHistory('\n\n1234567 tidy up the readme\n');
    expect(commits.length).toBe(1);
    expect(commits[0].kind).toBe(CommitKind.Other);
    expect(commits[0].summary).toBe('tidy up the readme');
  });
});
