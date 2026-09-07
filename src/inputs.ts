import * as core from "@actions/core";

export interface Inputs {
  docsRepo: string;
  docsToken: string;
  githubToken: string;
  model: string;
}

export function readInputs(): Inputs {
  const docsRepo = core.getInput("docs-repo", { required: true });
  if (!/^[^/\s]+\/[^/\s]+$/.test(docsRepo)) {
    throw new Error(`docs-repo must be "owner/repo", got "${docsRepo}"`);
  }

  const docsToken = core.getInput("docs-token", { required: true });
  core.setSecret(docsToken);

  const githubToken = core.getInput("github-token", { required: true });
  core.setSecret(githubToken);

  return {
    docsRepo,
    docsToken,
    githubToken,
    model: core.getInput("model", { required: true }),
  };
}
