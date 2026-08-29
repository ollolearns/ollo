import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  JsonlEventStore,
  LIVE_CONFIRMATION,
  RobinhoodMcpAdapter,
  evaluate,
  executeRobinhoodOrder,
} from "../src/index.js";

const NOW = "2026-07-20T12:00:00.000Z";
const DEMO_ACCOUNT_NUMBER = "DEMO-AGENTIC-ACCOUNT";

const policy = {
  id: "demo-agent-mandate",
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
};

const state = {
  snapshotId: "demo-signed-state",
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
};

const intent = {
  id: "agent-aapl-001",
  accountId: "robinhood-agentic",
  assetId: "AAPL",
  side: "BUY",
  quantity: 1,
  limitPriceUsd: 100,
  venue: "robinhood-mcp",
  venueOrder: {
    tool: "place_equity_order",
    arguments: {
      account_number: DEMO_ACCOUNT_NUMBER,
      side: "buy",
      symbol: "AAPL",
      type: "limit",
      quantity: "1",
      limit_price: "100",
      time_in_force: "gfd",
      market_hours: "regular_hours",
    },
  },
};

function short(value) {
  return typeof value === "string" ? `${value.slice(0, 12)}…` : value;
}

function trace(actor, event, detail = "") {
  const suffix = detail ? `  ${detail}` : "";
  console.log(`[${actor.padEnd(20)}] ${event}${suffix}`);
}

class RobinhoodPaperMcpClient {
  constructor() {
    this.calls = [];
  }

  async listTools() {
    return {
      tools: [
        { name: "review_equity_order" },
        { name: "place_equity_order" },
      ],
    };
  }

  async callTool(request) {
    this.calls.push(structuredClone(request));
    const args = request.arguments;
    if (request.name === "review_equity_order") {
      trace("robinhood-mcp/paper", "review_equity_order", `${args.side.toUpperCase()} ${args.quantity} ${args.symbol} @ $${args.limit_price}`);
      return {
        content: [{ type: "text", text: "Paper preview accepted" }],
        structuredContent: { paper: true, buyingPowerImpactUsd: 100 },
      };
    }

    trace("robinhood-mcp/paper", "place_equity_order", "paper order accepted");
    return {
      content: [{ type: "text", text: "paper-order-rh-001" }],
      structuredContent: { paper: true, orderId: "paper-order-rh-001" },
    };
  }
}

const directory = await mkdtemp(join(tmpdir(), "scaur-robinhood-demo-"));

try {
  console.log("SCAUR / AGENT → POLICY → ROBINHOOD MCP");
  console.log("PAPER-SAFE DEMO — no credentials, brokerage call, or capital\n");

  const client = new RobinhoodPaperMcpClient();
  const adapter = new RobinhoodMcpAdapter(client);
  const tools = await adapter.listTools();
  trace("mcp discovery", "tools found", tools.map(({ name }) => name).join(", "));

  trace("portfolio agent", "propose", `BUY 1 AAPL · LIMIT $100`);
  const preview = evaluate({ policy, state, intent, at: NOW });
  trace("scaur kernel", "policy decision", preview.decision);
  trace("scaur kernel", "permit issued", short(preview.permit?.permitId));
  trace("scaur kernel", "intent bound", short(preview.intentHash));

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

  const events = await store.readAll();
  for (const event of events) {
    trace("event ledger", `${String(event.sequence).padStart(2, "0")} ${event.type}`, short(event.eventHash));
  }
  const chain = await store.verifyChain();
  trace("event ledger", "chain verified", `${chain.valid} · ${events.length} events`);
  trace("demo result", result.status, result.submission.placement.structuredContent.orderId);
  console.log("\nThis exercised Scaur's production policy, permit, replay, adapter, and ledger code against a paper MCP client.");
} finally {
  await rm(directory, { recursive: true, force: true });
}
