import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  LIVE_CONFIRMATION,
  JsonlEventStore,
  evaluate,
  executeRobinhoodOrder,
  validateRobinhoodIntent,
  verifyPermit,
} from "../src/index.js";

const NOW = "2026-07-20T12:00:00.000Z";

function fixture() {
  return {
    accountNumber: "TEST-AGENTIC-ACCOUNT",
    policy: {
      id: "live-order-test",
      version: "1.0.0",
      allowedVenues: ["robinhood-mcp"],
      maxOrderNotionalUsd: 1_000,
      maxLimitPriceDeviationPct: 2,
      maxPositionPct: 25,
      maxGrossExposurePct: 95,
      minCashPct: 5,
      maxValuationAgeSeconds: { equity: 60 },
      minAvailableLiquidityUsd: { equity: 1_000 },
      permitTtlSeconds: 60,
    },
    state: {
      snapshotId: "live-test-state",
      portfolioValueUsd: 10_000,
      cashUsd: 9_000,
      positions: [{ assetId: "AAPL", assetClass: "equity", marketValueUsd: 1_000 }],
      assets: {
        AAPL: {
          assetClass: "equity",
          eligible: true,
          priceUsd: 100,
          valuedAt: "2026-07-20T11:59:30.000Z",
          availableLiquidityUsd: 10_000_000,
          venue: "robinhood-mcp",
        },
      },
    },
    intent: {
      id: "live-aapl-1",
      accountId: "robinhood-agentic",
      assetId: "AAPL",
      side: "BUY",
      quantity: 1,
      limitPriceUsd: 100,
      venue: "robinhood-mcp",
      venueOrder: {
        tool: "place_equity_order",
        arguments: {
          account_number: "TEST-AGENTIC-ACCOUNT",
          side: "buy",
          symbol: "AAPL",
          type: "limit",
          quantity: "1",
          limit_price: "100",
          time_in_force: "gfd",
          market_hours: "regular_hours",
        },
      },
    },
  };
}

function mockClient({ reviewError = false, placementError = false } = {}) {
  const calls = [];
  return {
    calls,
    async listTools() {
      return {
        tools: [
          { name: "review_equity_order" },
          { name: "place_equity_order" },
        ],
      };
    },
    async callTool(request) {
      calls.push(structuredClone(request));
      if (request.name === "review_equity_order") {
        return reviewError
          ? { isError: true, content: [{ type: "text", text: "review rejected" }] }
          : { content: [{ type: "text", text: "reviewed" }] };
      }
      return placementError
        ? { isError: true, content: [{ type: "text", text: "placement rejected" }] }
        : { content: [{ type: "text", text: "order-id-1" }] };
    },
  };
}

async function withStore(context, prefix) {
  const directory = await mkdtemp(join(tmpdir(), prefix));
  context.after(() => rm(directory, { recursive: true, force: true }));
  return new JsonlEventStore(join(directory, "events.jsonl"));
}

test("binds the exact Robinhood order arguments into the permit", () => {
  const input = fixture();
  const receipt = evaluate({ ...input, at: NOW });
  assert.equal(receipt.decision, "ALLOW");

  const changed = structuredClone(input.intent);
  changed.venueOrder.arguments.quantity = "2";
  assert.deepEqual(verifyPermit(receipt.permit, changed, NOW), {
    valid: false,
    reason: "intent_mismatch",
  });
});

test("rejects market orders and unbound execution fields", () => {
  const input = fixture();
  input.intent.venueOrder.arguments.type = "market";
  assert.throws(
    () => validateRobinhoodIntent(input.intent, { accountNumber: input.accountNumber }),
    /limit orders only/u,
  );

  input.intent.venueOrder.arguments.type = "limit";
  input.intent.venueOrder.arguments.amount = 500;
  assert.throws(
    () => validateRobinhoodIntent(input.intent, { accountNumber: input.accountNumber }),
    /Unsupported Robinhood order arguments: amount/u,
  );
});

test("reviews, consumes, and submits one exact live order", async (context) => {
  const input = fixture();
  const store = await withStore(context, "scaur-live-");
  const client = mockClient();
  const result = await executeRobinhoodOrder({
    ...input,
    store,
    client,
    confirmation: LIVE_CONFIRMATION,
    at: NOW,
  });

  assert.equal(result.status, "SUBMITTED");
  assert.deepEqual(client.calls.map((call) => call.name), [
    "review_equity_order",
    "place_equity_order",
  ]);
  assert.deepEqual(client.calls[0].arguments, client.calls[1].arguments);
  assert.deepEqual((await store.readAll()).map((event) => event.type), [
    "decision.recorded",
    "venue.reviewed",
    "permit.consumed",
    "order.submitted",
  ]);
  assert.equal((await store.verifyChain()).valid, true);
});

test("fails before review without the live confirmation phrase", async (context) => {
  const input = fixture();
  const store = await withStore(context, "scaur-confirm-");
  const client = mockClient();
  await assert.rejects(
    executeRobinhoodOrder({ ...input, store, client, confirmation: "yes", at: NOW }),
    /LIVE_ROBINHOOD_ORDER/u,
  );
  assert.equal(client.calls.length, 0);
  assert.equal((await store.readAll()).length, 0);
});

test("does not consume a permit when Robinhood review fails", async (context) => {
  const input = fixture();
  const store = await withStore(context, "scaur-review-");
  const client = mockClient({ reviewError: true });
  await assert.rejects(
    executeRobinhoodOrder({
      ...input,
      store,
      client,
      confirmation: LIVE_CONFIRMATION,
      at: NOW,
    }),
    /review rejected/u,
  );
  assert.deepEqual(client.calls.map((call) => call.name), ["review_equity_order"]);
  assert.deepEqual((await store.readAll()).map((event) => event.type), ["decision.recorded"]);
});

test("leaves the permit spent when placement fails", async (context) => {
  const input = fixture();
  const store = await withStore(context, "scaur-place-");
  const client = mockClient({ placementError: true });
  await assert.rejects(
    executeRobinhoodOrder({
      ...input,
      store,
      client,
      confirmation: LIVE_CONFIRMATION,
      at: NOW,
    }),
    /placement rejected/u,
  );
  assert.deepEqual((await store.readAll()).map((event) => event.type), [
    "decision.recorded",
    "venue.reviewed",
    "permit.consumed",
    "order.failed",
  ]);
});

test("records policy denial without touching Robinhood", async (context) => {
  const input = fixture();
  input.policy.maxOrderNotionalUsd = 50;
  const store = await withStore(context, "scaur-denied-live-");
  const client = mockClient();
  const result = await executeRobinhoodOrder({
    ...input,
    store,
    client,
    confirmation: LIVE_CONFIRMATION,
    at: NOW,
  });
  assert.equal(result.status, "DENIED");
  assert.equal(client.calls.length, 0);
});
