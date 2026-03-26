import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const blocked = [];
const workspaces = ["app", "core-engine", "game-system", "storage", "ui-editor"];

const scan = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const nextPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      scan(nextPath);
      continue;
    }

    if (entry.name.endsWith(".js") || entry.name.endsWith(".d.ts")) {
      blocked.push(relative(root, nextPath));
    }
  }
};

for (const workspace of workspaces) {
  const srcPath = join(root, workspace, "src");
  try {
    if (statSync(srcPath).isDirectory()) {
      scan(srcPath);
    }
  } catch {
    // Ignore missing src directories.
  }
}

if (blocked.length > 0) {
  console.error("Generated files found under src/:");
  blocked.forEach((path) => console.error(`- ${path}`));
  process.exit(1);
}
