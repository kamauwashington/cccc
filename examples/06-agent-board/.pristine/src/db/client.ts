// PGlite is real Postgres compiled to WebAssembly. It runs inside this Node
// process. No Docker, no ports, no connection string.
//
// That matters here because the example uses `CREATE TYPE ... AS ENUM`. A
// SQLite stand in would not have `pg_enum` to check against.
import { PGlite } from '@electric-sql/pglite';
import path from 'node:path';

export interface DbOptions {
  /** Where to keep the data. Leave it out for an in memory database. */
  dataDir?: string;
}

/**
 * Creates a database. Nothing else in this project constructs a PGlite.
 * Everything takes one as an argument, so tests can hand over their own.
 */
export async function createDb(options: DbOptions = {}): Promise<PGlite> {
  const dataDir = options.dataDir ?? process.env.BOARD_DATA_DIR;
  return dataDir ? new PGlite(dataDir) : new PGlite();
}

/** The file backed location used by `npm run dev`. Gitignored. */
export function defaultDataDir(): string {
  return path.resolve(process.cwd(), '.tmp/board');
}
