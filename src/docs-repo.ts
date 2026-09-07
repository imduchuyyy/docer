import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import * as core from "@actions/core";
import { exec, getExecOutput } from "@actions/exec";

const COMMITTER_NAME = "docer";
const COMMITTER_EMAIL = "docer@users.noreply.github.com";
const PUSH_ATTEMPTS = 5;

export async function checkoutDocsRepo(
  repo: string,
  token: string,
): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "docer-docs-"));
  const url = `https://x-access-token:${token}@github.com/${repo}.git`;
  await exec("git", ["clone", url, directory], { silent: true });
  await exec("git", ["config", "user.name", COMMITTER_NAME], { cwd: directory });
  await exec("git", ["config", "user.email", COMMITTER_EMAIL], { cwd: directory });
  return directory;
}

export async function hasChanges(directory: string): Promise<boolean> {
  const status = await getExecOutput("git", ["status", "--porcelain"], {
    cwd: directory,
    silent: true,
  });
  return status.stdout.trim().length > 0;
}

export async function commitAndPush(
  directory: string,
  message: string,
): Promise<void> {
  await exec("git", ["add", "--all"], { cwd: directory });
  await exec("git", ["commit", "--message", message], { cwd: directory });

  for (let attempt = 1; attempt <= PUSH_ATTEMPTS; attempt++) {
    const push = await getExecOutput(
      "git",
      ["push", "--set-upstream", "origin", "HEAD"],
      { cwd: directory, ignoreReturnCode: true, silent: true },
    );
    if (push.exitCode === 0) {
      return;
    }
    if (attempt === PUSH_ATTEMPTS) {
      throw new Error(
        `could not push to the docs repository after ${PUSH_ATTEMPTS} attempts: ${push.stderr.trim()}`,
      );
    }
    core.info(
      `Push rejected (attempt ${attempt}/${PUSH_ATTEMPTS}); another repository pushed first. Rebasing.`,
    );
    await exec("git", ["pull", "--rebase"], { cwd: directory });
  }
}
