import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { sharpenCheck } from '../src/sharpen-check';
import { conciseCheck } from '../src/concise-check';

// The demo output test. OUTPUT.md starts as a copy of the rough prompt in
// PROMPT.md, so this test starts red. The `sharpen` skill writes the five
// section block over it and the test goes green.
//
// Both checkers run here for a reason. `sharpen` says the block has the five
// sections and a criterion someone can measure. `concise` says the block reads
// like the rest of the repository. A sharpened prompt has to pass both.

const WS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = path.join(WS, 'OUTPUT.md');

describe('OUTPUT.md holds a sharpened prompt', () => {
  it('passes sharpenCheck and conciseCheck with no findings', () => {
    expect(fs.existsSync(OUTPUT), 'OUTPUT.md is missing. The sharpen skill writes it.').toBe(true);

    const text = fs.readFileSync(OUTPUT, 'utf8');
    const problems = [
      ...sharpenCheck(text).findings.map((f) => 'sharpen  ' + f.rule + '  ' + f.message),
      ...conciseCheck(text).findings.map((f) => 'concise  ' + f.rule + '  ' + f.message),
    ];

    expect(problems).toEqual([]);
  });
});
