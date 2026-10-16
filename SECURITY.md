# Security

Lorestep is a statically generated website with one server route. This is what it keeps, what it talks to, and how to report a hole in it.

## The model

- **No accounts.** There is no sign-in and nothing about you is stored on a server. The status, device and store you set per game, the price cache and the theme live in your browser's `localStorage`, under keys beginning `isitcanon/`.
- **One route runs per request.** `/api/prices` looks prices up on IsThereAnyDeal with a key that stays on the server (`ITAD_API_KEY`). Every other page is prerendered.
- **The database is read at build time.** `DATABASE_URL` is server-side only, never a `NEXT_PUBLIC_` variable, and never reaches the browser.
- **What the browser does load.** Better Stack's error script, whose application token is public by design: it says where reports go and grants nothing. Vercel Web Analytics, which is a no-op off Vercel.
- **No secrets in the repository.** `.env*` files are ignored by git except `.env.example`, which holds names and no values.

## Reporting

Open a [security advisory](https://github.com/akshit-bansal11/lorestep/security/advisories/new) on GitHub; it reaches the maintainer privately. Please do not open a public issue for something exploitable. Expect an acknowledgement within a week.
