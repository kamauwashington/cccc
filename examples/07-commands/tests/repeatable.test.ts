// The machine version of the demo's claim.
//
// The human version is running `/ship 1.4.0` twice and diffing the two files.
// This is the same check without a model in the loop. Same inputs, same bytes.

import { describe, expect, it } from 'vitest';
import { renderChangelog } from '../src/changelog/render.js';
import { checkChangelog } from '../src/changelog/validate.js';
import { historyText, SHIP_VERSION } from './helpers.js';

const DATE = '2026-03-11';

describe('deterministic renderer', () => {
  it('returns byte identical output when run twice', () => {
    const history = historyText();
    const first = renderChangelog(SHIP_VERSION, history, { date: DATE });
    const second = renderChangelog(SHIP_VERSION, history, { date: DATE });
    expect(second).toBe(first);
    expect(Buffer.from(second).equals(Buffer.from(first))).toBe(true);
  });

  it('stays identical across many runs', () => {
    const history = historyText();
    const runs = Array.from({ length: 20 }, () =>
      renderChangelog(SHIP_VERSION, history, { date: DATE })
    );
    expect(new Set(runs).size).toBe(1);
  });

  it('puts the version it was given in the header', () => {
    const out = renderChangelog('9.9.9', historyText(), { date: DATE });
    expect(out).toContain('## 9.9.9 (' + DATE + ')');
  });

  it('produces output that clears the same rules as a hand written changelog', () => {
    const history = historyText();
    const out = renderChangelog(SHIP_VERSION, history, { date: DATE });
    const problems = checkChangelog(out, { version: SHIP_VERSION, historyText: history });
    expect(problems.map((p) => p.rule + ': ' + p.detail)).toEqual([]);
  });
});
