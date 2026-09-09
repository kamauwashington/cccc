# Solution snapshot

There is nothing to repair here. This example starts working and stays
working, the same way 02, 05, and 07 do. The demo is a prompt running and an
answer coming back in a shape, not a red suite going green.

`src/server.ts` is the file the prompt asks for. It is here as the fallback
for a run that stalls on stage:

```
npm run solution -- 08
```

`npm run reset -- 08` deletes it again.

Do not edit anything here during a demo.
