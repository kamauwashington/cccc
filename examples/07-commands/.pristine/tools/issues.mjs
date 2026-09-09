#!/usr/bin/env node
// The backlog reader. Every command in .claude/commands/grab/ injects one line
// of this script and gets fixed width rows back.
//
// The selection happens here, in code, before the model reads a token. That is
// the whole point of the example. Ask a model to "grab my next few issues" and
// you get a different six every time. Ask a command and you get the same six.
//
//   node tools/issues.mjs summary
//   node tools/issues.mjs next
//   node tools/issues.mjs complex
//   node tools/issues.mjs up-for-grabs [area]
//   node tools/issues.mjs teardown
//
// Output shape, the same for every subcommand:
//
//   line 1   the headline. What was asked and how many matched.
//   line 2   blank
//   rest     fixed width rows, lowest issue number first

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(HERE, '..', 'data', 'issues.json');

// The mix a normal day looks like. Three you can finish, two that take a while,
// one that will eat the afternoon.
const MIX = [
  ['quick', 3],
  ['mid', 2],
  ['complex', 1],
];
const COMPLEX_CHOICES = 3;

function load() {
  if (!fs.existsSync(DATA)) return null;
  return JSON.parse(fs.readFileSync(DATA, 'utf8'));
}

// Lowest number first, always. Same input, same order, same six issues.
function ordered(list) {
  return [...list].sort((a, b) => a.number - b.number);
}

function tier(issues, name) {
  return ordered(issues.filter((i) => i.state === 'open' && i.tier === name));
}

function rows(list) {
  return list
    .map((i) =>
      [
        '  #' + String(i.number),
        i.tier.padEnd(7),
        i.area.padEnd(13),
        i.title.padEnd(52),
        i.labels.join(' '),
      ].join('  ')
    )
    .join('\n');
}

function block(headline, list, empty) {
  return [headline, '', list.length ? rows(list) : '  ' + empty].join('\n');
}

// An unfilled $1 arrives as the literal text when a command is run with no
// argument. Treat that as no filter rather than an area nobody has.
function area(argv) {
  const raw = (argv[0] || '').trim();
  if (!raw || raw.startsWith('$')) return null;
  return raw.toLowerCase();
}

function summary(issues) {
  const counts = MIX.map(([name]) => tier(issues, name).length + ' ' + name);
  const grabs = issues.filter((i) => i.labels.includes('up-for-grabs')).length;
  const areas = [...new Set(issues.map((i) => i.area))].sort();

  return [
    'backlog  ' + issues.length + ' open  ' + counts.join('  ') + '  ' + grabs + ' up-for-grabs',
    '',
    ...areas.map((name) => '  ' + name.padEnd(14) + String(issues.filter((i) => i.area === name).length).padStart(3)),
  ].join('\n');
}

function next(issues) {
  const picked = MIX.flatMap(([name, n]) => tier(issues, name).slice(0, n));
  const shape = MIX.map(([name, n]) => n + ' ' + name).join('  ');

  return block('grab next  ' + picked.length + ' issues  ' + shape, picked, 'the backlog is empty');
}

function complex(issues) {
  const all = tier(issues, 'complex');
  const picked = all.slice(0, COMPLEX_CHOICES);

  return block(
    'grab complex  ' + picked.length + ' of ' + all.length + ' complex issues  pick one',
    picked,
    'no complex issues open'
  );
}

function upForGrabs(issues, argv) {
  const wanted = area(argv);
  const all = ordered(issues.filter((i) => i.state === 'open' && i.labels.includes('up-for-grabs')));
  const picked = wanted ? all.filter((i) => i.area === wanted) : all;
  const scope = wanted ? 'area=' + wanted : 'every area';

  return block(
    'grab up-for-grabs  ' + scope + '  showing ' + picked.length + ' of ' + all.length,
    picked,
    'nothing up for grabs' + (wanted ? ' in ' + wanted : '')
  );
}

function teardown() {
  if (!fs.existsSync(DATA)) {
    return 'teardown  data/issues.json is already gone  run npm run reset -- 07 to bring it back';
  }
  fs.rmSync(DATA);
  return 'teardown  data/issues.json deleted  run npm run reset -- 07 to bring it back';
}

const HELP = [
  'issues: read the order processing backlog from data/issues.json',
  '',
  'usage: node tools/issues.mjs <command> [area]',
  '',
  'commands:',
  '  summary                  open counts by tier and by area',
  '  next                     3 quick, 2 mid, 1 complex, lowest number first',
  '  complex                  the top 3 complex issues to choose between',
  '  up-for-grabs [area]      issues anyone can pick up',
  '  teardown                 delete data/issues.json',
  '',
  'Every command prints a headline, a blank line, then fixed width rows.',
].join('\n');

const [, , cmd, ...argv] = process.argv;

if (cmd === 'teardown') {
  console.log(teardown());
  process.exit(0);
}

const issues = load();
if (!issues && ['summary', 'next', 'complex', 'up-for-grabs'].includes(cmd)) {
  console.log('backlog  no data/issues.json  run npm run reset -- 07 to bring the backlog back');
  process.exit(0);
}

const out =
  cmd === 'summary'
    ? summary(issues)
    : cmd === 'next'
      ? next(issues)
      : cmd === 'complex'
        ? complex(issues)
        : cmd === 'up-for-grabs'
          ? upForGrabs(issues, argv)
          : HELP;

console.log(out);
