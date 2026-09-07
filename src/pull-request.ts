import { context, getOctokit } from "@actions/github";

export interface PullRequestContext {
  repo: string;
  number: number;
  title: string;
  body: string;
  author: string;
  baseRef: string;
  mergeCommitSha: string;
  files: string[];
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
  maxDiffChars: number,
): Promise<PullRequestContext> {
  const octokit = getOctokit(token);
  const { owner, repo } = context.repo;

  const details = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: pullNumber,
  });

  const diffResponse = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: pullNumber,
    mediaType: { format: "diff" },
  });
  const fullDiff = diffResponse.data as unknown as string;

  const files = await octokit.paginate(octokit.rest.pulls.listFiles, {
    owner,
    repo,
    pull_number: pullNumber,
    per_page: 100,
  });

  return {
    repo: `${owner}/${repo}`,
    number: pullNumber,
    title: details.data.title,
    body: details.data.body ?? "",
    author: details.data.user?.login ?? "unknown",
    baseRef: details.data.base.ref,
    mergeCommitSha: details.data.merge_commit_sha ?? "",
    files: files.map((file) => `${file.status} ${file.filename}`),
    diff: fullDiff.slice(0, maxDiffChars),
    diffTruncated: fullDiff.length > maxDiffChars,
  };
}
