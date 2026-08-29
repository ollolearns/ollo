import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  JsonlEventStore,
  buildRebalanceIntents,
  runPaperCycle,
} from "../src/index.js";

const NOW = "2026-07-20T12:00:00.000Z";

function fixture() {
  return {
    policy: {
      id: "paper-cycle-test",
      version: "1.0.0",
      allowedVenues: ["paper"],
      maxOrderNotionalUsd: 50_000,
      maxLimitPriceDeviationPct: 5,
      maxPositionPct: 25,
      maxGrossExposurePct: 95,
      minCashPct: 5,
      maxValuationAgeSeconds: { private_asset: 2_592_000, rwa: 86_400 },
      minAvailableLiquidityUsd: { private_asset: 50_000, rwa: 75_000 },
      permitTtlSeconds: 60,
    },
    state: {
      snapshotId: "paper-start",
      portfolioValueUsd: 200_000,
      cashUsd: 110_000,
      positions: [
        { assetId: "PRIVATE_AI", assetClass: "private_asset", marketValueUsd: 20_000 },
        { assetId: "TREASURY_RWA", assetClass: "rwa", marketValueUsd: 70_000 },
      ],
      assets: {
        PRIVATE_AI: {
          assetClass: "private_asset",
          eligible: true,
          priceUsd: 20,
          valuedAt: "2026-07-10T12:00:00.000Z",
          availableLiquidityUsd: 500_000,
          venue: "paper",
        },
        TREASURY_RWA: {
          assetClass: "rwa",
          eligible: true,
          priceUsd: 100,
          valuedAt: "2026-07-20T11:55:00.000Z",
          availableLiquidityUsd: 1_000_000,
          venue: "paper",
        },
      },
    },
    targets: { PRIVATE_AI: 0.15, TREASURY_RWA: 0.25 },
  };
}

test("plans sells before buys and skips no-op trades", () => {
  const input = fixture();
  const intents = buildRebalanceIntents({
    state: input.state,
    targets: input.targets,
    accountId: "paper-fund-01",
  });

  assert.deepEqual(intents.map(({ assetId, side, quantity }) => ({ assetId, side, quantity })), [
    { assetId: "TREASURY_RWA", side: "SELL", quantity: 200 },
    { assetId: "PRIVATE_AI", side: "BUY", quantity: 500 },
  ]);
});

test("runs a complete paper cycle through policy, permits, and fills", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "scaur-cycle-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const store = new JsonlEventStore(join(directory, "events.jsonl"));
  const input = fixture();

  const result = await runPaperCycle({
    ...input,
    accountId: "paper-fund-01",
    store,
    at: NOW,
  });

  assert.equal(result.plannedOrders, 2);
  assert.equal(result.allowedOrders, 2);
  assert.equal(result.deniedOrders, 0);
  assert.equal(result.fills.length, 2);
  assert.equal(result.finalState.cashUsd, 120_000);
  assert.deepEqual(
    result.finalState.positions.map(({ assetId, marketValueUsd }) => ({ assetId, marketValueUsd })),
    [
      { assetId: "PRIVATE_AI", marketValueUsd: 30_000 },
      { assetId: "TREASURY_RWA", marketValueUsd: 50_000 },
    ],
  );

  const verification = await store.verifyChain();
  assert.equal(verification.valid, true);
  assert.equal(verification.events, 8);
});

test("records denials without creating paper fills", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "scaur-deny-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const store = new JsonlEventStore(join(directory, "events.jsonl"));
  const input = fixture();
  input.state.assets.PRIVATE_AI.eligible = false;

  const result = await runPaperCycle({
    ...input,
    targets: { PRIVATE_AI: 0.15 },
    accountId: "paper-fund-01",
    store,
    at: NOW,
  });

  assert.equal(result.plannedOrders, 1);
  assert.equal(result.deniedOrders, 1);
  assert.equal(result.fills.length, 0);
});
