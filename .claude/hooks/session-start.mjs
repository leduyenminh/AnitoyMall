// SessionStart hook: tell Claude which branch the checkout is on, and warn when it is master.

import { currentBranch, isMainBranch, projectDir, readInput } from "./lib.mjs";

const input = await readInput().catch(() => ({}));
const branch = currentBranch(projectDir(input));
const context = isMainBranch(branch)
  ? `[AnitoyMall] This checkout is on ${branch}. Merging ${branch} deploys production, so create a feature branch before changing code (git switch -c <name>). Commits on ${branch} are blocked.`
  : branch
    ? `[AnitoyMall] Current branch: ${branch}.`
    : "";

if (context) {
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: context } }));
}
