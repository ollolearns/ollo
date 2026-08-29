import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createScaurMcpServer } from "../src/index.js";

const repository = join(dirname(fileURLToPath(import.meta.url)), "..");
const serverPath = join(repository, "src", "mcp-server.js");

function policy() {
  return {
    id: "mcp-test-policy",
    version: "1.0.0",
    allowedVenues: ["paper"],
    maxOrderNotionalUsd: 200,
    maxLimitPriceDeviationPct: 5,
    maxPositionPct: 100,
    maxGrossExposurePct: 100,
    minCashPct: 0,
    maxValuationAgeSeconds: { private_asset: 3600 },
    minAvailableLiquidityUsd: { private_asset: 100 },
    permitTtlSeconds: 60,
  };
}

function state(at) {
  return {
    schemaVersion: "scaur.state.v1",
    accountId: "agent-paper-01",
    snapshotId: "mcp-start",
    capturedAt: at,
    portfolioValueUsd: 1_000,
    cashUsd: 1_000,
    positions: [],
    assets: {
      PRIVATE_AI: {
        assetClass: "private_asset",
        eligible: true,
        priceUsd: 20,
        valuedAt: at,
        availableLiquidityUsd: 10_000,
        venue: "paper",
      },
    },
  };
}

test("exposes a callable paper-safe MCP surface over stdio", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "scaur-mcp-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const policyPath = join(directory, "policy.json");
  const statePath = join(directory, "state.json");
  const ledgerPath = join(directory, "events.jsonl");
  const at = new Date().toISOString();
  await Promise.all([
    writeFile(policyPath, JSON.stringify(policy()), "utf8"),
    writeFile(statePath, JSON.stringify(state(at)), "utf8"),
  ]);

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [
      serverPath,
      "--policy", policyPath,
      "--state", statePath,
      "--ledger", ledgerPath,
      "--account", "agent-paper-01",
    ],
    cwd: repository,
    stderr: "pipe",
  });
  const client = new Client({ name: "scaur-integration-test", version: "1.0.0" });
  context.after(() => transport.close());
  await client.connect(transport);

  const listed = await client.listTools();
  assert.deepEqual(listed.tools.map((tool) => tool.name).sort(), [
    "scaur_check_order",
    "scaur_paper_order",
    "scaur_rebalance",
    "scaur_recent_events",
    "scaur_status",
  ]);
  const paperTool = listed.tools.find((tool) => tool.name === "scaur_paper_order");
  assert.deepEqual(Object.keys(paperTool.inputSchema.properties).sort(), [
    "assetId",
    "intentId",
    "limitPriceUsd",
    "quantity",
    "side",
  ]);
  assert.equal(paperTool.inputSchema.properties.accountId, undefined);
  assert.equal(paperTool.inputSchema.properties.venue, undefined);

  const status = await client.callTool({ name: "scaur_status", arguments: {} });
  assert.equal(status.isError, undefined);
  assert.equal(status.structuredContent.mode, "paper");
  assert.equal(status.structuredContent.capabilities.liveOrders, false);
  assert.equal(status.structuredContent.state.assets[0].assetId, "PRIVATE_AI");

  const allowed = await client.callTool({
    name: "scaur_paper_order",
    arguments: {
      intentId: "agent-order-1",
      assetId: "PRIVATE_AI",
      side: "BUY",
      quantity: 1,
      limitPriceUsd: 20,
    },
  });
  assert.equal(allowed.isError, undefined);
  assert.equal(allowed.structuredContent.status, "FILLED");

  const denied = await client.callTool({
    name: "scaur_paper_order",
    arguments: {
      intentId: "agent-order-2",
      assetId: "PRIVATE_AI",
      side: "BUY",
      quantity: 20,
      limitPriceUsd: 20,
    },
  });
  assert.equal(denied.isError, undefined);
  assert.equal(denied.structuredContent.status, "DENIED");
  assert.equal(
    denied.structuredContent.receipt.checks.find((check) => check.id === "order.notional").pass,
    false,
  );

  const persisted = JSON.parse(await readFile(statePath, "utf8"));
  assert.equal(persisted.cashUsd, 980);
  assert.equal(persisted.positions[0].marketValueUsd, 20);

  const events = await client.callTool({
    name: "scaur_recent_events",
    arguments: { limit: 10 },
  });
  assert.equal(events.structuredContent.ledger.valid, true);
  assert.equal(events.structuredContent.ledger.events, 4);
  assert.deepEqual(events.structuredContent.events.map((event) => event.type), [
    "decision.recorded",
    "permit.consumed",
    "fill.recorded",
    "decision.recorded",
  ]);
});

