import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";

export async function readJsonFile(path, label = "JSON file") {
  let contents;
  try {
    contents = await readFile(path, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(`${label} does not exist: ${path}`);
    }
    throw error;
  }

  try {
    return JSON.parse(contents);
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
}

export class JsonFileStateStore {
  constructor(path) {
    if (typeof path !== "string" || path.trim() === "") {
      throw new TypeError("State path must be a non-empty string");
    }
    this.path = path;
  }

  async read() {
    const state = await readJsonFile(this.path, "State file");
    if (!state || typeof state !== "object" || Array.isArray(state)) {
      throw new TypeError("State file must contain a JSON object");
    }
    return state;
  }

  async write(state) {
    if (!state || typeof state !== "object" || Array.isArray(state)) {
      throw new TypeError("State must be a JSON object");
    }

    await mkdir(dirname(this.path), { recursive: true });
    const temporaryPath = `${this.path}.${process.pid}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, {
        encoding: "utf8",
        flag: "wx",
        mode: 0o600,
        flush: true,
      });
      await rename(temporaryPath, this.path);
    } catch (error) {
      await unlink(temporaryPath).catch((cleanupError) => {
        if (cleanupError.code !== "ENOENT") throw cleanupError;
      });
      throw error;
    }
  }
}
