# Mall of Anitoy storefront

Next.js 16 (App Router) shop for a real TikTok seller, running on AWS (Lambda + CloudFront + DynamoDB) and synced with TikTok Shop. Real customers' orders, money and personal data flow through this code, so correctness and data protection come before speed. README.md describes the architecture; this file holds the rules for changing it.

## Commands

| Command | Use |
| --- | --- |
| `npm run check` | Lint + typecheck + unit tests. Must pass before a change is done. |
| `npm test -- <path>` | Run one test file (vitest, `src/**/*.test.ts`). |
| `npm run dev` | Dev server on the local JSON store (`DATA_BACKEND=local`). |
| `npm --prefix infra run typecheck` | Typecheck the CDK stack after editing `infra/`. |

## Hard rules

These are enforced by hooks in `.claude/hooks/` where a check is possible. A hook block is a stop sign, not a puzzle: don't reach the same result another way (another command, an encoded path, a script that does it). Tell the user what was blocked and let them decide.

**Personal data and secrets**
- Never open, print, grep, copy or summarise `.env`, `.env.local` (or any `.env.*` except `.env.example`), anything under `.data/` (`store.json` holds orders with names, phones and addresses; `tiktok.json` holds OAuth tokens), `payments.json` or `cdk-outputs.json`. To learn a data shape, read the types in `src/lib/types.ts`.
- Search code with the Grep tool (it skips git-ignored files), not `grep -r` from the repo root.
- Test fixtures use obviously fake data (`0900000000`, `test@example.com`, `Nguyen Van A`). Never copy real order data into code, tests, commits or chat.
- No hard-coded secrets. Secrets come from env locally and Secrets Manager on AWS. Never put a secret in a `NEXT_PUBLIC_*` variable (those are inlined into the browser bundle). A new env var goes into `.env.example` with an empty value, the CDK stack and the README.

**Production**
- Never run `cdk deploy/destroy/bootstrap`, AWS CLI commands against the account, or scripts with `DATA_BACKEND=dynamodb` unless pointed at DynamoDB Local. The user runs anything that touches AWS.
- Merging to `master` deploys to production (`.github/workflows/deploy.yml`). Work on a feature branch, never commit on `master`, never force-push, and don't merge PRs or push unless the user asks.
- Changes to `infra/` or `.github/workflows/` change production: explain the effect (resources replaced? data retained?) before making them. Never change the table's `RemovalPolicy.RETAIN`, `deletionProtection` or point-in-time recovery, or the bucket retention.

## Domain invariants

Break one of these and the shop loses money, oversells or leaks customer data. If a request seems to need breaking one, stop and ask.

1. **Money is integer minor units** (VND has 0 decimals, so whole đồng). No floats in stored or compared amounts. Convert external decimals only with `toMinorUnits` / `fromMinorUnits` and format with `formatMoney` (`src/lib/money.ts`). Gateways have their own units (VNPay sends amount × 100): convert at the gateway boundary in `src/lib/payments/gateways.ts`.
2. **The server prices every order.** `buildQuote` (`src/lib/checkout/quote.ts`) re-prices on every quote and again when the order is placed. A price sent by the client is only used to detect that the price changed; it is never charged. Vouchers are re-checked on the server (code, dates, minimum spend) at both points.
3. **Stock moves atomically.** An order and its stock decrement are one `repo.placeOrder` call (a DynamoDB transaction; a lock in the local store). Never read stock and then write it, and never decrement outside `placeOrder`. A cancellation returns stock with `repo.restock`.
4. **Order state changes only through `applyOrderAction` and `recordOnlinePayment`** (`src/lib/orders.ts`). They save with `saveOrder(next, expectedUpdatedAt)` (optimistic locking), follow the `transitions` table and append to `history`. Never rewrite or drop history entries.
5. **An order is paid only after its gateway verified it.** The signature must check out and the amount must equal `order.total`, in `recordOnlinePayment`. Handlers are idempotent (gateways retry; the IPN and the browser return can both arrive). Return-URL parameters are never trusted without the signature check. Gateway defaults stay on the sandbox endpoints.
6. **Async work is at-least-once.** Every side effect in `src/lib/events/handlers.ts` runs inside `step(key, …)` so a retry skips work already done. Webhooks are verified (HMAC over the raw body) before anything else and de-duplicated with `claimEvent`.
7. **Customer data stays private.** An order holds name, phone, email, address, note, IP and user agent.
   - Log only ids, counts, statuses and amounts through `log` (`src/lib/log.ts`). Never log customer fields, whole orders, request bodies or headers. No `console.*` in `src/`.
   - Viewing an order needs its `accessToken`, compared in constant time (`getOrderForViewer`). "Find my order" (`lookupOrder`) returns masked name and phone only: never add the address, email, note or token to it.
   - Responses with order data use `json()` from `src/lib/http.ts` (`Cache-Control: no-store`). Order and admin pages are dynamic, never cached and never indexed.
   - Don't add personal data to analytics (TikTok Pixel, Events API), feeds, structured data or emails unless the user asks. The Events API gets only SHA-256-hashed phone and email.
