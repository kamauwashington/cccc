# Solution snapshot

The finished `OUTPUT.md` for 03-prompt-craft. It is the five section block the
`sharpen` skill produces from the rough request in `PROMPT.md`.

`OUTPUT.md` ships as a copy of that rough request, so `tests/output.test.ts`
starts red with five missing sections. The other 25 tests cover the two
checkers and pass from the first run.

Nothing under `src/` changes. Both checkers, the CLI, the tests, the fixtures,
and the config are already correct in the starting state. This example is about
the skills firing, so the code they call has to work.

Use it as the fallback when a live run stalls:

```
npm run solution -- 03
```

That copies `OUTPUT.md` over the live file. Then `npm run typecheck` and
`npm test` both pass, 26 of 26. `npm run reset -- 03` puts the rough copy back.

Do not edit anything here during a demo.
