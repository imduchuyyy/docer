# AGENTS.md

Guidance for AI coding agents working in this repository. `CLAUDE.md` points here.

## What Docer is

Docer is a single AI agent that lives in a GitHub Actions workflow. It is triggered when
a pull request is merged, reads and understands that PR, and writes or maintains
architecture documentation in a **separate documentation repository**.

There is no server, no API, no hosted control plane and no frontend. A user installs the
action in each repository of their system (say three of them) and creates one docs repo;
a merge in any of the three triggers the agent, which analyses the PR and updates the
docs repo. `README.md` has the user-facing flow and the action reference.

## Stack

TypeScript on Node 24, shipped as a bundled JavaScript GitHub Action.

- **[Vercel AI SDK](https://ai-sdk.dev) (`ai` v7)** drives the agent loop, so Docer is
  provider-agnostic: `model` is a `<provider>:<model-id>` string handed to the SDK's own
  `createProviderRegistry` in `src/main.ts`, whose default separator is already `:`.
  Adding a provider means adding a `@ai-sdk/*` package and one entry in that registry.
  Each provider reads its own API key from the environment, so Docer never handles keys.
- **`@actions/core` / `@actions/github` / `@actions/exec`** for inputs, the Octokit
  client, and git.
- The agent's tools are **ours**, defined in `src/tools.ts` — the AI SDK loops over tools
  you define and ships none of its own. Every tool is scoped to the checked-out docs
  repo.

## Layout

| File | Role |
| --- | --- |
| `src/main.ts` | Provider registry, entry point, and the whole control flow. |
| `src/inputs.ts` | Reads and validates action inputs; masks every secret. |
| `src/pull-request.ts` | Gathers the merged PR — metadata, file list, diff. |
| `src/docs-repo.ts` | Clone, commit, and push the docs repo, with rebase-retry. |
| `src/tools.ts` | The `list_docs` / `read_doc` / `write_doc` tools. |
| `src/prompt.ts` | System prompt, task prompt, commit message. |

`dist/index.js` is the bundled action and **is committed** — GitHub runs it directly and
never installs dependencies. Rebuild with `npm run build` and commit `dist/` in the same
change as any `src/` edit, or the action ships stale code. CI enforces this: the build is
deterministic, so `.github/workflows/ci.yml` rebuilds and fails if `dist/` differs.

## Architecture consequences

These follow from the design and drive most implementation decisions:

- **Stateless by construction.** The only durable state is the content and git history of
  the docs repo. There is nothing else to read state from, so any context the agent needs
  on a later run has to be written into the docs repo on this one.
- **Fan-in, so writes race.** N source repos write to 1 docs repo, and merges in different
  repos are concurrent. `commitAndPush` therefore retries with a rebase and never
  force-pushes. A `concurrency` group in the workflow only serialises within a repository,
  never across them.
- **Cross-repo auth.** The workflow's `GITHUB_TOKEN` cannot write to the docs repo, which
  is why `docs-token` and `github-token` are separate inputs.
- **Re-runs must be idempotent.** A workflow can be re-run on the same merged PR. The docs
  describe current state, never history — that is what keeps a second run convergent, and
  it is why the prompt forbids changelog-style entries.
- **Doing nothing is a valid outcome.** Most merges do not change the architecture. The
  prompt biases hard towards writing nothing, and `main.ts` treats a clean `git status` as
  success, not failure.
- **Tool paths are model-controlled.** Every path from the model goes through the
  containment check in `src/tools.ts`; the escape tests in `src/tools.test.ts` cover it.
  Keep that guard in front of any new filesystem tool.
- **Everything runs on the user's runner.** Failures are visible only in their Actions
  logs, and PR content, diffs and model API keys stay in their environment.

## Commands

```sh
npm run build       # tsc, then bundle to dist/ with ncc — run before committing
npm run typecheck   # tsc --noEmit
npm test            # compile, then node --test over lib/
npm run all         # typecheck, test, build
node --test 'lib/**/*.test.js' --test-name-pattern 'escape'   # one test
```

CI runs `typecheck`, `test`, `build` and the `dist/` staleness gate on every push to
`main` and every pull request.

To exercise the entry point without a real event, point `GITHUB_EVENT_PATH` at a JSON
file containing a `pull_request` payload with `"merged": true` and set
`GITHUB_REPOSITORY`; with an empty `{}` it exits cleanly having done nothing.

## Conventions

`PLAN.md` holds the build order — follow it before adding a component.

When adding a tool, keep the description written for the model rather than for a
developer: it is the only instruction the model gets about when to reach for it.
