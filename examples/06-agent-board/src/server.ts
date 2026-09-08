// Entry point for `npm run dev`. The demo never needs this. It is here so the
// board is a real service and not only a test fixture.
import { createApp } from './app';
import { createDb, defaultDataDir } from './db/client';
import { runMigrations } from './db/migrate';

const port = Number(process.env.PORT || 4006);
const db = await createDb({ dataDir: process.env.BOARD_DATA_DIR ?? defaultDataDir() });
await runMigrations(db);

createApp(db).listen(port, () => {
  console.log('agent board listening on http://localhost:' + port);
});
