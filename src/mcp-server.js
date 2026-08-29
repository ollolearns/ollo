#!/usr/bin/env node

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { LIVE_MCP_ACTIVATION, createScaurMcpServer } from "./mcp.js";

function usage() {
  console.error(`Usage:
  scaur-mcp --policy FILE --state FILE --ledger FILE --account ID [--min-trade-notional USD]
  scaur-mcp --config .scaur/live-config.json
  scaur-mcp --config .scaur/live-config.json --mode research

Read-only Robinhood research:
  --mode research

Opt-in live routing (moves real money):
  --live-routing ${LIVE_MCP_ACTIVATION}
  --robinhood-account-number ACCOUNT
  --oauth-store FILE
  --live-max-order-notional USD
  --live-max-session-notional USD
  --live-max-orders COUNT

Environment alternatives:
  SCAUR_CONFIG_PATH, SCAUR_POLICY_PATH, SCAUR_STATE_PATH, SCAUR_LEDGER_PATH, SCAUR_ACCOUNT_ID,
  SCAUR_MIN_TRADE_NOTIONAL_USD, SCAUR_LIVE_ROUTING, SCAUR_ROBINHOOD_OAUTH_STORE,
  SCAUR_ROBINHOOD_ACCOUNT_NUMBER,
  SCAUR_LIVE_MAX_ORDER_NOTIONAL_USD, SCAUR_LIVE_MAX_SESSION_NOTIONAL_USD,
  SCAUR_LIVE_MAX_ORDERS`);
}

function parseArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      throw new Error("Arguments must be --name value pairs");
    }
    options[key.slice(2)] = value;
  }
  return options;
}

function required(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing ${label}`);
  }
  return value;
}

async function readConfigOptions(path) {
  const config = JSON.parse(await readFile(path, "utf8"));
  if (config?.schemaVersion !== "scaur.live-config.v1") {
    throw new Error("Unsupported Scaur live config schema");
  }
  return Object.fromEntries(Object.entries(config)
    .filter(([key]) => key !== "schemaVersion")
    .map(([key, value]) => [key, String(value)]));
}

try {
  const directOptions = parseArgs(process.argv.slice(2));
  const configPath = directOptions.config || process.env.SCAUR_CONFIG_PATH;
  const configOptions = configPath ? await readConfigOptions(resolve(configPath)) : {};
  const options = { ...configOptions, ...directOptions };
  const policyPath = required(
    options.policy || process.env.SCAUR_POLICY_PATH,
    "--policy or SCAUR_POLICY_PATH",
  );
  const statePath = required(
    options.state || process.env.SCAUR_STATE_PATH,
    "--state or SCAUR_STATE_PATH",
  );
  const ledgerPath = required(
    options.ledger || process.env.SCAUR_LEDGER_PATH,
    "--ledger or SCAUR_LEDGER_PATH",
  );
  const accountId = required(
    options.account || process.env.SCAUR_ACCOUNT_ID,
    "--account or SCAUR_ACCOUNT_ID",
  );
  const minTradeNotionalUsd = options["min-trade-notional"]
    || process.env.SCAUR_MIN_TRADE_NOTIONAL_USD
    || 100;
  const mode = options.mode || "live";
  if (!["live", "research"].includes(mode)) {
    throw new Error("--mode must be live or research");
  }
  const liveRouting = options["live-routing"] || process.env.SCAUR_LIVE_ROUTING;
  const liveOptionsPresent = [
    liveRouting,
    options["oauth-store"],
    process.env.SCAUR_ROBINHOOD_OAUTH_STORE,
    options["robinhood-account-number"],
    process.env.SCAUR_ROBINHOOD_ACCOUNT_NUMBER,
    options["live-max-order-notional"],
    process.env.SCAUR_LIVE_MAX_ORDER_NOTIONAL_USD,
    options["live-max-session-notional"],
    process.env.SCAUR_LIVE_MAX_SESSION_NOTIONAL_USD,
    options["live-max-orders"],
    process.env.SCAUR_LIVE_MAX_ORDERS,
  ].some((value) => value !== undefined);
  if (liveOptionsPresent && liveRouting !== LIVE_MCP_ACTIVATION) {
    throw new Error(`Live routing requires --live-routing ${LIVE_MCP_ACTIVATION}`);
  }
  if (mode === "research" && liveRouting !== LIVE_MCP_ACTIVATION) {
    throw new Error("Research mode requires authenticated Robinhood configuration");
  }
  const oauthStorePath = liveRouting === LIVE_MCP_ACTIVATION
    ? resolve(required(
      options["oauth-store"] || process.env.SCAUR_ROBINHOOD_OAUTH_STORE,
      "--oauth-store or SCAUR_ROBINHOOD_OAUTH_STORE",
    ))
    : null;
  if (oauthStorePath && !existsSync(oauthStorePath)) {
    throw new Error(
      `Robinhood OAuth store not found at ${oauthStorePath}; run scaur robinhood-auth first`,
    );
  }
  const live = liveRouting === LIVE_MCP_ACTIVATION ? {
    enabled: true,
    researchOnly: mode === "research",
    accountNumber: required(
      options["robinhood-account-number"] || process.env.SCAUR_ROBINHOOD_ACCOUNT_NUMBER,
      "--robinhood-account-number or SCAUR_ROBINHOOD_ACCOUNT_NUMBER",
    ),
    oauthStorePath,
    maxOrderNotionalUsd: required(
      options["live-max-order-notional"] || process.env.SCAUR_LIVE_MAX_ORDER_NOTIONAL_USD,
      "--live-max-order-notional or SCAUR_LIVE_MAX_ORDER_NOTIONAL_USD",
    ),
    maxSessionNotionalUsd: required(
      options["live-max-session-notional"] || process.env.SCAUR_LIVE_MAX_SESSION_NOTIONAL_USD,
      "--live-max-session-notional or SCAUR_LIVE_MAX_SESSION_NOTIONAL_USD",
    ),
    maxOrders: required(
      options["live-max-orders"] || process.env.SCAUR_LIVE_MAX_ORDERS,
      "--live-max-orders or SCAUR_LIVE_MAX_ORDERS",
    ),
  } : { enabled: false };

  const server = createScaurMcpServer({
    policyPath: resolve(policyPath),
    statePath: resolve(statePath),
    ledgerPath: resolve(ledgerPath),
    accountId,
    minTradeNotionalUsd,
    live,
  });
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    live.enabled && live.researchOnly
      ? `Scaur MCP connected to Robinhood in read-only research mode for account ${accountId}.`
      : live.enabled
        ? `Scaur MCP connected with LIVE Robinhood routing for account ${accountId}.`
      : `Scaur MCP connected in paper mode for account ${accountId}.`,
  );
} catch (error) {
  console.error(`scaur-mcp: ${error.message}`);
  usage();
  process.exitCode = 1;
}
