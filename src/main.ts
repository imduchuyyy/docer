import * as core from "@actions/core";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { createProviderRegistry, generateText, isStepCount } from "ai";
import { checkoutDocsRepo, commitAndPush, hasChanges } from "./docs-repo";
import { readInputs } from "./inputs";
import { buildTaskPrompt, commitMessage, SYSTEM_PROMPT } from "./prompt";
import { collectPullRequest, mergedPullRequestNumber } from "./pull-request";
import { createDocsTools } from "./tools";

const MAX_STEPS = 40;

const registry = createProviderRegistry({ anthropic, openai, google });

async function run(): Promise<void> {
  const pullNumber = mergedPullRequestNumber();
  if (pullNumber === undefined) {
    core.info("This event is not a merged pull request; nothing to document.");
    core.setOutput("updated", "false");
    return;
  }

  const inputs = readInputs();
  const model = registry.languageModel(
    inputs.model as Parameters<typeof registry.languageModel>[0],
  );

  const pullRequest = await collectPullRequest(inputs.githubToken, pullNumber);
  core.info(
    `Documenting ${pullRequest.repo}#${pullRequest.number}: ${pullRequest.title}`,
  );

  const docsDirectory = await checkoutDocsRepo(inputs.docsRepo, inputs.docsToken);

  const result = await generateText({
    model,
    system: SYSTEM_PROMPT,
    prompt: buildTaskPrompt(pullRequest),
    tools: createDocsTools(docsDirectory),
    stopWhen: isStepCount(MAX_STEPS),
    onStepEnd: (step) => {
      for (const call of step.toolCalls) {
        core.info(`tool: ${call.toolName}`);
      }
    },
  });

  const summary = result.text.trim();
  core.info(`Agent finished after ${result.steps.length} steps: ${summary}`);
  core.setOutput("summary", summary);

  if (!(await hasChanges(docsDirectory))) {
    core.info("The agent left the documentation unchanged.");
    core.setOutput("updated", "false");
    return;
  }

  await commitAndPush(docsDirectory, commitMessage(pullRequest));
  core.setOutput("updated", "true");
}

run().catch((error: unknown) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
