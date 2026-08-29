import { appendFile, mkdir, open, readFile, unlink } from "node:fs/promises";
import { dirname } from "node:path";
import { canonicalize, hashWithDomain } from "./canonical.js";

function eventBody(events, type, payload, at) {
  const previous = events.at(-1) || null;
  return {
    schemaVersion: "scaur.event.v1",
    sequence: previous ? previous.sequence + 1 : 1,
    type,
    recordedAt: new Date(at).toISOString(),
    previousEventHash: previous?.eventHash || null,
    payload,
  };
}

export class JsonlEventStore {
  constructor(path) {
    if (typeof path !== "string" || path.trim() === "") {
      throw new TypeError("Event store path must be a non-empty string");
    }
    this.path = path;
    this.lockPath = `${path}.lock`;
  }

  async readAll() {
    try {
      const contents = await readFile(this.path, "utf8");
      return contents
        .split(/\r?\n/u)
        .filter(Boolean)
        .map((line, index) => {
          try {
            return JSON.parse(line);
          } catch (error) {
            throw new Error(`Invalid JSONL event at line ${index + 1}: ${error.message}`);
          }
        });
    } catch (error) {
      if (error.code === "ENOENT") return [];
      throw error;
    }
  }

  async append(type, payload, at = new Date().toISOString()) {
    const transaction = await this.transact(({ append }) => append(type, payload, at));
    if (!transaction.acquired) throw new Error("Event store is locked");
    return transaction.result;
  }

  async transact(handler) {
    await mkdir(dirname(this.path), { recursive: true });

    let lock;
    try {
      lock = await open(this.lockPath, "wx", 0o600);
      await lock.writeFile(JSON.stringify({ pid: process.pid, acquiredAt: new Date().toISOString() }));
    } catch (error) {
      if (error.code === "EEXIST") return { acquired: false, result: null };
      throw error;
    }

    try {
      const current = await this.readAll();
      const additions = [];
      const append = (type, payload, at = new Date().toISOString()) => {
        const timeline = [...current, ...additions];
        const body = eventBody(timeline, type, payload, at);
        const event = { ...body, eventHash: hashWithDomain("scaur.event.v1", body) };
        additions.push(event);
        return event;
      };

      const result = await handler({ events: [...current], append });
      if (additions.length > 0) {
        const lines = `${additions.map(canonicalize).join("\n")}\n`;
        await appendFile(this.path, lines, { encoding: "utf8", flush: true });
      }
      return { acquired: true, result };
    } finally {
      await lock.close();
      await unlink(this.lockPath).catch((error) => {
        if (error.code !== "ENOENT") throw error;
      });
    }
  }

  async verifyChain() {
    const events = await this.readAll();
    let previousEventHash = null;

    for (let index = 0; index < events.length; index += 1) {
      const event = events[index];
      const { eventHash, ...body } = event;
      if (event.sequence !== index + 1) {
        return { valid: false, index, reason: "sequence_mismatch" };
      }
      if (event.previousEventHash !== previousEventHash) {
        return { valid: false, index, reason: "previous_hash_mismatch" };
      }
      if (hashWithDomain("scaur.event.v1", body) !== eventHash) {
        return { valid: false, index, reason: "event_hash_mismatch" };
      }
      previousEventHash = eventHash;
    }

    return { valid: true, events: events.length, head: previousEventHash };
  }
}
