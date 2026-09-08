import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { counts, emptyDatabase, load, save, seedData } from '../src/db/store.js';

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-07-'));

afterEach(() => {
  fs.rmSync(path.join(temp, 'data.json'), { force: true });
});

describe('json store', () => {
  it('reads an empty database when the file is missing', () => {
    expect(counts(load(path.join(temp, 'nope.json')))).toEqual({ customers: 0, orders: 0 });
  });

  it('round trips a save and a load', () => {
    const file = path.join(temp, 'data.json');
    save(file, seedData());
    expect(counts(load(file))).toEqual({ customers: 3, orders: 5 });
  });

  it('seeds the same rows every time', () => {
    expect(JSON.stringify(seedData())).toBe(JSON.stringify(seedData()));
  });

  it('empties the store on reset', () => {
    const file = path.join(temp, 'data.json');
    save(file, seedData());
    save(file, emptyDatabase());
    expect(counts(load(file))).toEqual({ customers: 0, orders: 0 });
  });
});
