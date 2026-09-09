// The output contract, as code.
//
// `tools/board.mjs` prints a headline, a blank line, then indented rows. The
// README teaches that shape and `tests/format.test.ts` holds the tool to it.
// Nothing in the demo calls this. It exists so the contract cannot drift.

export type BoardOutput = {
  headline: string;
  rows: string[];
};

export function parseBoardOutput(text: string): BoardOutput {
  const lines = text.replace(/\n+$/, '').split('\n');
  const headline = lines[0] ?? '';
  if (lines[1] !== '') throw new Error('line 2 must be blank, got: ' + JSON.stringify(lines[1]));
  return { headline, rows: lines.slice(2).filter((l) => l.trim().length > 0) };
}

// "showing 3 of 59" is how every headline reports a count.
export function showingCount(headline: string): { shown: number; total: number } {
  const m = headline.match(/showing (\d+) of (\d+)/);
  if (!m) throw new Error('headline has no "showing N of M": ' + headline);
  return { shown: Number(m[1]), total: Number(m[2]) };
}
