import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".svg",
  ".yaml",
  ".yml",
]);

async function collectTextFiles(directory = root) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectTextFiles(path)));
    else if (textExtensions.has(extname(entry.name))) files.push(path);
  }
  return files;
}

test("ships the expected repository policy files", async () => {
  const required = [
    "README.md",
    "LICENSE",
    "SECURITY.md",
    "CONTRIBUTING.md",
    "CODE_OF_CONDUCT.md",
    "SUPPORT.md",
    "CHANGELOG.md",
    "docs/architecture.md",
    "docs/threat-model.md",
  ];

  await Promise.all(required.map((path) => readFile(join(root, path), "utf8")));

  const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  assert.equal(packageJson.name, "@scaur/kernel");
  assert.equal(packageJson.license, "MIT");
});

test("keeps the current tree inside the Scaur identity", async () => {
  const retiredNames = [
    new RegExp(`\\b${["ol", "lo"].join("")}\\b`, "i"),
    new RegExp(["mur", "re"].join(""), "i"),
  ];

  for (const path of await collectTextFiles()) {
    const content = await readFile(path, "utf8");
    for (const retiredName of retiredNames) {
      assert.doesNotMatch(content, retiredName, relative(root, path));
    }
  }
});
