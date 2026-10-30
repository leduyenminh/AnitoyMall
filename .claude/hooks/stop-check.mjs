// Stop hook: before Claude finishes, run lint, typecheck and tests on uncommitted code changes
// and send failures back so they get fixed (or reported). A change set that already passed is
// not checked again. To avoid loops, a second failure in a row is shown to the user instead.

import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { projectDir, readCache, readInput, writeCache } from "./lib.mjs";

const APP_CODE =
  /^(src|scripts)\/|^(package\.json|tsconfig\.json|eslint\.config\.mjs|next\.config\.ts|vitest\.config\.ts|cache-handler\.mjs)$/;
const INFRA_CODE = /^infra\/(lib\/|bin\/|package\.json$|tsconfig\.json$|cdk\.json$)/;
const OUTPUT_LINES = 60;

function changedFiles(root) {
  const out = execFileSync("git", ["-C", root, "status", "--porcelain=v1", "-z", "-uall"], { encoding: "utf8" });
  const entries = out.split("\0").filter(Boolean);
  const files = [];
  for (let i = 0; i < entries.length; i++) {
    const status = entries[i].slice(0, 2);
    files.push({ status, path: entries[i].slice(3) });
    if (/[RC]/.test(status)) i++; // the next entry is the rename source
  }
  return files;
}

function fingerprint(root, files) {
  const hash = createHash("sha256");
  for (const f of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
    const abs = path.join(root, f.path);
    hash.update(`${f.status} ${f.path}\n`);
    if (existsSync(abs)) hash.update(readFileSync(abs));
  }
  return hash.digest("hex");
}

function run(command, root) {
  return new Promise((resolve) => {
    const child = spawn(command, { cwd: root, shell: true, env: { ...process.env, FORCE_COLOR: "0", CI: "1" } });
    let output = "";
    child.stdout.on("data", (d) => (output += d));
    child.stderr.on("data", (d) => (output += d));
    const timer = setTimeout(() => child.kill(), 8 * 60_000);
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ command, code: code ?? 1, output: output.replace(/\x1b\[[0-9;]*m/g, "") });
    });
  });
}

const input = await readInput().catch(() => ({}));
const root = projectDir(input);

let files;
try {
  files = changedFiles(root).filter((f) => APP_CODE.test(f.path) || INFRA_CODE.test(f.path));
} catch {
  process.exit(0); // not a git checkout
}
if (!files.length) process.exit(0);

const print = readCache(root, "stop-check.json", {});
const current = fingerprint(root, files);
if (print.passed === current) process.exit(0);

const commands = [];
const skipped = [];
if (files.some((f) => APP_CODE.test(f.path))) {
  if (existsSync(path.join(root, "node_modules"))) commands.push("npm run lint", "npm run typecheck", "npm test");
  else skipped.push("app checks (run npm install first)");
}
if (files.some((f) => INFRA_CODE.test(f.path))) {
  if (existsSync(path.join(root, "infra", "node_modules"))) commands.push("npm --prefix infra run typecheck");
  else skipped.push("infra typecheck (run npm install in infra/ first)");
}

const results = await Promise.all(commands.map((c) => run(c, root)));
const failed = results.filter((r) => r.code !== 0);
const note = skipped.length ? `Skipped: ${skipped.join("; ")}.` : "";

if (!failed.length) {
  if (!skipped.length) writeCache(root, "stop-check.json", { passed: current, at: new Date().toISOString() });
  if (note) process.stdout.write(JSON.stringify({ systemMessage: `[AnitoyMall] Checks passed. ${note}` }));
  process.exit(0);
}

const details = failed
  .map((r) => `### ${r.command} (exit ${r.code})\n${r.output.trim().split(/\r?\n/).slice(-OUTPUT_LINES).join("\n")}`)
  .join("\n\n");

if (input.stop_hook_active) {
  // Already sent back once: let Claude stop, and make sure the user sees what is failing.
  process.stdout.write(
    JSON.stringify({ systemMessage: `[AnitoyMall] Checks still failing: ${failed.map((r) => r.command).join(", ")}. ${note}` }),
  );
} else {
  process.stdout.write(
    JSON.stringify({
      decision: "block",
      reason:
        `[AnitoyMall stop check] These checks fail on the uncommitted changes. Fix them, or if they cannot be fixed, ` +
        `tell the user exactly what fails and why. Never skip or weaken tests to get green. ${note}\n\n${details}`,
    }),
  );
}
