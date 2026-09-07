import * as core from "@actions/core";
import { apiKeyEnvVar, parseModelRef, type ModelRef } from "./model";

export interface Inputs {
  docsRepo: string;
  docsBranch: string;
  docsToken: string;
  githubToken: string;
  model: ModelRef;
  apiKey: string;
  maxSteps: number;
  maxDiffChars: number;
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

  const model = parseModelRef(core.getInput("model", { required: true }));

  const apiKey =
    core.getInput("api-key") || process.env[apiKeyEnvVar(model.provider)] || "";
  if (!apiKey) {
    throw new Error(
      `no API key for provider "${model.provider}": set the api-key input or the ${apiKeyEnvVar(model.provider)} environment variable`,
    );
  }
  core.setSecret(apiKey);

  return {
    docsRepo,
    docsBranch: core.getInput("docs-branch"),
    docsToken,
    githubToken,
    model,
    apiKey,
    maxSteps: readPositiveInt("max-steps"),
    maxDiffChars: readPositiveInt("max-diff-chars"),
  };
}

function readPositiveInt(name: string): number {
  const raw = core.getInput(name, { required: true });
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer, got "${raw}"`);
  }
  return value;
}
