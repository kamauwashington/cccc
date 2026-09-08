import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  sharpenCheck,
  SharpenRule,
  SharpenSection,
  SHARPEN_WORD_LIMIT,
} from '../src/sharpen-check';

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');
const fixture = (name: string): string => fs.readFileSync(path.join(FIXTURES, name), 'utf8');
const rules = (text: string) => sharpenCheck(text).findings.map((f) => f.rule);

describe('good prompts pass', () => {
  it('accepts the colon style checklist', () => {
    const report = sharpenCheck(fixture('prompt-good.txt'));
    expect(report.findings).toEqual([]);
    expect(report.ok).toBe(true);
    expect(report.sectionsFound).toHaveLength(5);
  });

  it('accepts markdown headings for the same five sections', () => {
    const report = sharpenCheck(fixture('prompt-good-headings.txt'));
    expect(report.ok).toBe(true);
    expect(report.sectionsFound).toContain(SharpenSection.Avoid);
  });

  it('stays under the word limit', () => {
    expect(sharpenCheck(fixture('prompt-good.txt')).wordCount).toBeLessThan(SHARPEN_WORD_LIMIT);
  });
});

describe('missing sections', () => {
  it('names the two sections that are gone', () => {
    const report = sharpenCheck(fixture('prompt-bad-missing-sections.txt'));
    expect(report.ok).toBe(false);
    expect(report.findings).toHaveLength(2);
    expect(report.findings.map((f) => f.section)).toEqual([
      SharpenSection.OutputFormat,
      SharpenSection.Avoid,
    ]);
    expect(report.findings[0].rule).toBe(SharpenRule.MissingSection);
  });

  it('flags all five on a rough prompt', () => {
    const report = sharpenCheck(fixture('prompt-rough.txt'));
    expect(report.sectionsFound).toEqual([]);
    expect(report.findings).toHaveLength(5);
    expect(new Set(rules(fixture('prompt-rough.txt')))).toEqual(
      new Set([SharpenRule.MissingSection])
    );
  });
});

describe('success criteria have to be testable', () => {
  it('rejects a criterion with nothing to measure', () => {
    const report = sharpenCheck(fixture('prompt-bad-vague-criteria.txt'));
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0].rule).toBe(SharpenRule.VagueSuccessCriteria);
    expect(report.findings[0].section).toBe(SharpenSection.SuccessCriteria);
  });

  it('accepts a number, a command, or a file path', () => {
    const base = 'Goal: x\nConstraints: none\nOutput format: a diff\nAvoid: nothing\n';
    expect(rules(base + 'Success criteria: the suite runs in under 30 seconds.')).toEqual([]);
    expect(rules(base + 'Success criteria: `npm test` passes.')).toEqual([]);
    expect(rules(base + 'Success criteria: src/index.ts compiles.')).toEqual([]);
    expect(rules(base + 'Success criteria: it works nicely.')).toEqual([
      SharpenRule.VagueSuccessCriteria,
    ]);
  });
});

describe('word limit', () => {
  it('flags a prompt that grew into a document', () => {
    const report = sharpenCheck(fixture('prompt-bad-too-long.txt'));
    expect(report.wordCount).toBeGreaterThan(SHARPEN_WORD_LIMIT);
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0].rule).toBe(SharpenRule.TooLong);
    expect(report.findings[0].message).toContain(String(SHARPEN_WORD_LIMIT));
  });
});

describe('edges', () => {
  it('reports empty input as five missing sections', () => {
    const report = sharpenCheck('');
    expect(report.wordCount).toBe(0);
    expect(report.findings).toHaveLength(5);
  });

  it('does not treat a sentence that starts with a section word as a heading', () => {
    const report = sharpenCheck('Goals are good and constraints are better.');
    expect(report.sectionsFound).toEqual([]);
  });
});
