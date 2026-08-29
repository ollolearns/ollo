import {mkdtemp, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {
  JsonlEventStore,
  LIVE_CONFIRMATION,
  executeRobinhoodOrder,
} from "../src/index.js";

const NOW = "2026-07-20T12:00:00.000Z";
const DEMO_ACCOUNT_NUMBER = "DEMO-AGENTIC-ACCOUNT";
const requestedCase = process.argv[process.argv.indexOf("--case") + 1];

if (!new Set(["allow", "deny"]).has(requestedCase)) {
  console.error("usage: npm run demo:gate -- --case allow|deny");
  process.exit(64);
}

const quantity = requestedCase === "allow" ? 1 : 20;
const policy = {
  id: "scaur-demo-mandate",
  version: "1.0.0",
  allowedVenues: ["robinhood-mcp"],
  maxOrderNotionalUsd: 5_000,
  maxLimitPriceDeviationPct: 2,
  maxPositionPct: 25,
  maxGrossExposurePct: 95,
  minCashPct: 5,
  maxValuationAgeSeconds: {equity: 60},
  minAvailableLiquidityUsd: {equity: 1_000},
  permitTtlSeconds: 60,
};
const state = {
  snapshotId: "demo-signed-state",
  portfolioValueUsd: 10_000,
  cashUsd: 9_000,
  positions: [{assetId: "AAPL", assetClass: "equity", marketValueUsd: 1_000}],
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
};
const intent = {
  id: `agent-aapl-${requestedCase}`,
  accountId: "robinhood-agentic",
  assetId: "AAPL",
  side: "BUY",
  quantity,
  limitPriceUsd: 100,
  venue: "robinhood-mcp",
  venueOrder: {
    tool: "place_equity_order",
    arguments: {
      account_number: DEMO_ACCOUNT_NUMBER,
      side: "buy",
      symbol: "AAPL",
      type: "limit",
      quantity: String(quantity),
      limit_price: "100",
      time_in_force: "gfd",
      market_hours: "regular_hours",
    },
  },
};

class PaperRobinhoodClient {
  calls = [];

  async listTools() {
    return {tools: [{name: "review_equity_order"}, {name: "place_equity_order"}]};
  }

  async callTool(request) {
    this.calls.push(request.name);
    if (request.name === "review_equity_order") {
      return {structuredContent: {paper: true, accepted: true}};
    }
    return {structuredContent: {paper: true, orderId: "paper-order-rh-001"}};
  }
}

function row(label, value) {
  console.log(`${label.padEnd(13)}${value}`);
}

function short(value) {
  return value ? `${value.slice(0, 12)}...` : "NONE";
}

const directory = await mkdtemp(join(tmpdir(), `scaur-gate-${requestedCase}-`));
try {
  const client = new PaperRobinhoodClient();
  const store = new JsonlEventStore(join(directory, "events.jsonl"));
  const result = await executeRobinhoodOrder({
    policy,
    state,
    intent,
    store,
    client,
    accountNumber: DEMO_ACCOUNT_NUMBER,
    confirmation: LIVE_CONFIRMATION,
    at: NOW,
  });
  const positionCheck = result.receipt.checks.find((check) => check.id === "position.max");
  const events = await store.readAll();

  console.log(`SCAUR POLICY GATE / ${requestedCase.toUpperCase()}`);
  row("order", `BUY ${quantity} AAPL @ $100 LIMIT`);
  row("current", "position 10.00%");
  row("projected", `position ${Number(positionCheck.observed).toFixed(2)}%`);
  row("mandate", `max position ${Number(positionCheck.limit).toFixed(2)}%`);
  row("decision", result.receipt.decision);
  if (!positionCheck.pass) {
    row("failed check", `${positionCheck.id} (${positionCheck.observed}% > ${positionCheck.limit}%)`);
  }
  row("permit", result.receipt.permit ? `ISSUED ${short(result.receipt.permit.permitId)}` : "NONE");
  row("mcp review", client.calls.includes("review_equity_order") ? "CALLED" : "NOT CALLED");
  row("mcp place", client.calls.includes("place_equity_order") ? "PAPER CALLED" : "NOT CALLED");
  row("ledger", events.map((event) => event.type).join(" -> "));
  row("result", result.status === "SUBMITTED" ? "PAPER ORDER ACCEPTED" : "BLOCKED BEFORE ROBINHOOD");
} finally {
  await rm(directory, {recursive: true, force: true});
}
