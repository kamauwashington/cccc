// Command line front end for the two checkers. The skills call this on their
// own draft before they hand it back.
//
//   npx tsx src/cli.ts sharpen draft.txt
//   npx tsx src/cli.ts concise draft.txt
//
// Exit code 0 means the draft passes. Exit code 1 prints the findings.

import fs from 'node:fs';
import { sharpenCheck } from './sharpen-check';
import { conciseCheck } from './concise-check';

enum CheckName {
  Sharpen = 'sharpen',
  Concise = 'concise',
}

const USAGE = 'usage: npx tsx src/cli.ts <sharpen|concise> <file>';

function main(): number {
  const [name, file] = process.argv.slice(2);
  if (!name || !file) {
    console.error(USAGE);
    return 2;
  }
  if (name !== CheckName.Sharpen && name !== CheckName.Concise) {
    console.error('unknown check "' + name + '". ' + USAGE);
    return 2;
  }
  if (!fs.existsSync(file)) {
    console.error('no such file: ' + file);
    return 2;
  }

  const text = fs.readFileSync(file, 'utf8');

  if (name === CheckName.Sharpen) {
    const report = sharpenCheck(text);
    console.log(
      'sharpen: ' +
        report.wordCount +
        ' words, ' +
        report.sectionsFound.length +
        '/5 sections'
    );
    for (const f of report.findings) console.log('  fail  ' + f.rule + '  ' + f.message);
    if (report.ok) console.log('  ok');
    return report.ok ? 0 : 1;
  }

  const report = conciseCheck(text);
  console.log(
    'concise: ' +
      report.lineCount +
      ' lines, ' +
      Math.round(report.bulletRatio * 100) +
      '% bullets'
  );
  for (const f of report.findings) {
    const where = f.line > 0 ? ':' + f.line : '';
    console.log('  fail  ' + f.rule + where + '  ' + f.message);
  }
  if (report.ok) console.log('  ok');
  return report.ok ? 0 : 1;
}

process.exit(main());
