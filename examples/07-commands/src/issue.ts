// The shape of one row in data/issues.json.
//
// `tools/issues.mjs` reads that file and prints it. This type is what the test
// suite holds the file to, so a hand edit that drops a field shows up as a
// failure and not as a blank column on the projector.

export type Tier = 'quick' | 'mid' | 'complex';

export type Issue = {
  number: number;
  title: string;
  state: 'open';
  area: string;
  tier: Tier;
  labels: string[];
  opened: string;
};

// The mix `/grab:next` hands back. Kept here so the test and the README agree
// with tools/issues.mjs.
export const NEXT_MIX: ReadonlyArray<readonly [Tier, number]> = [
  ['quick', 3],
  ['mid', 2],
  ['complex', 1],
];
