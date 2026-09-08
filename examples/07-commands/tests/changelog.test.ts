// The forcing function for /ship.
//
// These fail at the start because CHANGELOG.md does not exist yet. Running
// `/ship 1.4.0` is what makes them pass.

import { describe, expect, it } from 'vitest';
import { checkChangelog, readShape, tracesToHistory } from '../src/changelog/validate.js';
import { changelogText, historyText, SHIP_VERSION } from './helpers.js';

describe('CHANGELOG.md', () => {
  it('exists', () => {
    expect(
      changelogText(),
      'CHANGELOG.md is missing. Run `/ship ' + SHIP_VERSION + '` to write it.'
    ).not.toBeNull();
  });

  it('has a version header matching the argument that was passed', () => {
    const text = changelogText();
    if (text === null) throw new Error('CHANGELOG.md is missing');
    const shape = readShape(text, SHIP_VERSION);
    expect(shape.versionHeading).toContain(SHIP_VERSION);
  });

  it('has sections and none of them are empty', () => {
    const text = changelogText();
    if (text === null) throw new Error('CHANGELOG.md is missing');
    const shape = readShape(text, SHIP_VERSION);
    expect(shape.sections.size).toBeGreaterThan(0);
    for (const [name, entries] of shape.sections) {
      expect(entries.length, 'section "' + name + '" is empty').toBeGreaterThan(0);
    }
  });

  it('holds no placeholder text', () => {
    const text = changelogText();
    if (text === null) throw new Error('CHANGELOG.md is missing');
    const lower = text.toLowerCase();
    for (const word of ['todo', 'tbd', 'lorem', 'fixme']) {
      expect(lower.includes(word), 'found placeholder "' + word + '"').toBe(false);
    }
  });

  it('traces every entry back to a line in fixtures/history.txt', () => {
    const text = changelogText();
    if (text === null) throw new Error('CHANGELOG.md is missing');
    const history = historyText();
    const shape = readShape(text, SHIP_VERSION);
    expect(shape.bullets.length).toBeGreaterThanOrEqual(6);
    const orphans = shape.bullets.filter((b) => !tracesToHistory(b, history));
    expect(orphans, 'entries with no matching commit').toEqual([]);
  });

  it('passes every rule at once', () => {
    const text = changelogText();
    if (text === null) throw new Error('CHANGELOG.md is missing');
    const problems = checkChangelog(text, {
      version: SHIP_VERSION,
      historyText: historyText(),
    });
    expect(problems.map((p) => p.rule + ': ' + p.detail)).toEqual([]);
  });
});
