import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogle } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export type ProviderName = "anthropic" | "openai" | "google";

export interface ModelRef {
  provider: ProviderName;
  modelId: string;
}

const API_KEY_ENV: Record<ProviderName, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
};

export function parseModelRef(value: string): ModelRef {
  const separator = value.indexOf(":");
  if (separator === -1) {
    throw new Error(
      `model must be "<provider>:<model-id>" (e.g. "anthropic:claude-opus-5"), got "${value}"`,
    );
  }
  const provider = value.slice(0, separator);
  const modelId = value.slice(separator + 1);
  if (!isProviderName(provider)) {
    throw new Error(
      `unknown provider "${provider}"; supported providers are ${Object.keys(API_KEY_ENV).join(", ")}`,
    );
  }
  if (!modelId) {
    throw new Error(`model id missing after "${provider}:"`);
  }
  return { provider, modelId };
}

export function apiKeyEnvVar(provider: ProviderName): string {
  return API_KEY_ENV[provider];
}

export function resolveModel(ref: ModelRef, apiKey: string): LanguageModel {
  switch (ref.provider) {
    case "anthropic":
      return createAnthropic({ apiKey })(ref.modelId);
    case "openai":
      return createOpenAI({ apiKey })(ref.modelId);
    case "google":
      return createGoogle({ apiKey })(ref.modelId);
  }
}

function isProviderName(value: string): value is ProviderName {
  return Object.prototype.hasOwnProperty.call(API_KEY_ENV, value);
}
