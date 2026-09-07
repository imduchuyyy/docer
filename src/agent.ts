import * as core from "@actions/core";
import { generateText, isStepCount } from "ai";
import { resolveModel, type ModelRef } from "./model";
import { createDocsTools } from "./tools";
import { SYSTEM_PROMPT } from "./prompt";

export interface AgentRun {
  text: string;
  steps: number;
}

export async function runAgent(options: {
  modelRef: ModelRef;
  apiKey: string;
  docsDirectory: string;
  taskPrompt: string;
  maxSteps: number;
}): Promise<AgentRun> {
  const result = await generateText({
    model: resolveModel(options.modelRef, options.apiKey),
    system: SYSTEM_PROMPT,
    prompt: options.taskPrompt,
    tools: createDocsTools(options.docsDirectory),
    stopWhen: isStepCount(options.maxSteps),
    onStepEnd: (step) => {
      for (const call of step.toolCalls) {
        core.info(`tool: ${call.toolName}`);
      }
    },
  });

  return { text: result.text.trim(), steps: result.steps.length };
}
