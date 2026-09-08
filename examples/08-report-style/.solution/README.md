# Solution snapshot

The finished checker for 08-report-style. It ships as a stub that throws, so
21 of the 23 tests start red. The two that pass are the ones that read
`.claude/output-styles/report.md` without calling the checker.

- `src/report-check.ts` splits a report into sections, then runs seven passes
  in a fixed order: preamble, per section rules, heading order, missing Done,
  evidence, and length.

Nothing else changes. The tests, the fixtures, the output style, and the
config are already correct in the starting state.

Use it as the fallback when a run stalls:

```
npm run solution -- 08
```

That copies `src/` over the live file. Then `npm run typecheck` and `npm test`
both pass, 23 of 23. `npm run reset -- 08` puts the stub back.

Do not edit anything here during a demo.
