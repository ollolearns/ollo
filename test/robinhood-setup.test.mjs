import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { normalizeSymbols, setupRobinhood } from "../src/index.js";

const ACCOUNT = "TEST-AGENTIC-SETUP";
const AT = "2026-07-21T15:00:00.000Z";

function toolResult(data) {
  return { structuredContent: { data, guide: "test" } };
}

function mockClient({ unsupportedOptions = false } = {}) {
  const calls = [];
  const names = [
    "get_accounts",
    "get_portfolio",
    "get_equity_positions",
    "get_equity_quotes",
    "get_equity_tradability",
    "review_equity_order",
    "place_equity_order",
  ];
  return {
    calls,
    async listTools() {
      return { tools: names.map((name) => ({ name })) };
    },
    async callTool(request) {
      calls.push(structuredClone(request));
      if (request.name === "get_accounts") {
        return toolResult({
          accounts: [{
            account_number: ACCOUNT,
            brokerage_account_type: "individual",
            agentic_allowed: true,
            state: "active",
            deactivated: false,
            permanently_deactivated: false,
          }],
        });
      }
      if (request.name === "get_portfolio") {
        return toolResult({
          total_value: "1000",
          equity_value: "100",
          options_value: unsupportedOptions ? "10" : "0",
          futures_value: "0",
          event_contracts_value: "0",
          crypto_value: "0",
          cash: "900",
          mutual_funds_value: "0",
          fixed_income_value: "0",
          currency: "USD",
        });
      }
      if (request.name === "get_equity_positions") {
        return toolResult({
          positions: [{ symbol: "AAPL", quantity: "1", type: "long" }],
          next: "",
        });
      }
      if (request.name === "get_equity_quotes") {
        return toolResult({
          results: request.arguments.symbols.map((symbol, index) => ({
            quote: {
              symbol,
              last_trade_price: String(index === 0 ? 100 : 50),
              venue_last_trade_time: AT,
              last_non_reg_trade_price: null,
              venue_last_non_reg_trade_time: null,
              has_traded: true,
              state: "active",
            },
          })),
        });
      }
      if (request.name === "get_equity_tradability") {
        return toolResult({
          results: request.arguments.symbols.map((symbol) => ({
            symbol,
            state: "active",
            tradeable: true,
            account_type_tradabilities: [{
              account_type: "individual",
              account_type_tradability: "tradable",
            }],
          })),
          not_found: [],
        });
      }
      throw new Error(`Unexpected tool ${request.name}`);
    },
  };
}

test("normalizes a configured equity universe", () => {
  assert.deepEqual(normalizeSymbols("msft, AAPL,msft"), ["AAPL", "MSFT"]);
  assert.throws(() => normalizeSymbols("not a ticker"), /Invalid equity symbol/u);
});

test("builds a private live config and a Robinhood-derived state snapshot", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "scaur-setup-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const ledgerPath = join(directory, "live-events.jsonl");
  await writeFile(ledgerPath, "existing-event\n", "utf8");
  const client = mockClient();

  const result = await setupRobinhood({
    client,
    accountNumber: ACCOUNT,
    symbols: ["MSFT"],
    directory,
    oauthStorePath: join(directory, "oauth.json"),
    maxOrderNotionalUsd: 25,
    maxSessionNotionalUsd: 60,
    maxOrders: 2,
    at: AT,
  });

  assert.equal(result.ready, true);
  assert.deepEqual(result.symbols, ["AAPL", "MSFT"]);
  assert.equal(JSON.stringify(result).includes(ACCOUNT), false);
  const policy = JSON.parse(await readFile(join(directory, "live-policy.json"), "utf8"));
  const state = JSON.parse(await readFile(join(directory, "live-state.json"), "utf8"));
  const config = JSON.parse(await readFile(join(directory, "live-config.json"), "utf8"));
  assert.equal(policy.maxOrderNotionalUsd, 25);
  assert.equal(state.portfolioValueUsd, 1000);
  assert.equal(state.cashUsd, 900);
  assert.equal(state.positions[0].marketValueUsd, 100);
  assert.equal(state.assets.MSFT.liquidityBasis, "configured_order_cap");
  assert.equal(config["robinhood-account-number"], ACCOUNT);
  assert.equal(config["live-routing"], "LIVE_ROBINHOOD_MCP");
  assert.equal(config.symbols, "AAPL,MSFT");
  assert.equal(await readFile(ledgerPath, "utf8"), "existing-event\n");
  assert.deepEqual(client.calls.map((call) => call.name), [
    "get_accounts",
    "get_portfolio",
    "get_equity_positions",
    "get_equity_quotes",
    "get_equity_tradability",
  ]);
});

test("fails closed when unsupported holdings would make the state incomplete", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "scaur-setup-unsupported-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  await assert.rejects(
    setupRobinhood({
      client: mockClient({ unsupportedOptions: true }),
      accountNumber: ACCOUNT,
      symbols: ["AAPL"],
      directory,
      at: AT,
    }),
    /Unsupported non-equity holdings are present: options_value/u,
  );
});
