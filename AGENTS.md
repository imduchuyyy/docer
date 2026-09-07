# AGENTS.md

Guidance for AI coding agents working in this repository. `CLAUDE.md` points here.

## What Docer is

Docer is a single AI agent that lives in a GitHub Actions workflow. It is triggered
when a pull request is merged, reads and understands that PR, and writes or maintains
architecture documentation in a **separate documentation repository**.

There is no server, no API, no hosted control plane and no frontend. A user installs
the action in each repository of their system (say three of them) and creates one docs
repo; a merge in any of the three triggers the agent, which analyses the PR and updates
the docs repo. `README.md` has the user-facing flow and the sample workflow.

## Architecture consequences

These follow from the design and drive most implementation decisions:

- **Stateless by construction.** The only durable state is the content and git history
  of the docs repo. There is nothing else to read state from, so any context the agent
  needs on a later run has to be written into the docs repo on this one.
- **Fan-in, so writes race.** N source repos write to 1 docs repo, and merges in
  different repos are concurrent. Pushes must tolerate losing a race: re-fetch, rebase
  or re-apply, and retry rather than force-push. A `concurrency` group in the workflow
  only serialises within a repository, never across them.
- **Cross-repo auth.** The workflow's `GITHUB_TOKEN` cannot write to the docs repo. A
  GitHub App installation token or fine-grained PAT is required, supplied as a secret.
- **Re-runs must be idempotent.** A workflow can be re-run on the same merged PR. The
  same PR processed twice should converge to the same docs, not duplicate sections.
- **Doing nothing is a valid outcome.** Most merges do not change the architecture. The
  agent should be biased towards writing nothing rather than churning the docs.
- **The docs repo needs internal scoping.** Docs must record which source repository
  each part came from, so the agent can update the right section, alongside
  system-level documents that no single repo owns.
- **Everything runs on the user's runner.** Failures are visible only in their Actions
  logs, and PR content, diffs and model API keys stay in their environment.

## Current state

The repo is a skeleton and does not yet implement the flow above:

- `main.go` → `cmd/` — a Cobra CLI rooted at the `docer` command. The action is
  expected to invoke this binary; PR analysis and docs-repo updating become
  subcommands.
- `database/` — an empty package left from an earlier server-based design. With no
  server and git as the datastore there is no database; treat it as vestigial and
  remove or repurpose it rather than building on it.

Cobra scaffolding in `main.go` and `cmd/root.go` still carries generator placeholders
(`NAME HERE <EMAIL ADDRESS>`, the sample long description, the unused `--toggle` flag).
Replace them as those files are touched; do not copy the pattern into new commands.

`PLAN.md` holds the build order — follow it before adding a component.

## Commands

```sh
go build ./...                       # build
go run . <subcommand>                # run the CLI
go test ./...                        # all tests
go test ./cmd/                       # one package
go test -run TestName ./cmd/         # one test
go vet ./...                         # vet
gofmt -l .                           # formatting check
```

Go 1.24.1, module `docer`; import paths are `docer/<pkg>`.
