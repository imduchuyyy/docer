import * as fs from "node:fs/promises";
import * as path from "node:path";
import { tool } from "ai";
import { z } from "zod";

const MAX_READ_CHARS = 200_000;

export function createDocsTools(root: string) {
  const resolveInsideRoot = (relativePath: string): string => {
    const absolute = path.resolve(root, relativePath);
    const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
    if (absolute !== root && !absolute.startsWith(rootWithSep)) {
      throw new Error(`path "${relativePath}" escapes the docs repository`);
    }
    return absolute;
  };

  return {
    list_docs: tool({
      description:
        "List every file currently in the documentation repository, as paths relative to its root.",
      inputSchema: z.object({}),
      execute: async () => {
        const entries = await fs.readdir(root, {
          recursive: true,
          withFileTypes: true,
        });
        const files = entries
          .filter((entry) => entry.isFile())
          .map((entry) =>
            path.relative(root, path.join(entry.parentPath, entry.name)),
          )
          .filter((file) => !file.startsWith(`.git${path.sep}`))
          .sort();
        return files.length > 0 ? files : "The documentation repository is empty.";
      },
    }),

    read_doc: tool({
      description:
        "Read one file from the documentation repository. Read before editing so existing structure and wording are preserved.",
      inputSchema: z.object({
        path: z.string().describe("Path relative to the docs repository root."),
      }),
      execute: async ({ path: relativePath }) => {
        const absolute = resolveInsideRoot(relativePath);
        try {
          const content = await fs.readFile(absolute, "utf8");
          return content.length > MAX_READ_CHARS
            ? content.slice(0, MAX_READ_CHARS) + "\n\n[truncated]"
            : content;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
            throw error;
          }
          return `No file at "${relativePath}".`;
        }
      },
    }),

    write_doc: tool({
      description:
        "Create or overwrite one file in the documentation repository with its complete new content.",
      inputSchema: z.object({
        path: z.string().describe("Path relative to the docs repository root."),
        content: z.string().describe("The full file content to write."),
      }),
      execute: async ({ path: relativePath, content }) => {
        const absolute = resolveInsideRoot(relativePath);
        await fs.mkdir(path.dirname(absolute), { recursive: true });
        await fs.writeFile(absolute, content, "utf8");
        return `Wrote ${relativePath} (${content.length} characters).`;
      },
    }),

  };
}
