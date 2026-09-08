// The seed data, and the rule for when it appears on its own.
//
// A demo that starts with a setup step is a demo that falls flat when someone
// skips the setup step. So the board fills itself the first time it is opened
// empty, and `npm run seed` stays around for a deliberate reset.

export const SEED_COUNT = Number(process.env.BOARD_SEED_COUNT || 320);

const CHANNELS = ['general', 'deploys', 'incidents', 'hiring', 'support', 'random'];
const AUTHORS = ['alice', 'bo', 'chen', 'dara', 'eli', 'fern', 'gus', 'hana'];
const SUBJECTS = [
  'the staging rollout',
  'the flaky auth test',
  'the nightly backup',
  'the onboarding doc',
  'the search index',
  'the rate limiter',
  'the invoice job',
  'the queue backlog',
];
const VERBS = ['is green again', 'needs a second pair of eyes', 'is blocked on review', 'shipped', 'is rolled back', 'is slower than yesterday'];
const TAILS = [
  'I will pick it up in the morning.',
  'No action needed from anyone else.',
  'Filed as a follow up.',
  'Numbers are in the thread.',
  'Reverting was the cheap option.',
  'Adding a metric so we see it next time.',
];

// A tiny deterministic pseudo random generator (mulberry32).
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rand, list) {
  return list[Math.floor(rand() * list.length)];
}

// Deterministic on purpose. The same seed gives the same rows every time, so
// the token numbers in the README stay honest across machines.
export function seedRowValues(count = SEED_COUNT) {
  const rand = rng(20260906);
  // One base time so every run produces the same timestamps.
  const base = Date.UTC(2026, 7, 1, 9, 0, 0);
  const rows = [];
  for (let i = 0; i < count; i++) {
    const at = new Date(base + i * 97 * 60 * 1000).toISOString();
    const body = `${pick(rand, SUBJECTS)} ${pick(rand, VERBS)}. ${pick(rand, TAILS)}`;
    rows.push([pick(rand, CHANNELS), pick(rand, AUTHORS), body, at]);
  }
  return rows;
}

export async function seedRows(db, count = SEED_COUNT) {
  const rows = seedRowValues(count);
  const values = rows.map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`).join(',');
  await db.query(
    `INSERT INTO messages (channel, author, body, created_at) VALUES ${values}`,
    rows.flat()
  );
  return rows.length;
}

// Called on every open. Costs one count query, and only does work on a board
// that has nothing in it. Set BOARD_NO_AUTOSEED=1 to keep an empty board empty.
export async function seedIfEmpty(db) {
  if (process.env.BOARD_NO_AUTOSEED) return 0;
  const { rows } = await db.query('SELECT count(*)::int AS n FROM messages');
  if (rows[0].n > 0) return 0;
  const n = await seedRows(db);
  // stderr, so a pipe into jq or wc still sees only the payload.
  process.stderr.write(`board: empty database, seeded ${n} messages\n`);
  return n;
}
