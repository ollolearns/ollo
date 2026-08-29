import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import {
  compareEquities,
  createScaurMcpServer,
  hashWithDomain,
  researchEquity,
} from "../src/index.js";

const AT = "2026-07-22T15:00:00.000Z";
const RESEARCH_TOOLS = [
  "get_equity_quotes",
  "get_equity_fundamentals",
  "get_equity_technical_indicators",
  "get_earnings_results",
];

function toolResult(data) {
  return { structuredContent: { data } };
}

function researchVenueClient(calls) {
  return {
    async listTools() {
      return { tools: RESEARCH_TOOLS.map((name) => ({ name })) };
    },
    async callTool(request) {
      calls.push(structuredClone(request));
      const symbol = request.arguments.symbol || request.arguments.symbols?.[0];
      const isMsft = symbol === "MSFT";
      if (request.name === "get_equity_quotes") {
        return toolResult({
          results: [{
            quote: {
              symbol,
              adjusted_previous_close: isMsft ? "500" : "205",
              last_trade_price: isMsft ? "495" : "210",
              venue_last_trade_time: "2026-07-22T14:59:00Z",
              last_non_reg_trade_price: isMsft ? "496" : "211",
              venue_last_non_reg_trade_time: "2026-07-22T15:01:00Z",
            },
          }],
        });
      }
      if (request.name === "get_equity_fundamentals") {
        return toolResult({
          results: [{
            symbol,
            low_52_weeks: isMsft ? "350" : "160",
            high_52_weeks: isMsft ? "550" : "220",
            pe_ratio: isMsft ? "38.2" : "31.5",
            pb_ratio: isMsft ? "12.4" : "48.2",
            dividend_yield: isMsft ? "0.7" : "0.5",
            volume: isMsft ? "9000000" : "12000000",
            average_volume_2_weeks: "10000000",
          }],
        });
      }
      if (request.name === "get_equity_technical_indicators") {
        return toolResult({
          indicators: [{ series: [{ value: isMsft ? "55.1" : "72.5" }] }],
        });
      }
      if (request.name === "get_earnings_results") {
        return toolResult({
          results: [
            {
              year: 2026,
              quarter: 1,
              report: { date: "2026-01-30", verified: true },
              eps: { actual: "1.30", estimate: "1.20" },
            },
            {
              year: 2026,
              quarter: 2,
              report: { date: "2026-04-30", verified: true },
              eps: { actual: "1.50", estimate: "1.40" },
            },
            {
              year: 2026,
              quarter: 3,
              report: { date: "2026-07-30", verified: true },
              eps: { actual: null, estimate: "1.60" },
            },
          ],
        });
      }
      throw new Error(`Unexpected tool: ${request.name}`);
    },
  };
}

test("builds hash-addressed equity research from authenticated Robinhood tools", async () => {
  const calls = [];
  const result = await researchEquity({
    client: researchVenueClient(calls),
    symbol: "aapl",
    at: AT,
  });

  assert.equal(result.schemaVersion, "scaur.equity-research.v1");
  assert.equal(result.status, "COMPLETE");
  assert.equal(result.symbol, "AAPL");
  assert.equal(result.source.publicMarketDataOnly, true);
  assert.equal(result.market.session, "extended");
  assert.equal(result.market.priceUsd, 211);
  assert.equal(result.market.priorCloseUsd, 205);
  assert.ok(Math.abs(result.market.dayChangePct - 2.926829268292683) < 1e-12);
  assert.equal(result.range52Week.positionPct, 85);
  assert.equal(result.valuation.peRatio, 31.5);
  assert.equal(result.liquidity.relativeVolume, 1.2);
  assert.equal(result.momentum.value, 72.5);
  assert.equal(result.momentum.band, "ABOVE_70");
  assert.equal(result.earnings.reportedQuarters, 2);
  assert.equal(result.earnings.beats, 2);
  assert.equal(result.earnings.nextVerified.reportDate, "2026-07-30");
  assert.match(result.evidenceHash, /^[a-f0-9]{64}$/u);
  const { evidenceHash, ...evidence } = result;
  assert.equal(evidenceHash, hashWithDomain("scaur.equity-research.v1", evidence));

  assert.deepEqual(calls.map((call) => call.name), RESEARCH_TOOLS);
  assert.deepEqual(calls[0].arguments, { symbols: ["AAPL"] });
  assert.deepEqual(calls[1].arguments, { symbols: ["AAPL"], bounds: "regular" });
  assert.deepEqual(calls[2].arguments, {
    symbol: "AAPL",
    type: "rsi",
    interval: "day",
    start_time: "2026-04-23T15:00:00.000Z",
    end_time: AT,
    bounds: "regular",
    adjustment_type: "split",
    output: "latest",
    period: 14,
  });
  assert.deepEqual(calls[3].arguments, { symbol: "AAPL" });
});

