// The command line behind /db:seed and /db:reset.
//
//   npx tsx src/db/cli.ts seed
//   npx tsx src/db/cli.ts reset
//   npx tsx src/db/cli.ts status
//
// It prints one line. That keeps the demo output short on a projector.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { counts, emptyDatabase, load, save, seedData } from './store.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(HERE, 'data.json');

export enum DbCommand {
  Seed = 'seed',
  Reset = 'reset',
  Status = 'status',
}

function main(): void {
  const arg = process.argv[2];
  switch (arg) {
    case DbCommand.Seed: {
      const db = seedData();
      save(DATA_FILE, db);
      const c = counts(db);
      console.log('seeded ' + c.customers + ' customers, ' + c.orders + ' orders');
      return;
    }
    case DbCommand.Reset: {
      save(DATA_FILE, emptyDatabase());
      console.log('reset: store is empty');
      return;
    }
    case DbCommand.Status: {
      const c = counts(load(DATA_FILE));
      console.log('store holds ' + c.customers + ' customers, ' + c.orders + ' orders');
      return;
    }
    default:
      console.log('usage: tsx src/db/cli.ts <seed|reset|status>');
      process.exitCode = 1;
  }
}

main();