8. **Admin is authenticated in one place.** `src/proxy.ts` puts `/admin` and `/api/admin/*` behind Basic auth. Every admin mutation also calls `requireAdminMutation` (same-origin JSON, which blocks CSRF). Never loosen `ADMIN_PATH` or the CloudFront origin check.
9. **Public endpoints validate everything.** Parse input with zod and bounded lengths. Anything that creates orders or reveals order data is rate limited per client IP (`clientIp()`). Errors don't reveal whether an order exists.
10. **Two repositories, one contract.** `Repository` (`src/lib/repo/types.ts`) has `local.ts` (dev JSON file) and `dynamo.ts` (production single table). Change both together, with the same semantics: atomicity, and `ConflictError` / `OutOfStockError` / `DuplicateOrderError` on the same conditions.
11. **Stored data outlives the code.** Production already holds orders and products in DynamoDB. New fields must be optional or have a fallback for older items. Never rename or remove stored fields or change key formats (`PK`/`SK`/`GSI1*`) without a migration plan the user has approved.
12. **Server code stays on the server.** `src/lib/config.ts`, `repo`, `orders`, `payments`, `tiktok` and `node:` modules are never imported from a `"use client"` file (`import type` is fine).
13. **Vietnamese first, two dictionaries.** Every visible string goes into both `src/i18n/dictionaries/vi.ts` and `en.ts`, with the same keys and placeholders (a test checks this).
14. **No invented facts.** Don't make up prices, stock, ratings, reviews, `compareAtPrice`, view counts, delivery times or policy claims. They reach Google Merchant Center and shoppers, and the seed catalog's numbers are placeholders. TikTok descriptions are plain text and are never rendered as HTML. `dangerouslySetInnerHTML` is only for the JSON-LD in `seo.tsx` and the theme script in `layout.tsx`.

## How to work here

1. **Understand first.** Read the module you are changing, its callers and its tests before editing. For external APIs (TikTok Shop, ZaloPay, MoMo, VNPay, AWS), follow the existing client code and the provider's docs, and never guess field names or signing rules. If something is ambiguous, ask.
2. **Plan anything risky.** Before touching orders, payments, stock, `repo/`, `proxy.ts`, auth, API routes or `infra/`, say which invariants above are involved and how the change keeps them.
3. **Keep changes small.** Do what was asked; no drive-by refactors, renames or reformatting. Ask before adding a dependency.
4. **Test business logic.** Add or update a vitest test next to the code for behaviour changes in `src/lib/`. Never delete, skip (`.skip`/`.only`) or loosen a test to get green. If a test's expectation looks wrong, say so and ask. No `@ts-ignore`, `@ts-nocheck` or file-wide `eslint-disable`.
5. **Verify.** `npm run check` must pass (the Stop hook runs it on changed code and sends failures back). For changes to orders, payments, stock, repo, auth, API routes or infra, also run the `invariant-reviewer` agent on the diff and fix or report what it finds.
6. **Report honestly.** Say what was verified and how, and what failed or was skipped. Never call something done if a check failed.

## Harness

`.claude/settings.json` wires these up. Change them only when the user asks; edits to them always ask for permission.

| Hook | What it does |
| --- | --- |
| `guard-bash.mjs` (PreToolUse: Bash, PowerShell) | Blocks reads of secret and PII files, AWS and CDK commands against the account, DynamoDB scripts not pointed at DynamoDB Local, commits on `master`, pushes to `master`, force pushes, `--no-verify`, `git add -f`, `git clean -x` and mass deletes. Asks before `npm run sync` (live TikTok API), new dependencies, hard resets and PR merges. |
| `guard-files.mjs` (PreToolUse: file tools) | Blocks reading or searching secret and PII files, edits to lockfiles, build output and other sessions' worktrees, and edits that add hard-coded secrets, secret `NEXT_PUBLIC_*` variables, personal data in logs, `console.*` in `src/`, `@ts-ignore`, skipped tests, or server imports in client components. |
| `review-edit.mjs` (PostToolUse: file tools) | After an edit to a sensitive module, reminds Claude of the invariants it touches (once per file per session). |
| `stop-check.mjs` (Stop) | When code changed, runs lint, typecheck and tests (and the infra typecheck if `infra/` changed) before Claude finishes, and sends failures back. Skips a diff that already passed. |
| `session-start.mjs` (SessionStart) | Warns when the checkout is on `master`. |