test("exposes operator-armed live routing with hard caps and fresh-state gating", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "scaur-live-mcp-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const policyPath = join(directory, "policy.json");
  const statePath = join(directory, "state.json");
  const ledgerPath = join(directory, "events.jsonl");
  const at = new Date().toISOString();
  const livePolicy = {
    id: "live-mcp-test",
    version: "1.0.0",
    allowedVenues: ["robinhood-mcp"],
    maxOrderNotionalUsd: 100,
    maxLimitPriceDeviationPct: 2,
    maxPositionPct: 50,
    maxGrossExposurePct: 95,
    minCashPct: 5,
    maxValuationAgeSeconds: { equity: 3600 },
    minAvailableLiquidityUsd: { equity: 100 },
    permitTtlSeconds: 60,
  };
  const liveState = {
    schemaVersion: "scaur.state.v1",
    accountId: "robinhood-agentic",
    snapshotId: "live-state-1",
    capturedAt: at,
    portfolioValueUsd: 1_000,
    cashUsd: 900,
    positions: [{ assetId: "AAPL", assetClass: "equity", marketValueUsd: 100 }],
    assets: {
      AAPL: {
        assetClass: "equity",
        eligible: true,
        priceUsd: 10,
        valuedAt: at,
        availableLiquidityUsd: 10_000,
        venue: "robinhood-mcp",
      },
    },
  };
  await Promise.all([
    writeFile(policyPath, JSON.stringify(livePolicy), "utf8"),
    writeFile(statePath, JSON.stringify(liveState), "utf8"),
  ]);

  const venueCalls = [];
  let connections = 0;
  let closes = 0;
  const venueClient = {
    async listTools() {
      return {
        tools: [{ name: "review_equity_order" }, { name: "place_equity_order" }],
      };
    },
    async callTool(request) {
      venueCalls.push(structuredClone(request));
      return {
        structuredContent: request.name === "review_equity_order"
          ? { reviewed: true, account_number: request.arguments.account_number }
          : {
              orderId: `live-order-${venueCalls.length}`,
              account_number: request.arguments.account_number,
            },
      };
    },
  };
  const server = createScaurMcpServer({
    policyPath,
    statePath,
    ledgerPath,
    accountId: "robinhood-agentic",
    now: () => at,
    live: {
      enabled: true,
      accountNumber: "TEST-AGENTIC-001",
      oauthStorePath: join(directory, "oauth.json"),
      maxOrderNotionalUsd: 20,
      maxSessionNotionalUsd: 30,
      maxOrders: 2,
      connectRobinhood: async (options) => {
        assert.equal(options.interactive, false);
        connections += 1;
        return { client: venueClient };
      },
      closeRobinhood: async (session) => {
        if (session) closes += 1;
      },
    },
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "scaur-live-test", version: "1.0.0" });
  context.after(() => clientTransport.close());
  context.after(() => server.close());
  await server.connect(serverTransport);
  await client.connect(clientTransport);

  const listed = await client.listTools();
  const liveTool = listed.tools.find((tool) => tool.name === "scaur_live_order");
  assert.ok(liveTool);
  assert.deepEqual(Object.keys(liveTool.inputSchema.properties).sort(), [
    "assetId",
    "intentId",
    "limitPriceUsd",
    "quantity",
    "side",
    "timeInForce",
  ]);
  assert.equal(liveTool.inputSchema.properties.accountId, undefined);
  assert.equal(liveTool.inputSchema.properties.account_number, undefined);
  assert.equal(liveTool.inputSchema.properties.venue, undefined);
  assert.equal(liveTool.inputSchema.properties.order_type, undefined);

  const status = await client.callTool({ name: "scaur_status", arguments: {} });
  assert.equal(status.structuredContent.mode, "live");
  assert.equal(status.structuredContent.capabilities.liveOrders, true);
  assert.equal(status.structuredContent.capabilities.paperOrders, false);
  assert.equal(status.structuredContent.live.stateReadyForLive, true);
  assert.equal(status.structuredContent.live.session.maxOrderNotionalUsd, 20);

  const overOrderCap = await client.callTool({
    name: "scaur_live_order",
    arguments: { assetId: "AAPL", side: "BUY", quantity: 3, limitPriceUsd: 10 },
  });
  assert.equal(overOrderCap.structuredContent.status, "DENIED");
  assert.equal(overOrderCap.structuredContent.stage, "SCAUR_LIVE_LIMITS");
  assert.equal(connections, 0);

  livePolicy.maxOrderNotionalUsd = 5;
  await writeFile(policyPath, JSON.stringify(livePolicy), "utf8");
  const policyDenied = await client.callTool({
    name: "scaur_live_order",
    arguments: { assetId: "AAPL", side: "BUY", quantity: 1, limitPriceUsd: 10 },
  });
  assert.equal(policyDenied.structuredContent.status, "DENIED");
  assert.equal(policyDenied.structuredContent.receipt.decision, "DENY");
  assert.equal(connections, 0);
  livePolicy.maxOrderNotionalUsd = 100;
  await writeFile(policyPath, JSON.stringify(livePolicy), "utf8");

  const first = await client.callTool({
    name: "scaur_live_order",
    arguments: { assetId: "AAPL", side: "BUY", quantity: 1, limitPriceUsd: 10 },
  });
  assert.equal(first.structuredContent.status, "SUBMITTED");
  assert.equal(first.structuredContent.liveSession.reservedOrders, 1);
  assert.deepEqual(venueCalls.map((call) => call.name), [
    "review_equity_order",
    "place_equity_order",
  ]);
  assert.deepEqual(venueCalls[0].arguments, venueCalls[1].arguments);
  assert.deepEqual(venueCalls[0].arguments, {
    account_number: "TEST-AGENTIC-001",
    limit_price: "10",
    market_hours: "regular_hours",
    quantity: "1",
    side: "buy",
    symbol: "AAPL",
    time_in_force: "gfd",
    type: "limit",
  });
  assert.equal(first.structuredContent.review.structuredContent.account_number, "[REDACTED]");
  assert.equal(first.structuredContent.submission.placement.structuredContent.account_number, "[REDACTED]");
  assert.equal(connections, 1);
  assert.equal(closes, 1);

  const reusedState = await client.callTool({
    name: "scaur_live_order",
    arguments: { assetId: "AAPL", side: "BUY", quantity: 1, limitPriceUsd: 10 },
  });
  assert.equal(reusedState.structuredContent.status, "DENIED");
  assert.equal(
    reusedState.structuredContent.checks.find((item) => item.id === "live.state_unused").pass,
    false,
  );
  assert.equal(connections, 1);

  liveState.snapshotId = "live-state-2";
  await writeFile(statePath, JSON.stringify(liveState), "utf8");
  const second = await client.callTool({
    name: "scaur_live_order",
    arguments: { assetId: "AAPL", side: "BUY", quantity: 2, limitPriceUsd: 10 },
  });
  assert.equal(second.structuredContent.status, "SUBMITTED");
  assert.equal(second.structuredContent.liveSession.reservedOrders, 2);
  assert.equal(second.structuredContent.liveSession.reservedNotionalUsd, 30);
  assert.equal(connections, 2);

  liveState.snapshotId = "live-state-3";
  await writeFile(statePath, JSON.stringify(liveState), "utf8");
  const exhausted = await client.callTool({
    name: "scaur_live_order",
    arguments: { assetId: "AAPL", side: "BUY", quantity: 1, limitPriceUsd: 10 },
  });
  assert.equal(exhausted.structuredContent.status, "DENIED");
  assert.equal(connections, 2);

  const events = await client.callTool({
    name: "scaur_recent_events",
    arguments: { limit: 50 },
  });
  assert.equal(events.structuredContent.ledger.valid, true);
  assert.equal(events.structuredContent.ledger.events, 12);
});

