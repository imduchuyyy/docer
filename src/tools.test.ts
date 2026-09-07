import * as assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import { createDocsTools } from "./tools";

async function withDocsRoot(
  body: (root: string, tools: ReturnType<typeof createDocsTools>) => Promise<void>,
): Promise<void> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "docer-test-"));
  try {
    await body(root, createDocsTools(root));
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

const noOptions = {
  toolCallId: "test",
  messages: [],
} as never;

test("write_doc then read_doc round-trips a nested file", async () => {
  await withDocsRoot(async (_root, tools) => {
    await tools.write_doc.execute!(
      { path: "services/api.md", content: "# API\n" },
      noOptions,
    );
    const content = await tools.read_doc.execute!(
      { path: "services/api.md" },
      noOptions,
    );
    assert.equal(content, "# API\n");
  });
});

test("list_docs reports an empty repository", async () => {
  await withDocsRoot(async (_root, tools) => {
    const listing = await tools.list_docs.execute!({}, noOptions);
    assert.equal(listing, "The documentation repository is empty.");
  });
});

test("read_doc reports a missing file instead of throwing", async () => {
  await withDocsRoot(async (_root, tools) => {
    const content = await tools.read_doc.execute!({ path: "nope.md" }, noOptions);
    assert.match(String(content), /No file at "nope.md"/);
  });
});

test("paths that escape the docs root are rejected", async () => {
  await withDocsRoot(async (_root, tools) => {
    for (const escaping of ["../outside.md", "docs/../../outside.md", "/etc/passwd"]) {
      await assert.rejects(
        async () => {
          await tools.write_doc.execute!({ path: escaping, content: "x" }, noOptions);
        },
        /escapes the docs repository/,
        `expected "${escaping}" to be rejected`,
      );
    }
  });
});

test("delete_doc removes a file and is quiet about missing ones", async () => {
  await withDocsRoot(async (root, tools) => {
    await fs.writeFile(path.join(root, "gone.md"), "bye");
    await tools.delete_doc.execute!({ path: "gone.md" }, noOptions);
    await assert.rejects(() => fs.stat(path.join(root, "gone.md")));
    const second = await tools.delete_doc.execute!({ path: "gone.md" }, noOptions);
    assert.match(String(second), /No file at "gone.md"/);
  });
});
