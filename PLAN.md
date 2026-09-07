# Building plan

Docer is a GitHub Actions agent that updates a separate docs repo when a PR is merged.
The old server-based plan (database schema, API, frontend, dashboard) is dropped — there
is no server and git is the datastore.

## Done

1. **Skeleton.** TypeScript action on the Vercel AI SDK, provider-agnostic via a
   `<provider>:<model-id>` input. PR context gathering, the four docs tools, the agent
   call, and rebase-retrying write-back are all in place and unit-tested.

## Next

2. **Docs repo format.** The agent currently invents the structure on an empty repo.
   Decide the layout deliberately: how system-level docs are separated from per-repository
   sections, and how the agent records what it already knows so a later run can find the
   right section. This is the contract everything else depends on.
3. **Prove the loop on real repositories.** Run it against a live multi-repo system and
   tune the prompt on what it actually does. The measure is not whether edits are good but
   whether "no change" fires on the merges that deserve it — a chatty agent makes the docs
   worse than no agent.
4. **Ship the action.** `action.yml` is written and CI fails on a stale `dist/`; still
   needed are release tags and the `README.md` setup path verified from scratch.
5. **Multi-repo hardening.** Several repos merging at once: the fan-in rebase path under
   real contention, scoping updates to the right section, and first-run behaviour against
   an empty docs repo.
6. **Cost and size control.** Large diffs are truncated bluntly at `max-diff-chars` today.
   Summarise or select from the diff instead, and decide what a run should be allowed to
   cost.

## Later

- **Pull-request mode** — open a PR against the docs repo instead of committing directly,
  for teams that want review.
- **MCP server** exposing the docs repo to coding agents and developers. Reads the same
  files locally; no hosted component.
- **Semantic search / vector index** over the docs, once there are enough of them for
  retrieval to beat reading the tree.
- **Interactive documentation UI** for onboarding, built from the docs repo as a static
  site.
