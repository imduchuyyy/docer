import * as assert from "node:assert/strict";
import { test } from "node:test";
import { apiKeyEnvVar, parseModelRef } from "./model";

test("parses a provider-qualified model reference", () => {
  assert.deepEqual(parseModelRef("anthropic:claude-opus-5"), {
    provider: "anthropic",
    modelId: "claude-opus-5",
  });
});

test("keeps colons that belong to the model id", () => {
  assert.equal(parseModelRef("openai:gpt-5:latest").modelId, "gpt-5:latest");
});

test("rejects a reference without a provider", () => {
  assert.throws(() => parseModelRef("claude-opus-5"), /<provider>:<model-id>/);
});

test("rejects an unknown provider", () => {
  assert.throws(() => parseModelRef("acme:m1"), /unknown provider "acme"/);
});

test("rejects an empty model id", () => {
  assert.throws(() => parseModelRef("google:"), /model id missing/);
});

test("maps each provider to its standard key variable", () => {
  assert.equal(apiKeyEnvVar("anthropic"), "ANTHROPIC_API_KEY");
  assert.equal(apiKeyEnvVar("google"), "GOOGLE_GENERATIVE_AI_API_KEY");
});
