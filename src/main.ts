import * as core from "@actions/core";
import { readInputs } from "./inputs";
import {
  collectPullRequest,
  mergedPullRequestNumber,
} from "./pull-request";
import {
  checkoutDocsRepo,
  commitAndPush,
  hasChanges,
} from "./docs-repo";
import { runAgent } from "./agent";
import { buildTaskPrompt, commitMessage } from "./prompt";

async function run(): Promise<void> {
  const pullNumber = mergedPullRequestNumber();
  if (pullNumber === undefined) {
    core.info("This event is not a merged pull request; nothing to document.");
    core.setOutput("updated", "false");
    return;
  }

  const inputs = readInputs();
  const pullRequest = await collectPullRequest(
    inputs.githubToken,
    pullNumber,
    inputs.maxDiffChars,
  );
  core.info(
    `Documenting ${pullRequest.repo}#${pullRequest.number}: ${pullRequest.title}`,
  );

  const docsDirectory = await checkoutDocsRepo(
    inputs.docsRepo,
    inputs.docsToken,
    inputs.docsBranch,
  );

  const agent = await runAgent({
    modelRef: inputs.model,
    apiKey: inputs.apiKey,
    docsDirectory,
    taskPrompt: buildTaskPrompt(pullRequest),
    maxSteps: inputs.maxSteps,
  });
  core.info(`Agent finished after ${agent.steps} steps: ${agent.text}`);

  if (!(await hasChanges(docsDirectory))) {
    core.info("The agent left the documentation unchanged.");
    core.setOutput("updated", "false");
    core.setOutput("summary", agent.text);
    return;
  }

  await commitAndPush(docsDirectory, commitMessage(pullRequest));
  core.setOutput("updated", "true");
  core.setOutput("summary", agent.text);
}

run().catch((error: unknown) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
