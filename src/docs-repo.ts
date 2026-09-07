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
  branch: string,
): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "docer-docs-"));
  const url = `https://x-access-token:${token}@github.com/${repo}.git`;

  const cloned = await tryClone(url, directory, branch);
  if (!cloned) {
    throw new Error(
      `failed to clone ${repo}${branch ? ` (branch "${branch}")` : ""}; check docs-repo and the docs-token permissions`,
    );
  }

  await exec("git", ["config", "user.name", COMMITTER_NAME], { cwd: directory });
  await exec("git", ["config", "user.email", COMMITTER_EMAIL], {
    cwd: directory,
  });
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

  const branch = (
    await getExecOutput("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: directory,
      silent: true,
    })
  ).stdout.trim();

  for (let attempt = 1; attempt <= PUSH_ATTEMPTS; attempt++) {
    const push = await getExecOutput("git", ["push", "origin", `HEAD:${branch}`], {
      cwd: directory,
      ignoreReturnCode: true,
      silent: true,
    });
    if (push.exitCode === 0) {
      core.info(`Pushed to ${branch}.`);
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
    await exec("git", ["fetch", "--unshallow", "origin", branch], {
      cwd: directory,
      ignoreReturnCode: true,
      silent: true,
    });
    await exec("git", ["fetch", "origin", branch], {
      cwd: directory,
      silent: true,
    });
    await exec("git", ["rebase", `origin/${branch}`], { cwd: directory });
  }
}

async function tryClone(
  url: string,
  directory: string,
  branch: string,
): Promise<boolean> {
  if (branch) {
    const withBranch = await exec(
      "git",
      ["clone", "--depth", "1", "--branch", branch, url, directory],
      { ignoreReturnCode: true, silent: true },
    );
    if (withBranch === 0) {
      return true;
    }
    core.info(`Branch "${branch}" not found; cloning the default branch.`);
    await fs.rm(directory, { recursive: true, force: true });
    await fs.mkdir(directory, { recursive: true });
  }

  const plain = await exec("git", ["clone", "--depth", "1", url, directory], {
    ignoreReturnCode: true,
    silent: true,
  });
  return plain === 0;
}
