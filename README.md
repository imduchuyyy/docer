# Docer

Docer keeps the architecture documentation for a multi-repository system up to date,
automatically.

You install the Docer GitHub Action in each of your repositories and point them all at
one separate documentation repository. Whenever a pull request is merged in any of
them, the action runs an AI agent inside GitHub Actions: the agent reads the merged PR,
works out what it means for the system's architecture, and writes the update into the
docs repo.

There is no Docer server, no hosted control plane, and no account to create. The agent
runs entirely on your own GitHub Actions runners, and the documentation repository is
the only place any state lives.

## How it works

```
  repo-api    ──┐   PR merged
  repo-worker ──┤──> GitHub Action ──> agent reads the PR ──> commit / PR
  repo-web    ──┘    (per source repo)   + the existing docs      │
                                                                  v
                                                          repo-docs (docs repo)
```

1. A pull request is merged in one of your source repositories.
2. That repository's workflow fires and runs the Docer action.
3. The agent gathers the PR — title, description, diff, touched files — and checks out
   the docs repo to read the architecture as currently documented.
4. It decides whether the merge changed the architecture. If nothing meaningful
   changed, it stops and writes nothing.
5. If something did change, it edits the relevant documents and commits them back to
   the docs repo (or opens a pull request there, if you would rather review first).

Because every source repo writes into the same docs repo, the documentation describes
the whole system rather than any single repository.

## Setup

**1. Create a documentation repository**, e.g. `my-org/system-docs`. It can be empty;
the agent will establish the initial structure on the first merge it sees.

**2. Create a credential that can write to it.** A GitHub App installation token or a
fine-grained PAT with contents write access on the docs repo. The built-in
`GITHUB_TOKEN` will not work — it is scoped to the repository running the workflow, and
the agent needs to write to a different one. Add it as a secret (e.g. `DOCER_DOCS_TOKEN`)
in each source repository, along with your model API key.

**3. Add the workflow** to every repository that is part of the system:

```yaml
name: Docer

on:
  pull_request:
    types: [closed]

concurrency:
  group: docer-docs
  cancel-in-progress: false

jobs:
  document:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    steps:
      - uses: imduchuyyy/docer@v1
        with:
          docs-repo: my-org/system-docs
          docs-token: ${{ secrets.DOCER_DOCS_TOKEN }}
          model: anthropic:claude-opus-5
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

Repeat for each repository in the system, changing nothing but the workflow's location.
Every repo points at the same `docs-repo`.

## Choosing a model

Docer runs on the [Vercel AI SDK](https://ai-sdk.dev), so the model is a
`<provider>:<model-id>` string and any supported provider works:

| `model` | API key read from |
| --- | --- |
| `anthropic:claude-opus-5` (default) | `ANTHROPIC_API_KEY` |
| `openai:gpt-5` | `OPENAI_API_KEY` |
| `google:gemini-2.5-pro` | `GOOGLE_GENERATIVE_AI_API_KEY` |

Pass the key through the environment as above, or explicitly with the `api-key` input.
The agent needs solid long-context reasoning and reliable tool calling — it reads the
existing docs and a full PR diff before deciding what to change — so a frontier model is
the sensible default.

## Action reference

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `docs-repo` | yes | — | Documentation repository, as `owner/repo`. |
| `docs-token` | yes | — | Token with contents write access to the docs repo. |
| `docs-branch` | no | default branch | Branch of the docs repo to update. |
| `github-token` | no | `${{ github.token }}` | Reads the merged PR from the current repo. |
| `model` | no | `anthropic:claude-opus-5` | `<provider>:<model-id>`. |
| `api-key` | no | provider env var | Model provider API key. |
| `max-steps` | no | `40` | Maximum tool-use steps per run. |
| `max-diff-chars` | no | `200000` | Largest diff handed to the model. |

Outputs: `updated` (`"true"` when the docs repo changed) and `summary` (the agent's
closing account of what it did).

## Why a separate docs repository

- **One system, many repos.** The architecture spans repository boundaries, so the
  document that describes it cannot live inside any one of them.
- **Documentation gets its own history.** Doc changes are reviewable on their own and
  do not add noise to source pull requests.
- **Git is the datastore.** No database and no service to operate: the docs repo holds
  the content, and its commit history is the audit log of how the architecture evolved.

## Status

Early, and not yet released. The action runs end to end — it reads the merged PR, edits
the docs repo through the agent, and pushes — but it has not been exercised against real
repositories at scale. See `PLAN.md` for what is next.

## License

MIT — see `LICENSE`.
