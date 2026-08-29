import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Writable } from "node:stream";
import test from "node:test";
import { promisify } from "node:util";
import {
  mandateChangesFromOptions,
  promptMandateChanges,
  updateMandateFiles,
} from "../src/index.js";

const execFileAsync = promisify(execFile);

function policy() {
  return {
    schemaVersion: "scaur.policy.v1",
    id: "test-live",
    version: "1.0.0",
    allowedVenues: ["robinhood-mcp"],
    maxOrderNotionalUsd: 25,
    maxLimitPriceDeviationPct: 1,
    maxPositionPct: 25,
    maxGrossExposurePct: 95,
    minCashPct: 5,
    maxValuationAgeSeconds: { equity: 300 },
    minAvailableLiquidityUsd: { equity: 0 },
    permitTtlSeconds: 60,
  };
}

function config(policyPath) {
  return {
    schemaVersion: "scaur.live-config.v1",
    policy: policyPath,
    state: ".scaur/live-state.json",
    ledger: ".scaur/live-events.jsonl",
    account: "robinhood-agentic",
    "live-routing": "LIVE_ROBINHOOD_MCP",
    "robinhood-account-number": "PRIVATE-TEST-ACCOUNT",
    "oauth-store": ".scaur/robinhood-oauth.json",
    symbols: "AAPL",
    "live-max-order-notional": 25,
    "live-max-session-notional": 75,
    "live-max-orders": 3,
  };
}

test("updates policy and live session ceilings together", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "scaur-mandate-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const policyPath = join(directory, "live-policy.json");
  const configPath = join(directory, "live-config.json");
  await writeFile(policyPath, JSON.stringify(policy()), "utf8");
  await writeFile(configPath, JSON.stringify(config(policyPath)), "utf8");

  const result = await updateMandateFiles({
    configPath,
    changes: {
      maxOrderNotionalUsd: 40,
      maxSessionNotionalUsd: 120,
      maxOrders: 4,
      maxPositionPct: 20,
      minCashPct: 10,
    },
  });

  const updatedPolicy = JSON.parse(await readFile(policyPath, "utf8"));
  const updatedConfig = JSON.parse(await readFile(configPath, "utf8"));
  assert.equal(result.updated, true);
  assert.equal(updatedPolicy.maxOrderNotionalUsd, 40);
  assert.equal(updatedPolicy.maxPositionPct, 20);
  assert.equal(updatedPolicy.minCashPct, 10);
  assert.equal(updatedPolicy.maxGrossExposurePct, 95);
  assert.equal(updatedConfig["live-max-order-notional"], 40);
  assert.equal(updatedConfig["live-max-session-notional"], 120);
  assert.equal(updatedConfig["live-max-orders"], 4);
  assert.equal(updatedConfig["robinhood-account-number"], "PRIVATE-TEST-ACCOUNT");
});

test("rejects an invalid session ceiling without changing either file", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "scaur-mandate-invalid-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const policyPath = join(directory, "live-policy.json");
  const configPath = join(directory, "live-config.json");
  const originalPolicy = JSON.stringify(policy());
  const originalConfig = JSON.stringify(config(policyPath));
  await writeFile(policyPath, originalPolicy, "utf8");
  await writeFile(configPath, originalConfig, "utf8");

  await assert.rejects(
    updateMandateFiles({
      configPath,
      changes: { maxOrderNotionalUsd: 80, maxSessionNotionalUsd: 50 },
    }),
    /session USD cannot be below/u,
  );
  assert.equal(await readFile(policyPath, "utf8"), originalPolicy);
  assert.equal(await readFile(configPath, "utf8"), originalConfig);
});

test("maps command flags to mandate fields", () => {
  assert.deepEqual(
    mandateChangesFromOptions({
      "max-order-notional": "30",
      "min-cash-pct": "12",
      config: "custom.json",
    }),
    { maxOrderNotionalUsd: "30", minCashPct: "12" },
  );
});

test("interactive editor keeps current values when the operator presses Enter", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "scaur-mandate-prompt-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const policyPath = join(directory, "live-policy.json");
  const configPath = join(directory, "live-config.json");
  await writeFile(policyPath, JSON.stringify(policy()), "utf8");
  await writeFile(configPath, JSON.stringify(config(policyPath)), "utf8");
  let transcript = "";
  const output = new Writable({
    write(chunk, encoding, callback) {
      transcript += chunk.toString();
      callback();
    },
  });

  const result = await promptMandateChanges({
    configPath,
    output,
    question: async (prompt) => {
      transcript += prompt;
      return "";
    },
  });

  assert.equal(result.values.maxOrderNotionalUsd, 25);
  assert.equal(result.values.maxSessionNotionalUsd, 75);
  assert.match(transcript, /Press Enter to keep the current value/u);
  assert.match(transcript, /Maximum USD per order \[25\]/u);
});

test("terminal command applies explicit mandate flags", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "scaur-mandate-cli-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const policyPath = join(directory, "live-policy.json");
  const configPath = join(directory, "live-config.json");
  await writeFile(policyPath, JSON.stringify(policy()), "utf8");
  await writeFile(configPath, JSON.stringify(config(policyPath)), "utf8");

  const { stdout } = await execFileAsync(process.execPath, [
    "src/cli.js",
    "configure",
    "--config",
    configPath,
    "--max-order-notional",
    "30",
    "--max-session-notional",
    "90",
  ]);

  assert.match(stdout, /Scaur configuration updated/u);
  assert.match(stdout, /Restart npm run mcp:live/u);
  const updatedConfig = JSON.parse(await readFile(configPath, "utf8"));
  assert.equal(updatedConfig["live-max-order-notional"], 30);
  assert.equal(updatedConfig["live-max-session-notional"], 90);
});
