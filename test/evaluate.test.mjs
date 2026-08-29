import assert from "node:assert/strict";
import test from "node:test";
import { evaluate, PermitLedger, verifyPermit } from "../src/index.js";

const NOW = "2026-07-20T12:00:00.000Z";

function fixture() {
  return {
    policy: {
      id: "test-policy",
      version: "1.0.0",
      allowedVenues: ["paper"],
      maxOrderNotionalUsd: 50_000,
      maxLimitPriceDeviationPct: 5,
      maxPositionPct: 25,
      maxGrossExposurePct: 95,
      minCashPct: 5,
      maxValuationAgeSeconds: {
        tokenized_equity: 300,
        private_asset: 2_592_000,
        rwa: 86_400,
      },
      minAvailableLiquidityUsd: {
        tokenized_equity: 100_000,
        private_asset: 50_000,
        rwa: 75_000,
      },
      permitTtlSeconds: 60,
    },
    state: {
      snapshotId: "state-001",
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
      },
    },
    intent: {
      id: "intent-001",
      accountId: "paper-fund-01",
      assetId: "PRIVATE_AI",
      side: "BUY",
      quantity: 500,
      limitPriceUsd: 20,
      venue: "paper",
    },
  };
}

test("allows an eligible, fresh, bounded proposal", () => {
  const receipt = evaluate({ ...fixture(), at: NOW });
  assert.equal(receipt.decision, "ALLOW");
  assert.ok(receipt.checks.every((check) => check.pass));
  assert.equal(receipt.permit.intentHash, receipt.intentHash);
});

test("same facts and time produce the same decision receipt", () => {
  const first = evaluate({ ...fixture(), at: NOW });
  const second = evaluate({ ...fixture(), at: NOW });
  assert.deepEqual(first, second);
});

test("denies a proposal that breaches concentration", () => {
  const input = fixture();
  input.intent.quantity = 2_000;
  const receipt = evaluate({ ...input, at: NOW });
  const concentration = receipt.checks.find((check) => check.id === "position.max");
  assert.equal(receipt.decision, "DENY");
  assert.equal(concentration.pass, false);
  assert.equal(receipt.permit, null);
});
test("denies stale private-asset valuations", () => {
  const input = fixture();
  input.state.assets.PRIVATE_AI.valuedAt = "2026-06-01T12:00:00.000Z";
  const receipt = evaluate({ ...input, at: NOW });
  const freshness = receipt.checks.find((check) => check.id === "valuation.fresh");
  assert.equal(receipt.decision, "DENY");
  assert.equal(freshness.pass, false);
});

test("denies a limit price outside the reference band", () => {
  const input = fixture();
  input.intent.limitPriceUsd = 22;
  const receipt = evaluate({ ...input, at: NOW });
  const price = receipt.checks.find((check) => check.id === "price.limit_deviation");
  assert.equal(receipt.decision, "DENY");
  assert.equal(price.pass, false);
});

test("a permit is bound to the exact intent", () => {
  const input = fixture();
  const receipt = evaluate({ ...input, at: NOW });
  const changed = { ...input.intent, quantity: input.intent.quantity + 1 };
  assert.deepEqual(
    verifyPermit(receipt.permit, changed, "2026-07-20T12:00:30.000Z"),
    { valid: false, reason: "intent_mismatch" },
  );
});

test("a permit can be consumed only once", () => {
  const input = fixture();
  const receipt = evaluate({ ...input, at: NOW });
  const ledger = new PermitLedger();
  const first = ledger.consume(receipt.permit, input.intent, "2026-07-20T12:00:30.000Z");
  const replay = ledger.consume(receipt.permit, input.intent, "2026-07-20T12:00:31.000Z");
  assert.equal(first.valid, true);
  assert.deepEqual(replay, { valid: false, reason: "already_consumed" });
});

test("expired permits fail closed", () => {
  const input = fixture();
  const receipt = evaluate({ ...input, at: NOW });
  assert.deepEqual(
    verifyPermit(receipt.permit, input.intent, "2026-07-20T12:01:01.000Z"),
    { valid: false, reason: "expired" },
  );
});

test("invalid intents produce denial receipts", () => {
  const input = fixture();
  input.intent.quantity = -1;
  const receipt = evaluate({ ...input, at: NOW });
  assert.equal(receipt.decision, "DENY");
  assert.equal(receipt.checks[0].id, "intent.valid");
  assert.equal(receipt.permit, null);
});

test("invalid portfolio state fails closed with explicit checks", () => {
  const input = fixture();
  input.state.portfolioValueUsd = 0;
  input.state.cashUsd = -1;
  const receipt = evaluate({ ...input, at: NOW });
  assert.equal(receipt.decision, "DENY");
  assert.equal(receipt.checks.find((check) => check.id === "portfolio.value_valid").pass, false);
  assert.equal(receipt.checks.find((check) => check.id === "portfolio.cash_valid").pass, false);
});