test("reserves live capacity and burns the state snapshot after an ambiguous placement failure", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "scaur-live-failure-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const policyPath = join(directory, "policy.json");
  const statePath = join(directory, "state.json");
  const ledgerPath = join(directory, "events.jsonl");
  const at = new Date().toISOString();
  await Promise.all([
    writeFile(policyPath, JSON.stringify({
      id: "live-failure-test",
      version: "1.0.0",
      allowedVenues: ["robinhood-mcp"],
      maxOrderNotionalUsd: 100,
      maxLimitPriceDeviationPct: 2,
      maxPositionPct: 50,
      maxGrossExposurePct: 95,
      minCashPct: 5,
      maxValuationAgeSeconds: { equity: 3600 },
      minAvailableLiquidityUsd: { equity: 100 },
      permitTtlSeconds: 60,
    }), "utf8"),
    writeFile(statePath, JSON.stringify({
      schemaVersion: "scaur.state.v1",
      accountId: "robinhood-agentic",
      snapshotId: "failure-state",
      capturedAt: at,
      portfolioValueUsd: 1_000,
      cashUsd: 900,
      positions: [{ assetId: "AAPL", assetClass: "equity", marketValueUsd: 100 }],
      assets: {
        AAPL: {
          assetClass: "equity",
          eligible: true,
          priceUsd: 10,
          valuedAt: at,
          availableLiquidityUsd: 10_000,
          venue: "robinhood-mcp",
        },
      },
    }), "utf8"),
  ]);

  let connections = 0;
  const venueClient = {
    async listTools() {
      return {
        tools: [{ name: "review_equity_order" }, { name: "place_equity_order" }],
      };
    },
    async callTool(request) {
      if (request.name === "review_equity_order") {
        return { structuredContent: { reviewed: true } };
      }
      return { isError: true, content: [{ type: "text", text: "transport lost" }] };
    },
  };
  const server = createScaurMcpServer({
    policyPath,
    statePath,
    ledgerPath,
    accountId: "robinhood-agentic",
    now: () => at,
    live: {
      enabled: true,
      accountNumber: "TEST-AGENTIC-002",
      oauthStorePath: join(directory, "oauth.json"),
      maxOrderNotionalUsd: 20,
      maxSessionNotionalUsd: 20,
      maxOrders: 1,
      connectRobinhood: async () => {
        connections += 1;
        return { client: venueClient };
      },
      closeRobinhood: async () => {},
    },
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "scaur-live-failure-test", version: "1.0.0" });
  context.after(() => clientTransport.close());
  context.after(() => server.close());
  await server.connect(serverTransport);
  await client.connect(clientTransport);

  const failed = await client.callTool({
    name: "scaur_live_order",
    arguments: { assetId: "AAPL", side: "BUY", quantity: 1, limitPriceUsd: 10 },
  });
  assert.equal(failed.isError, true);
  assert.match(failed.content[0].text, /transport lost/u);

  const status = await client.callTool({ name: "scaur_status", arguments: {} });
  assert.equal(status.structuredContent.live.stateReadyForLive, false);
  assert.equal(status.structuredContent.live.session.reservedOrders, 1);
  assert.equal(status.structuredContent.live.session.reservedNotionalUsd, 10);

  const retry = await client.callTool({
    name: "scaur_live_order",
    arguments: { assetId: "AAPL", side: "BUY", quantity: 1, limitPriceUsd: 10 },
  });
  assert.equal(retry.structuredContent.status, "DENIED");
  assert.equal(connections, 1);

  const events = await client.callTool({
    name: "scaur_recent_events",
    arguments: { limit: 20 },
  });
  assert.deepEqual(events.structuredContent.events.map((event) => event.type), [
    "decision.recorded",
    "venue.reviewed",
    "permit.consumed",
    "order.failed",
    "live.limit_denied",
  ]);
});