test("compares multiple equities with one hash-addressed result", async () => {
  const calls = [];
  const result = await compareEquities({
    client: researchVenueClient(calls),
    symbols: ["aapl", "MSFT", "AAPL"],
    at: AT,
  });

  assert.equal(result.schemaVersion, "scaur.equity-comparison.v1");
  assert.equal(result.status, "COMPLETE");
  assert.deepEqual(result.symbols, ["AAPL", "MSFT"]);
  assert.equal(result.source.accountDataRead, false);
  assert.equal(result.source.orderToolsCalled, false);
  assert.equal(result.items.length, 2);
  assert.equal(result.items[0].symbol, "AAPL");
  assert.equal(result.items[1].symbol, "MSFT");
  assert.equal(result.comparison[0].priceUsd, 211);
  assert.equal(result.comparison[1].priceUsd, 496);
  assert.equal(result.comparison[1].rsi14, 55.1);
  assert.equal(result.comparison[0].evidenceHash, result.items[0].evidenceHash);
  assert.match(result.evidenceHash, /^[a-f0-9]{64}$/u);
  const { evidenceHash, ...evidence } = result;
  assert.equal(evidenceHash, hashWithDomain("scaur.equity-comparison.v1", evidence));
  assert.equal(calls.length, 8);
  assert.deepEqual(calls.map((call) => call.name), [...RESEARCH_TOOLS, ...RESEARCH_TOOLS]);
});

test("requires two unique symbols for an equity comparison", async () => {
  await assert.rejects(
    compareEquities({
      client: researchVenueClient([]),
      symbols: ["AAPL", "aapl"],
      at: AT,
    }),
    /at least 2 unique equity tickers/u,
  );
});

test("exposes equity research through read-only MCP mode", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "scaur-research-mcp-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const policyPath = join(directory, "policy.json");
  const statePath = join(directory, "state.json");
  const ledgerPath = join(directory, "events.jsonl");
  await Promise.all([
    writeFile(policyPath, JSON.stringify({
      id: "research-test",
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
      snapshotId: "research-state",
      capturedAt: AT,
      portfolioValueUsd: 1_000,
      cashUsd: 1_000,
      positions: [],
      assets: {
        AAPL: {
          assetClass: "equity",
          eligible: true,
          priceUsd: 205,
          valuedAt: AT,
          availableLiquidityUsd: 1_000,
          venue: "robinhood-mcp",
        },
      },
    }), "utf8"),
  ]);

  const calls = [];
  let connections = 0;
  let closes = 0;
  const server = createScaurMcpServer({
    policyPath,
    statePath,
    ledgerPath,
    accountId: "robinhood-agentic",
    now: () => AT,
    live: {
      enabled: true,
      researchOnly: true,
      accountNumber: "TEST-RESEARCH-001",
      oauthStorePath: join(directory, "oauth.json"),
      maxOrderNotionalUsd: 25,
      maxSessionNotionalUsd: 75,
      maxOrders: 3,
      connectRobinhood: async (options) => {
        assert.equal(options.interactive, false);
        connections += 1;
        return { client: researchVenueClient(calls) };
      },
      closeRobinhood: async (session) => {
        if (session) closes += 1;
      },
    },
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "scaur-research-test", version: "1.0.0" });
  context.after(() => clientTransport.close());
  context.after(() => server.close());
  await server.connect(serverTransport);
  await client.connect(clientTransport);

  const listed = await client.listTools();
  const tool = listed.tools.find((candidate) => candidate.name === "scaur_research_equity");
  const compareTool = listed.tools.find(
    (candidate) => candidate.name === "scaur_compare_equities",
  );
  assert.ok(tool);
  assert.ok(compareTool);
  assert.equal(listed.tools.some((candidate) => candidate.name === "scaur_live_order"), false);
  assert.equal(listed.tools.some((candidate) => candidate.name === "scaur_paper_order"), false);
  assert.deepEqual(Object.keys(tool.inputSchema.properties), ["symbol"]);
  assert.equal(tool.annotations.readOnlyHint, true);
  assert.equal(tool.annotations.destructiveHint, false);
  assert.deepEqual(Object.keys(compareTool.inputSchema.properties), ["symbols"]);
  assert.equal(compareTool.annotations.readOnlyHint, true);
  assert.equal(compareTool.annotations.destructiveHint, false);

  const status = await client.callTool({ name: "scaur_status", arguments: {} });
  assert.equal(status.structuredContent.mode, "research");
  assert.equal(status.structuredContent.capabilities.equityResearch, true);
  assert.equal(status.structuredContent.capabilities.equityComparison, true);
  assert.equal(status.structuredContent.capabilities.liveOrders, false);
  assert.equal(status.structuredContent.live.armed, false);
  assert.equal(status.structuredContent.live.researchOnly, true);
  const research = await client.callTool({
    name: "scaur_research_equity",
    arguments: { symbol: "aapl" },
  });
  assert.equal(research.isError, undefined);
  assert.equal(research.structuredContent.symbol, "AAPL");
  assert.equal(research.structuredContent.status, "COMPLETE");
  assert.equal(connections, 1);
  assert.equal(closes, 1);
  assert.deepEqual(calls.map((call) => call.name), RESEARCH_TOOLS);

  const comparison = await client.callTool({
    name: "scaur_compare_equities",
    arguments: { symbols: ["AAPL", "MSFT"] },
  });
  assert.equal(comparison.isError, undefined);
  assert.deepEqual(comparison.structuredContent.symbols, ["AAPL", "MSFT"]);
  assert.equal(comparison.structuredContent.comparison[1].symbol, "MSFT");
  assert.equal(comparison.structuredContent.source.accountDataRead, false);
  assert.equal(connections, 2);
  assert.equal(closes, 2);
  assert.equal(calls.length, 12);
});
