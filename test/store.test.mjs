import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  DurablePermitLedger,
  JsonlEventStore,
  evaluate,
} from "../src/index.js";

const NOW = "2026-07-20T12:00:00.000Z";

function allowedReceipt() {
  return evaluate({
    at: NOW,
    policy: {
      id: "durability-test",
      version: "1.0.0",
      allowedVenues: ["paper"],
      maxOrderNotionalUsd: 50_000,
      maxLimitPriceDeviationPct: 5,
      maxPositionPct: 25,
      maxGrossExposurePct: 95,
      minCashPct: 5,
      maxValuationAgeSeconds: { private_asset: 2_592_000 },
      minAvailableLiquidityUsd: { private_asset: 50_000 },
      permitTtlSeconds: 60,
    },
    state: {
      portfolioValueUsd: 200_000,
      cashUsd: 180_000,
      positions: [{ assetId: "PRIVATE_AI", marketValueUsd: 20_000 }],
      assets: {
        PRIVATE_AI: {
          assetClass: "private_asset",
          eligible: true,
          priceUsd: 20,
          valuedAt: "2026-07-10T12:00:00.000Z",
          availableLiquidityUsd: 500_000,
          venue: "paper",
        },
      },
    },
    intent: {
      id: "durable-intent",
      accountId: "paper-fund-01",
      assetId: "PRIVATE_AI",
      side: "BUY",
      quantity: 500,
      limitPriceUsd: 20,
      venue: "paper",
    },
  });
}

test("hash-chains appended events and verifies the ledger", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "scaur-store-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const store = new JsonlEventStore(join(directory, "events.jsonl"));

  await store.append("decision.recorded", { decisionId: "decision-1" }, NOW);
  await store.append("fill.recorded", { fillId: "fill-1" }, "2026-07-20T12:00:01.000Z");

  const events = await store.readAll();
  assert.equal(events.length, 2);
  assert.equal(events[1].previousEventHash, events[0].eventHash);
  assert.deepEqual(await store.verifyChain(), {
    valid: true,
    events: 2,
    head: events[1].eventHash,
  });
});

test("durably consumes a permit once across ledger instances", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "scaur-permit-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const store = new JsonlEventStore(join(directory, "events.jsonl"));
  const receipt = allowedReceipt();
  const intent = {
    id: "durable-intent",
    accountId: "paper-fund-01",
    assetId: "PRIVATE_AI",
    side: "BUY",
    quantity: 500,
    limitPriceUsd: 20,
    venue: "paper",
  };

  const first = await new DurablePermitLedger(store).consume(
    receipt.permit,
    intent,
    "2026-07-20T12:00:30.000Z",
  );
  const replay = await new DurablePermitLedger(store).consume(
    receipt.permit,
    intent,
    "2026-07-20T12:00:31.000Z",
  );

  assert.equal(first.valid, true);
  assert.deepEqual(replay, { valid: false, reason: "already_consumed" });
});

test("fails closed when the ledger lock is held", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "scaur-lock-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const store = new JsonlEventStore(join(directory, "events.jsonl"));
  const receipt = allowedReceipt();
  await writeFile(store.lockPath, "held", "utf8");

  const result = await new DurablePermitLedger(store).consume(
    receipt.permit,
    {
      id: "durable-intent",
      accountId: "paper-fund-01",
      assetId: "PRIVATE_AI",
      side: "BUY",
      quantity: 500,
      limitPriceUsd: 20,
      venue: "paper",
    },
    "2026-07-20T12:00:30.000Z",
  );

  assert.deepEqual(result, { valid: false, reason: "ledger_busy" });
});

test("detects tampering in an existing event", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "scaur-tamper-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const path = join(directory, "events.jsonl");
  const store = new JsonlEventStore(path);
  await store.append("decision.recorded", { decisionId: "decision-1" }, NOW);

  const contents = await readFile(path, "utf8");
  await writeFile(path, contents.replace("decision-1", "decision-x"), "utf8");
  assert.deepEqual(await store.verifyChain(), {
    valid: false,
    index: 0,
    reason: "event_hash_mismatch",
  });
});
