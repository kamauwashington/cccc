import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  conciseCheck,
  BANNED,
  BannedPhraseId,
  ConciseRule,
  CONCISE_LINE_LIMIT,
  CONCISE_BULLET_RATIO_LIMIT,
} from '../src/concise-check';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.resolve(HERE, '..', 'fixtures');
const fixture = (name: string): string => fs.readFileSync(path.join(FIXTURES, name), 'utf8');
const phrases = (name: string) =>
  conciseCheck(fixture(name))
    .findings.filter((f) => f.rule === ConciseRule.BannedPhrase)
    .map((f) => f.phrase);

describe('good prose passes', () => {
  it('accepts plain short prose', () => {
    const report = conciseCheck(fixture('prose-good.txt'));
    expect(report.findings).toEqual([]);
    expect(report.ok).toBe(true);
    expect(report.bulletLines).toBe(0);
  });

  it('accepts a bulleted list that still has prose around it', () => {
    const report = conciseCheck(fixture('prose-good-bulleted.txt'));
    expect(report.ok).toBe(true);
    expect(report.bulletLines).toBe(4);
    expect(report.proseLines).toBe(2);
    expect(report.bulletRatio).toBeLessThanOrEqual(CONCISE_BULLET_RATIO_LIMIT);
  });

  it('honors the ignore marker and skips fenced blocks', () => {
    const report = conciseCheck(fixture('prose-good-suppressed.txt'));
    expect(report.findings).toEqual([]);
  });
});

describe('banned phrases', () => {
  it('catches both dashes', () => {
    expect(phrases('prose-bad-dashes.txt')).toEqual([
      BannedPhraseId.EmDash,
      BannedPhraseId.EnDash,
    ]);
  });

  it('catches every filler opener', () => {
    expect(phrases('prose-bad-filler.txt')).toEqual([
      BannedPhraseId.ItIsWorthNoting,
      BannedPhraseId.ItsWorthNoting,
      BannedPhraseId.Importantly,
      BannedPhraseId.ItShouldBeNoted,
      BannedPhraseId.NeedlessToSay,
      BannedPhraseId.InTodaysWorld,
    ]);
  });

  it('catches the jargon words', () => {
    expect(phrases('prose-bad-jargon.txt')).toEqual([
      BannedPhraseId.DelveInto,
      BannedPhraseId.Leverage,
      BannedPhraseId.AtTheEndOfTheDay,
    ]);
  });

  it('catches the not X but Y shape', () => {
    expect(phrases('prose-bad-not-x-but-y.txt')).toEqual([BannedPhraseId.NotXButY]);
  });

  it('reports the line number and a fix', () => {
    const finding = conciseCheck(fixture('prose-bad-dashes.txt')).findings[0];
    expect(finding.line).toBe(1);
    expect(finding.fix).toBe('Use a period, a comma, or parentheses.');
  });

  it('leaves the word "leverage ratio" alone', () => {
    expect(conciseCheck('The leverage ratio is 3 to 1.').ok).toBe(true);
  });
});

describe('shape rules', () => {
  it('flags text that ran past the line limit', () => {
    const report = conciseCheck(fixture('prose-bad-long.txt'));
    expect(report.lineCount).toBe(45);
    expect(report.findings.map((f) => f.rule)).toEqual([ConciseRule.TooManyLines]);
    expect(report.findings[0].message).toContain(String(CONCISE_LINE_LIMIT));
  });

  it('flags a wall of bullets', () => {
    const report = conciseCheck(fixture('prose-bad-bullets.txt'));
    expect(report.bulletRatio).toBe(0.9);
    expect(report.findings.map((f) => f.rule)).toEqual([ConciseRule.BulletHeavy]);
  });

  it('ignores the bullet ratio on very short text', () => {
    expect(conciseCheck('- one\n- two\n- three').ok).toBe(true);
  });

  it('reports zeros for empty text', () => {
    const report = conciseCheck('');
    expect(report).toMatchObject({ ok: true, lineCount: 0, bulletRatio: 0 });
  });
});

describe('the banned list agrees with the root linter', () => {
  it('has one entry per id', () => {
    expect(BANNED).toHaveLength(Object.keys(BannedPhraseId).length);
    expect(new Set(BANNED.map((b) => b.id)).size).toBe(BANNED.length);
  });

  it('matches every label in scripts/lint-prose.mjs', () => {
    const linter = path.resolve(HERE, '..', '..', '..', 'scripts', 'lint-prose.mjs');
    // The workspace also runs on its own, copied out of the repository. Skip
    // the comparison when the root linter is not next to us.
    if (!fs.existsSync(linter)) return;
    const source = fs.readFileSync(linter, 'utf8').replace(/\\'/g, "'");
    for (const rule of BANNED) {
      expect(source).toContain("label: '" + rule.label + "'");
      expect(source).toContain("fix: '" + rule.fix + "'");
    }
    expect(source.match(/label: '/g)).toHaveLength(BANNED.length);
  });
});
