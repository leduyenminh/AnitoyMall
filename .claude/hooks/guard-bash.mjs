// PreToolUse guard for Bash and PowerShell commands: keeps secrets, customer data and production
// out of reach, and protects master. See CLAUDE.md, "Hard rules".

import { existsSync } from "node:fs";
import path from "node:path";
import { ask, currentBranch, deny, isMainBranch, projectDir, runGuard, SENSITIVE_HINT } from "./lib.mjs";

const SENSITIVE_IN_COMMAND = [
  /(^|[\s'"=:(/])\.env(\.(?!example\b)[\w.-]+)?(?=$|[\s'";|&)<>,])/i,
  /(^|[\s'"=:(/])\.data(?=$|[/\s'";|&)<>,])/i,
  /\b(payments|cdk-outputs|tiktok)\.json\b/i,
  /\.(pem|p12|pfx)\b/i,
];

// Printing environment variables that hold credentials.
const SECRET_ENV = /\$(\{|env:)?\w*(SECRET|PASSWORD|TOKEN|ACCESS_KEY|HASH|KEY1|KEY2|PRIVATE)\w*/i;
const ENV_DUMP = /^\s*(printenv|env|set|export\s+-p|(Get-ChildItem|gci|dir|ls)\s+env:)\s*$/i;

const LOCAL_ENDPOINT = /https?:\/\/(localhost|127\.0\.0\.1|\[::1\])/i;

/** Split on shell operators so each command can be checked on its own. */
const segmentsOf = (command) => command.split(/&&|\|\||[;|\n]/).map((s) => s.trim()).filter(Boolean);

/** Arguments after `git <sub>`, skipping git's own options such as `-C dir`. */
function gitArgs(segment) {
  const tokens = segment.match(/"[^"]*"|'[^']*'|\S+/g) ?? [];
  const start = tokens.findIndex((t) => /^git(\.exe)?$/i.test(t));
  if (start < 0) return null;
  let i = start + 1;
  while (i < tokens.length && tokens[i].startsWith("-")) i += /^(-C|-c|--git-dir|--work-tree)$/.test(tokens[i]) ? 2 : 1;
  return { sub: tokens[i], args: tokens.slice(i + 1).map((t) => t.replace(/^["']|["']$/g, "")) };
}

function checkGit(segment, root) {
  const git = gitArgs(segment);
  if (!git?.sub) return;
  const { sub, args } = git;
  const has = (...flags) => args.some((a) => flags.includes(a));
  const shortFlag = (letter) => args.some((a) => /^-[a-zA-Z]+$/.test(a) && a.includes(letter));

  if (has("--no-verify")) deny("`--no-verify` skips the repository's git hooks. Fix what the hook reports instead.");

  if (sub === "commit") {
    const branch = currentBranch(root);
    if (isMainBranch(branch)) {
      deny(`You are on ${branch}, and merging ${branch} deploys production. Create a feature branch first (git switch -c <name>).`);
    }
  }

  if (sub === "push") {
    if (has("--force", "--mirror", "--all") || shortFlag("f") || args.some((a) => a.startsWith("+"))) {
      deny("Force, mirror and push-all are not allowed. Push the feature branch normally, or ask the user.");
    }
    if (args.some((a) => /^(refs\/heads\/)?(master|main)$|:(refs\/heads\/)?(master|main)$/.test(a))) {
      deny("Pushing to master/main deploys production. Push a feature branch and open a pull request.");
    }
    const refspecs = args.filter((a) => !a.startsWith("-"));
    const pushesCurrent = refspecs.length < 2 || refspecs.slice(1).some((r) => /^(HEAD|@)$/.test(r));
    if (pushesCurrent && isMainBranch(currentBranch(root))) {
      deny("This push would update master/main, which deploys production. Push a feature branch instead.");
    }
    if (has("--force-with-lease", "--delete") || shortFlag("d")) ask("This rewrites or deletes a remote branch.");
  }

  if (sub === "add" && (has("--force") || shortFlag("f"))) {
    deny("`git add --force` adds ignored files, which here are secrets (.env*) and customer data (.data/).");
  }
  if (sub === "clean") {
    if (shortFlag("x") || shortFlag("X")) deny("`git clean -x` deletes ignored files, including .env.local and the local store in .data/.");
    if (shortFlag("f") || has("--force")) ask("`git clean -f` permanently deletes untracked files.");
  }
  if (sub === "reset" && has("--hard")) ask("`git reset --hard` discards uncommitted work.");
  if ((sub === "checkout" || sub === "restore") && args.some((a) => a === "." || a === ":/") && !has("--staged")) {
    ask("This discards uncommitted changes to the working tree.");
  }
  if (sub === "stash" && /^(drop|clear)$/.test(args[0] ?? "")) ask("This permanently deletes stashed work.");
  if (sub === "branch" && (has("-D") || (has("--delete") && has("--force")))) ask("This force-deletes a local branch.");
  if (sub === "filter-branch" || sub === "filter-repo") deny("History rewriting is not allowed here. Ask the user.");
}

const PROTECTED_DIRS = /^(\/|~|\.|\.\.|\*|\.\/\*|\.git|src|public|infra|scripts|\.claude|\$HOME|~\/|[a-z]:\/?|\/[a-z])$/i;

/** True when deleting `target` would remove the project or one of its top-level source folders. */
function isProtectedTarget(target, root) {
  const t = target.replace(/^["']|["']$/g, "").replace(/\\/g, "/").replace(/(.)\/+$/, "$1");
  if (PROTECTED_DIRS.test(t)) return true;
  // Absolute paths (C:/x or Git Bash's /c/x): protect the project root and every folder above it.
  const abs = t.replace(/^\/([a-z])(\/|$)/i, "$1:/");
  if (!/^[a-z]:\//i.test(abs)) return false;
  const rootPath = root.replace(/\\/g, "/").toLowerCase();
  const candidate = abs.toLowerCase().replace(/\/$/, "");
  return rootPath === candidate || rootPath.startsWith(`${candidate}/`);
}

const words = (s) => s.match(/"[^"]*"|'[^']*'|\S+/g) ?? [];

function checkDelete(segment, root) {
  const rm = segment.match(/^\s*(sudo\s+)?rm\s+(.*)$/i);
  if (rm) {
    const tokens = words(rm[2]);
    const recursive = tokens.some((t) => /^-[a-zA-Z]*[rR]/.test(t) || t === "--recursive");
    const targets = tokens.filter((t) => t && !t.startsWith("-"));
    if (recursive && targets.some((t) => isProtectedTarget(t, root))) deny(`Refusing a recursive delete of ${targets.join(" ")}.`);
  }
  const ps = segment.match(/^\s*(Remove-Item|ri|rmdir|rd|del|erase)\s+(.*)$/i);
  if (ps && /(^|\s)(-Recurse\b|\/s\b)/i.test(ps[2])) {
    // Skip PowerShell flags (-Force) and cmd switches (/s /q).
    const targets = words(ps[2]).filter((t) => !t.startsWith("-") && !/^\/[a-z?]$/i.test(t));
    if (targets.some((t) => isProtectedTarget(t, root))) deny(`Refusing a recursive delete of ${targets.join(" ")}.`);
  }
}

function checkProduction(segment) {
  // Anchored to the start of the command (after any VAR=value prefixes) so prose mentioning "aws" passes.
  const aws = segment.match(/^\s*(sudo\s+)?(\w+=\S*\s+)*aws(\.exe|\.cmd)?\s+(.*)$/i);
  if (aws) {
    const rest = aws[4];
    const harmless = /^(--version|help\b|sts\s+get-caller-identity\b|configure\s+list\b)/i.test(rest);
    const local = /--endpoint-url[=\s]+["']?https?:\/\/(localhost|127\.0\.0\.1)/i.test(rest);
    if (!harmless && !local) {
      deny("AWS CLI commands reach the production account (orders, secrets, media). Give the user the command to run instead.");
    }
  }
  if (/\b(aws-)?cdk(\.cmd)?\s+(\S+\s+)*?(deploy|destroy|bootstrap|import|watch|migrate|rollback|gc|refactor)\b/i.test(segment)) {
    deny("CDK deploys and stack changes are run by the user (or CI on master), never by Claude.");
  }
  if (/\bnpm(\.cmd)?\b.*\brun\s+(deploy|destroy)\b/i.test(segment)) deny("Deploys are run by the user (or CI on master).");
  if (/\bgh\s+(workflow\s+run|secret\b|variable\s+(set|delete)|repo\s+delete|release\s+delete)/i.test(segment)) {
    deny("This changes the repository's deploy settings, secrets or workflows on GitHub. Ask the user.");
  }
  if (/\bgh\s+pr\s+merge\b/i.test(segment)) ask("Merging into master deploys production.");
}

function checkDataScripts(command) {
  const dynamo = /DATA_BACKEND["']?\s*=\s*["']?dynamodb/i.test(command);
  const endpoint = command.match(/DYNAMODB_ENDPOINT["']?\s*=\s*["']?(\S+)/i);
  const localEndpoint = endpoint && LOCAL_ENDPOINT.test(endpoint[1]);
  if (dynamo && !localEndpoint) {
    deny("DATA_BACKEND=dynamodb without DYNAMODB_ENDPOINT=http://localhost:8000 would use the production table.");
  }
  if (/db:init|init-dynamodb/.test(command) && (/--seed-only/.test(command) || (endpoint && !localEndpoint))) {
    deny("db:init must only target DynamoDB Local; --seed-only is for the production table and is run by the user.");
  }
  if (/\bnpm(\.cmd)?\s+run\s+sync\b|scripts[/\\]sync\.ts/.test(command)) {
    ask("`npm run sync` calls the live TikTok Shop API with the shop's credentials and rewrites the local catalog.");
  }
}

function checkPackages(segment, root) {
  const tokens = segment.trim().split(/\s+/);
  if (/^(npm|pnpm|yarn)(\.cmd)?$/i.test(tokens[0] ?? "")) {
    let i = 1;
    while (i < tokens.length && tokens[i].startsWith("-")) i += /^(--prefix|-C|--dir|--cwd)$/.test(tokens[i]) ? 2 : 1;
    const sub = tokens[i] ?? "";
    const rest = tokens.slice(i + 1);
    const packages = rest.filter((t) => !t.startsWith("-"));
    if (/^publish$/i.test(sub)) deny("This package is private and must not be published.");
    if (/^(install|i|add|isntall)$/i.test(sub) && packages.length) {
      ask(`Adding or changing dependencies (${packages.join(", ")}) needs the user's OK.`);
    }
    if (/^(uninstall|remove|rm|un|update|upgrade|up)$/i.test(sub)) ask("Removing or upgrading dependencies needs the user's OK.");
    if (/^audit$/i.test(sub) && rest.includes("--force")) ask("`npm audit fix --force` can install breaking major versions.");
  }
  // npx downloads and runs any package that is not installed locally.
  if (/^npx(\.cmd)?$/i.test(tokens[0] ?? "")) {
    const name = tokens.slice(1).find((t) => !t.startsWith("-"));
    const bin = name?.replace(/^(@[^/]+\/)?([^@]+).*$/, "$2");
    const installed = [root, path.join(root, "infra")].some((dir) => bin && existsSync(path.join(dir, "node_modules", ".bin", bin)));
    if (name && !installed) ask(`npx would download and run "${name}" from the npm registry.`);
  }
}

await runGuard(async (input) => {
  const command = String(input.tool_input?.command ?? "");
  if (!command.trim()) return;
  const root = projectDir(input);
  const normal = command.replace(/\\/g, "/");

  if (SENSITIVE_IN_COMMAND.some((re) => re.test(normal))) {
    deny(`This command touches a protected file (.env*, .data/, payments.json, cdk-outputs.json, tiktok.json or a key). ${SENSITIVE_HINT}`);
  }
  if (SECRET_ENV.test(command)) deny("This command reads an environment variable that holds a credential. Don't print secrets.");
  if (/(curl|wget|iwr|irm|Invoke-WebRequest|Invoke-RestMethod)\b[^|]*\|\s*(sh|bash|zsh|iex|Invoke-Expression|node|python)\b/i.test(command)) {
    deny("Piping a download into an interpreter runs untrusted code.");
  }
  checkDataScripts(command);

  for (const segment of segmentsOf(command)) {
    if (ENV_DUMP.test(segment)) deny("Dumping the environment can print credentials.");
    checkProduction(segment);
    checkGit(segment, root);
    checkDelete(segment.replace(/\\/g, "/"), root);
    checkPackages(segment, root);
  }
});
