// PostToolUse hook for file edits: after Claude changes a sensitive module, remind it which
// CLAUDE.md invariants the change touches. Each reminder is given once per file per session.

import path from "node:path";
import { projectDir, readCache, readInput, relPath, writeCache } from "./lib.mjs";

const REMINDERS = [
  [/^src\/lib\/repo\//, "Repository (invariants 3, 10, 11): change local.ts and dynamo.ts together with the same semantics and errors; stock only moves in placeOrder/restock; existing DynamoDB items lack new fields; no key-format changes."],
  [/^src\/lib\/types\.ts$/, "Stored types (invariant 11): production already holds orders and products. Make new fields optional or default them, never rename or remove fields, and keep personal data out of logs, lookups and analytics (7)."],
  [/^src\/lib\/orders\.ts$/, "Orders (invariants 2-5, 7): server-side pricing via buildQuote, atomic placeOrder, state only through the transitions with saveOrder(next, expectedUpdatedAt), append-only history, paid only after a verified gateway amount, masked lookup."],
  [/^src\/lib\/(payments\/|money\.ts$)|^src\/app\/api\/(payments|orders)\//, "Money and payments (invariants 1, 5): integer minor units, gateway units converted at the boundary, signature verified before any state change, amount must equal order.total, idempotent under retries."],
  [/^src\/lib\/checkout\//, "Checkout (invariants 1, 2): integer amounts; the server re-prices and re-validates vouchers; client prices only detect changes."],
  [/^src\/lib\/events\/|^src\/workers\/|^src\/app\/api\/webhooks\//, "Async work (invariant 6): at-least-once delivery. Wrap each side effect in step(); verify webhook HMAC over the raw body before use; de-duplicate with claimEvent."],
  [/^src\/(proxy\.ts|lib\/admin-auth\.ts|lib\/http\.ts)$|^src\/app\/api\/admin\//, "Auth (invariant 8): /admin and /api/admin stay behind Basic auth in proxy.ts; admin mutations call requireAdminMutation; keep the CloudFront origin check."],
  [/^src\/app\/api\//, "Public endpoint (invariants 7, 9): zod-validate with bounded lengths, rate limit anything that creates or reveals orders, respond with json() (no-store), and never return customer data without the order's access token."],
  [/^src\/i18n\/dictionaries\//, "i18n (invariant 13): add the same keys and placeholders to both vi.ts and en.ts. Vietnamese is the primary locale."],
  [/^src\/(lib\/(feeds\/|structured-data\.ts|merchant\.ts)|data\/)/, "Catalog facts (invariant 14): these reach Google Merchant Center and shoppers. Never invent prices, stock, ratings, reviews, compare-at prices or policy claims."],
  [/^src\/lib\/tiktok\//, "TikTok (invariants 6, 7): follow the existing signing and API code; descriptions stay plain text; the Events API gets only hashed phone and email."],
  [/^src\/lib\/config\.ts$|^\.env\.example$/, "Config (Hard rules): secrets come from env locally and Secrets Manager on AWS, never NEXT_PUBLIC_*. A new variable goes into .env.example (empty), the CDK stack and the README."],
  [/^infra\//, "Production stack: explain the effect before finishing (resources replaced? data kept?). Keep RETAIN, deletion protection and PITR; keep IAM grants narrow; run npm --prefix infra run typecheck."],
  [/^\.github\/workflows\//, "CI/CD: deploy.yml deploys master to production with OIDC. Don't widen permissions, triggers or secrets usage without the user's OK."],
];

const input = await readInput().catch(() => ({}));
const root = projectDir(input);
const file = input.tool_input?.file_path ?? input.tool_input?.notebook_path;
const rel = file ? relPath(path.resolve(root, file), root) : null;
const hits = rel ? REMINDERS.filter(([re]) => re.test(rel)).map(([, text]) => text) : [];

if (hits.length) {
  const cacheName = `reminders-${String(input.session_id ?? "session").replace(/[^\w-]/g, "")}.json`;
  const seen = readCache(root, cacheName, {});
  if (!seen[rel]) {
    seen[rel] = true;
    writeCache(root, cacheName, seen);
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PostToolUse",
          additionalContext: `[AnitoyMall] You edited ${rel}. Check before finishing:\n- ${hits.join("\n- ")}`,
        },
      }),
    );
  }
}
