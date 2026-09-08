<!-- The sharpened prompt lands here. This file starts as a copy of PROMPT.md. -->

The orders page keeps timing out and everyone is complaining. We looked at it
last sprint and never finished. I think the endpoint hands back way too much at
once, so maybe pagination, maybe caching, maybe both. The frontend only shows
25 rows at a time anyway. Whatever we do has to keep working for the clients we
already have, and the query helpers in there are a mess, so please leave those
alone. The team wants something they can ship this week. Write this up as a
proper task before anyone starts on it.