test("starts the stdio server in live mode only with the explicit activation contract", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "scaur-live-stdio-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const policyPath = join(directory, "policy.json");
  const statePath = join(directory, "state.json");
  const ledgerPath = join(directory, "events.jsonl");
  const oauthPath = join(directory, "oauth.json");
  const configPath = join(directory, "live-config.json");
  const at = new Date().toISOString();
  await Promise.all([
    writeFile(policyPath, JSON.stringify({
      id: "live-stdio-test",
      version: "1.0.0",
      allowedVenues: ["robinhood-mcp"],
      maxOrderNotionalUsd: 100,
      maxLimitPriceDeviationPct: 2,
      maxPositionPct: 50,
      maxGrossExposurePct: 95,
      minCashPct: 5,
      maxValuationAgeSeconds: { equity: 3600 },
      minAvailableLiquidityUsd: { equity: 100 },
      permitTtlSeconds: 60,
    }), "utf8"),
    writeFile(statePath, JSON.stringify({
      schemaVersion: "scaur.state.v1",
      accountId: "robinhood-agentic",
      snapshotId: "stdio-live",
      capturedAt: at,
      portfolioValueUsd: 1_000,
      cashUsd: 1_000,
      positions: [],
      assets: {
        AAPL: {
          assetClass: "equity",
          eligible: true,
          priceUsd: 10,
          valuedAt: at,
          availableLiquidityUsd: 10_000,
          venue: "robinhood-mcp",
        },
      },
    }), "utf8"),
    writeFile(oauthPath, JSON.stringify({
      schemaVersion: "scaur.robinhood-oauth.v1",
    }), "utf8"),
    writeFile(configPath, JSON.stringify({
      schemaVersion: "scaur.live-config.v1",
      policy: policyPath,
      state: statePath,
      ledger: ledgerPath,
      account: "robinhood-agentic",
      "live-routing": "LIVE_ROBINHOOD_MCP",
      "robinhood-account-number": "TEST-AGENTIC-003",
      "oauth-store": oauthPath,
      "live-max-order-notional": 20,
      "live-max-session-notional": 50,
      "live-max-orders": 2,
    }), "utf8"),
  ]);

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverPath, "--config", configPath],
    cwd: repository,
    stderr: "pipe",
  });
  const client = new Client({ name: "scaur-live-stdio-test", version: "1.0.0" });
  context.after(() => transport.close());
  await client.connect(transport);

  const tools = await client.listTools();
  assert.equal(tools.tools.some((tool) => tool.name === "scaur_live_order"), true);
  assert.equal(tools.tools.some((tool) => tool.name === "scaur_paper_order"), false);
  assert.equal(tools.tools.some((tool) => tool.name === "scaur_rebalance"), false);
  const status = await client.callTool({ name: "scaur_status", arguments: {} });
  assert.equal(status.structuredContent.live.armed, true);
  assert.equal(status.structuredContent.live.session.maxSessionNotionalUsd, 50);

  const researchTransport = new StdioClientTransport({
    command: process.execPath,
    args: [serverPath, "--config", configPath, "--mode", "research"],
    cwd: repository,
    stderr: "pipe",
  });
  const researchClient = new Client({ name: "scaur-research-stdio-test", version: "1.0.0" });
  context.after(() => researchTransport.close());
  await researchClient.connect(researchTransport);
  const researchTools = await researchClient.listTools();
  assert.equal(
    researchTools.tools.some((tool) => tool.name === "scaur_research_equity"),
    true,
  );
  assert.equal(
    researchTools.tools.some((tool) => tool.name === "scaur_compare_equities"),
    true,
  );
  assert.equal(researchTools.tools.some((tool) => tool.name === "scaur_live_order"), false);
  assert.equal(researchTools.tools.some((tool) => tool.name === "scaur_paper_order"), false);
  const researchStatus = await researchClient.callTool({ name: "scaur_status", arguments: {} });
  assert.equal(researchStatus.structuredContent.mode, "research");
  assert.equal(researchStatus.structuredContent.live.armed, false);
});
