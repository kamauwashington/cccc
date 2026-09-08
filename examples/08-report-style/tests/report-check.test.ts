import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  reportCheck,
  ReportHeading,
  ReportRule,
  REPORT_ORDER,
  REPORT_WORD_LIMIT,
  FILLER_BODIES,
} from '../src/report-check';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WS = path.resolve(HERE, '..');
const fixture = (name: string): string =>
  fs.readFileSync(path.join(WS, 'fixtures', name), 'utf8');
const rules = (name: string) => reportCheck(fixture(name)).findings.map((f) => f.rule);

describe('a report that follows the contract', () => {
  it('accepts all five headings, filled out', () => {
    const result = reportCheck(fixture('report-good-full.txt'));
    expect(result.findings).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.headings).toEqual(REPORT_ORDER);
    expect(result.sections).toHaveLength(5);
  });

  it('accepts a report that drops the headings with nothing under them', () => {
    const result = reportCheck(fixture('report-good-partial.txt'));
    expect(result.ok).toBe(true);
    expect(result.headings).toEqual([ReportHeading.Done, ReportHeading.Works]);
  });

  it('reads the markdown bold form of a heading', () => {
    const result = reportCheck(fixture('report-good-markdown.txt'));
    expect(result.ok).toBe(true);
    expect(result.headings).toEqual(REPORT_ORDER);
  });

  it('reads a curly apostrophe in "Doesn\'t work"', () => {
    const result = reportCheck(fixture('report-good-curly.txt'));
    expect(result.ok).toBe(true);
    expect(result.headings).toEqual([ReportHeading.Done, ReportHeading.DoesNotWork]);
  });

  it('keeps the body of each section', () => {
    const result = reportCheck(fixture('report-good-full.txt'));
    const fixed = result.sections.find((s) => s.heading === ReportHeading.Fixed);
    expect(fixed?.body).toContain('three units in the request');
    expect(fixed?.line).toBe(7);
  });
});

describe('a heading with nothing under it', () => {
  it('flags "nothing" and "none" as filler', () => {
    const result = reportCheck(fixture('report-bad-filler.txt'));
    expect(result.findings.map((f) => f.rule)).toEqual([
      ReportRule.FillerBody,
      ReportRule.FillerBody,
    ]);
    expect(result.findings.map((f) => f.heading)).toEqual([
      ReportHeading.DoesNotWork,
      ReportHeading.Suggestions,
    ]);
  });

  it('flags a heading with an empty body', () => {
    expect(rules('report-bad-empty.txt')).toEqual([ReportRule.EmptyBody]);
  });

  it('lists the filler words the style bans', () => {
    expect(FILLER_BODIES).toContain('nothing');
    expect(FILLER_BODIES).toContain('none');
  });
});

describe('order and completeness', () => {
  it('flags every heading that came after a later one', () => {
    const result = reportCheck(fixture('report-bad-order.txt'));
    expect(result.findings.map((f) => f.rule)).toEqual([
      ReportRule.OutOfOrder,
      ReportRule.OutOfOrder,
    ]);
    expect(result.findings.map((f) => f.heading)).toEqual([
      ReportHeading.Done,
      ReportHeading.Fixed,
    ]);
  });

  it('flags a heading that appears twice', () => {
    expect(rules('report-bad-duplicate.txt')).toEqual([ReportRule.DuplicateHeading]);
  });

  it('flags an invented heading', () => {
    const result = reportCheck(fixture('report-bad-unknown-heading.txt'));
    expect(result.findings.map((f) => f.rule)).toEqual([ReportRule.UnknownHeading]);
    expect(result.findings[0].message).toContain('Summary');
  });

  it('flags a report with no Done', () => {
    expect(rules('report-bad-missing-done.txt')).toEqual([ReportRule.MissingDone]);
  });
});

describe('preamble and evidence', () => {
  it('flags text before the first heading', () => {
    const result = reportCheck(fixture('report-bad-preamble.txt'));
    expect(result.findings.map((f) => f.rule)).toEqual([ReportRule.Preamble]);
    expect(result.findings[0].line).toBe(1);
  });

  it('flags fenced output, stack frames, and line numbers', () => {
    const result = reportCheck(fixture('report-bad-evidence.txt'));
    expect(new Set(result.findings.map((f) => f.rule))).toEqual(new Set([ReportRule.Evidence]));
    expect(result.findings).toHaveLength(4);
  });

  it('leaves a plain file name alone', () => {
    const result = reportCheck('Done. Renamed src/duration.ts.');
    expect(result.ok).toBe(true);
  });
});

describe('length', () => {
  it('caps the whole report at 200 words', () => {
    expect(REPORT_WORD_LIMIT).toBe(200);
    const result = reportCheck(fixture('report-bad-long.txt'));
    expect(result.wordCount).toBe(269);
    expect(result.findings.map((f) => f.rule)).toEqual([ReportRule.TooLong]);
  });

  it('counts words on a report that fits', () => {
    const result = reportCheck(fixture('report-good-full.txt'));
    expect(result.wordCount).toBe(146);
    expect(result.wordCount).toBeLessThan(REPORT_WORD_LIMIT);
  });
});

describe('edge cases', () => {
  it('has nothing to say about empty text', () => {
    const result = reportCheck('');
    expect(result).toMatchObject({ ok: true, wordCount: 0, sections: [], findings: [] });
  });

  it('treats an answer with no headings as preamble', () => {
    expect(reportCheck('I looked at the parser and it seems fine.').findings.map((f) => f.rule)).toEqual([
      ReportRule.Preamble,
    ]);
  });

  it('does not read an ordinary sentence as a heading', () => {
    const result = reportCheck('Done. Fixed the parser. Works. 18 tests pass.');
    expect(result.headings).toEqual([ReportHeading.Done]);
  });
});

describe('the checker agrees with the shipped output style', () => {
  const stylePath = path.join(WS, '.claude', 'output-styles', 'report.md');
  const style = fs.readFileSync(stylePath, 'utf8');

  it('is the style named in .claude/settings.json', () => {
    const settings = JSON.parse(fs.readFileSync(path.join(WS, '.claude', 'settings.json'), 'utf8'));
    expect(style).toContain('name: ' + settings.outputStyle);
  });

  it('names all five headings in order', () => {
    const positions = REPORT_ORDER.map((h) => style.indexOf('**' + h + '.**'));
    expect(positions.every((p) => p > 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('ships a worked example that passes its own contract', () => {
    const example = style.split('## Worked example')[1];
    expect(example).toBeTruthy();
    const result = reportCheck(example.trim());
    expect(result.findings).toEqual([]);
    expect(result.headings).toEqual(REPORT_ORDER);
  });
});
