import { context, getOctokit } from "@actions/github";

const MAX_DIFF_CHARS = 200_000;

export interface PullRequestContext {
  repo: string;
  number: number;
  title: string;
  body: string;
  author: string;
  baseRef: string;
  changedFiles: number;
  diff: string;
  diffTruncated: boolean;
}

export function mergedPullRequestNumber(): number | undefined {
  const pullRequest = context.payload.pull_request;
  if (!pullRequest || pullRequest.merged !== true) {
    return undefined;
  }
  return pullRequest.number;
}

export async function collectPullRequest(
  token: string,
  pullNumber: number,
): Promise<PullRequestContext> {
  const octokit = getOctokit(token);
  const { owner, repo } = context.repo;
  const request = { owner, repo, pull_number: pullNumber };

  const details = await octokit.rest.pulls.get(request);
  const diffResponse = await octokit.rest.pulls.get({
    ...request,
    mediaType: { format: "diff" },
  });
  const fullDiff = diffResponse.data as unknown as string;

  return {
    repo: `${owner}/${repo}`,
    number: pullNumber,
    title: details.data.title,
    body: details.data.body ?? "",
    author: details.data.user?.login ?? "unknown",
    baseRef: details.data.base.ref,
    changedFiles: details.data.changed_files,
    diff: fullDiff.slice(0, MAX_DIFF_CHARS),
    diffTruncated: fullDiff.length > MAX_DIFF_CHARS,
  };
}
