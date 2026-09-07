# Building plan

Docer is a GitHub Actions agent that updates a separate docs repo when a PR is merged.
The old server-based plan (database schema, API, frontend, dashboard) is dropped —
there is no server and git is the datastore.

1. **Docs repo format.** Decide the layout and front-matter of the documentation repo:
   how system-level docs are separated from per-repository sections, and how the agent
   records what it already knows. This is the contract everything else depends on, so
   it comes first.
2. **PR context.** CLI subcommand that reads the workflow event payload and gathers the
   merged PR — title, body, diff, touched files — into the input the agent reasons over.
3. **Agent loop.** Give the model the PR context plus the current docs and have it
   decide what, if anything, changed architecturally. Making "no change" the common,
   cheap outcome matters more than making large rewrites good.
4. **Write-back.** Check out the docs repo, apply the edits, commit or open a PR.
   Handle the fan-in race (re-fetch and retry, never force-push) and make re-running on
   the same PR converge instead of duplicating.
5. **Ship the action.** `action.yml`, release tags, docs-repo credential handling, and
   the setup path from `README.md` verified end to end on real repositories.
6. **Multi-repo hardening.** Run it across several repos at once: scoping updates to
   the right section, cross-repo consistency, sensible behaviour on the first-ever run
   against an empty docs repo.

## Later

- **MCP server** exposing the docs repo to coding agents and developers. Reads the same
  files locally; no hosted component.
- **Semantic search / vector index** over the docs, once there are enough of them for
  retrieval to beat reading the tree.
- **Interactive documentation UI** for onboarding, built from the docs repo as a static
  site.

## Schedule

- Week 1: Docs repo format
- Week 2: PR context
- Week 3: Agent loop
- Week 4: Write-back
- Week 5: Ship the action
- Week 6: Multi-repo hardening
