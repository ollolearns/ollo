#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import process from "node:process";
import { evaluate } from "./evaluate.js";
import { LIVE_CONFIRMATION, executeRobinhoodOrder } from "./live.js";
import {
  mandateChangesFromOptions,
  promptMandateChanges,
  updateMandateFiles,
} from "./mandate.js";
import { runPaperCycle } from "./paper.js";
import {
  DEFAULT_CALLBACK_PORT,
  closeRobinhood,
  connectRobinhood,
} from "./robinhood.js";
import { normalizeSymbols, setupRobinhood } from "./robinhood-setup.js";
import { JsonlEventStore } from "./store.js";

function usage() {
  console.error(`Usage:
  scaur evaluate --policy FILE --state FILE --intent FILE [--at ISO_TIMESTAMP]
  scaur paper-cycle --policy FILE --state FILE --targets FILE --ledger FILE --account ID [--at ISO_TIMESTAMP]
  scaur setup-robinhood --robinhood-account-number ACCOUNT [--symbols AAPL,MSFT] [--max-order-notional USD] [--max-session-notional USD] [--max-orders COUNT] [--directory DIR]
  scaur configure [--config FILE] [--max-order-notional USD] [--max-session-notional USD] [--max-orders COUNT] [--max-limit-price-deviation-pct PCT] [--max-position-pct PCT] [--max-gross-exposure-pct PCT] [--min-cash-pct PCT] [--max-quote-age-seconds SECONDS] [--min-available-liquidity USD] [--permit-ttl-seconds SECONDS]
  scaur refresh-robinhood [--config FILE]
  scaur robinhood-auth [--oauth-store FILE] [--callback-port PORT]
  scaur robinhood-tools [--oauth-store FILE] [--callback-port PORT]
  scaur live-order --policy FILE --state FILE --intent FILE --ledger FILE --robinhood-account-number ACCOUNT --confirm ${LIVE_CONFIRMATION} [--oauth-store FILE] [--at ISO_TIMESTAMP]`);
}
function parseArgs(args) {
  const [command, ...rest] = args;
  const options = {};
  for (let index = 0; index < rest.length; index += 2) {
    const key = rest[index];
    const value = rest[index + 1];
    if (!key?.startsWith("--") || value === undefined) throw new Error("Invalid arguments");
    options[key.slice(2)] = value;
  }
  return { command, options };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function positiveInteger(value, fallback, name) {
  const parsed = value === undefined ? fallback : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new TypeError(`${name} must be a positive integer`);
  }
  return parsed;
}

function positiveNumber(value, fallback, name) {
  const parsed = value === undefined ? fallback : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new TypeError(`${name} must be a positive number`);
  }
  return parsed;
}

function redactError(error, secret) {
  const raw = String(error?.message || error);
  const message = typeof secret === "string" && secret !== ""
    ? raw.split(secret).join("[REDACTED]")
    : raw;
  const safe = new Error(message);
  safe.name = error?.name || "Error";
  return safe;
}

async function openRobinhood(options) {
  const callbackPort = positiveInteger(
    options["callback-port"],
    DEFAULT_CALLBACK_PORT,
    "callback-port",
  );
  const timeoutSeconds = positiveInteger(options["timeout-seconds"], 300, "timeout-seconds");
  return connectRobinhood({
    oauthStorePath: options["oauth-store"] || ".scaur/robinhood-oauth.json",
    callbackPort,
    timeoutMs: timeoutSeconds * 1000,
    serverUrl: options["server-url"],
    onAuthorizationUrl: (url) => {
      console.error("Authorize Scaur in a desktop browser, then return here:");
      console.error(url.toString());
    },
  });
}

try {
  const { command, options } = parseArgs(process.argv.slice(2));
  if (command === "evaluate" && options.policy && options.state && options.intent) {
    const [policy, state, intent] = await Promise.all([
      readJson(options.policy),
      readJson(options.state),
      readJson(options.intent),
    ]);
    const receipt = evaluate({ policy, state, intent, at: options.at });
    console.log(JSON.stringify(receipt, null, 2));
    process.exitCode = receipt.decision === "ALLOW" ? 0 : 2;
  } else if (
    command === "paper-cycle"
    && options.policy
    && options.state
    && options.targets
    && options.ledger
    && options.account
  ) {
    const [policy, state, targetDocument] = await Promise.all([
      readJson(options.policy),
      readJson(options.state),
      readJson(options.targets),
    ]);
    const result = await runPaperCycle({
      policy,
      state,
      targets: targetDocument.weights || targetDocument,
      accountId: options.account,
      store: new JsonlEventStore(options.ledger),
      at: options.at,
      minTradeNotionalUsd: targetDocument.minTradeNotionalUsd || 100,
    });
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.deniedOrders === 0 ? 0 : 2;
  } else if (command === "configure") {
    const configPath = options.config || ".scaur/live-config.json";
    const changes = mandateChangesFromOptions(options);
    const result = Object.keys(changes).length === 0
      ? await promptMandateChanges({ configPath })
      : await updateMandateFiles({ configPath, changes });
    console.log(`\nScaur configuration updated.\n${JSON.stringify(result.values, null, 2)}\n\n${result.next}`);
  } else if (command === "setup-robinhood") {
    const accountNumber = options["robinhood-account-number"]
      || process.env.SCAUR_ROBINHOOD_ACCOUNT_NUMBER;
    if (typeof accountNumber !== "string" || accountNumber.trim() === "") {
      throw new Error(
        "Setup requires --robinhood-account-number or SCAUR_ROBINHOOD_ACCOUNT_NUMBER",
      );
    }
    const directory = options.directory || ".scaur";
    const oauthStorePath = options["oauth-store"] || join(directory, "robinhood-oauth.json");
    const session = await openRobinhood({ ...options, "oauth-store": oauthStorePath });
    try {
      try {
        const result = await setupRobinhood({
          client: session.client,
          accountNumber,
          symbols: normalizeSymbols(options.symbols),
          directory,
          oauthStorePath,
          maxOrderNotionalUsd: positiveNumber(
            options["max-order-notional"],
            25,
            "max-order-notional",
          ),
          maxSessionNotionalUsd: positiveNumber(
            options["max-session-notional"],
            75,
            "max-session-notional",
          ),
          maxOrders: positiveInteger(options["max-orders"], 3, "max-orders"),
          at: options.at,
        });
        console.log(JSON.stringify(result, null, 2));
      } catch (error) {
        throw redactError(error, accountNumber);
      }
    } finally {
      await closeRobinhood(session);
    }
  } else if (command === "refresh-robinhood") {
    const configPath = options.config || ".scaur/live-config.json";
    const config = await readJson(configPath);
    if (config?.schemaVersion !== "scaur.live-config.v1") {
      throw new Error("Unsupported Scaur live config schema");
    }
    const directory = dirname(config.state);
    const session = await openRobinhood({
      ...options,
      "oauth-store": config["oauth-store"],
    });
    try {
      try {
        const result = await setupRobinhood({
          client: session.client,
          accountNumber: config["robinhood-account-number"],
          symbols: normalizeSymbols(config.symbols),
          directory,
          oauthStorePath: config["oauth-store"],
          maxOrderNotionalUsd: config["live-max-order-notional"],
          maxSessionNotionalUsd: config["live-max-session-notional"],
          maxOrders: config["live-max-orders"],
          writePolicy: false,
          writeConfig: false,
          at: options.at,
        });
        console.log(JSON.stringify({ ...result, refreshed: true }, null, 2));
      } catch (error) {
        throw redactError(error, String(config["robinhood-account-number"] || ""));
      }
    } finally {
      await closeRobinhood(session);
    }
  } else if (command === "robinhood-auth" || command === "robinhood-tools") {
    const session = await openRobinhood(options);
    try {
      const { tools } = await session.client.listTools();
      if (command === "robinhood-tools") {
        console.log(JSON.stringify({ server: "robinhood-trading", tools }, null, 2));
      } else {
        console.log(JSON.stringify({
          connected: true,
          server: "robinhood-trading",
          tools: tools.map((tool) => tool.name),
        }, null, 2));
      }
    } finally {
      await closeRobinhood(session);
    }
  } else if (
    command === "live-order"
    && options.policy
    && options.state
    && options.intent
    && options.ledger
  ) {
    if (options.confirm !== LIVE_CONFIRMATION) {
      throw new Error(`Live execution requires --confirm ${LIVE_CONFIRMATION}`);
    }
    const accountNumber = options["robinhood-account-number"]
      || process.env.SCAUR_ROBINHOOD_ACCOUNT_NUMBER;
    if (typeof accountNumber !== "string" || accountNumber.trim() === "") {
      throw new Error(
        "Live execution requires --robinhood-account-number or SCAUR_ROBINHOOD_ACCOUNT_NUMBER",
      );
    }
    const [policy, state, intent] = await Promise.all([
      readJson(options.policy),
      readJson(options.state),
      readJson(options.intent),
    ]);
    const session = await openRobinhood(options);
    try {
    const result = await executeRobinhoodOrder({
        policy,
        state,
        intent,
        store: new JsonlEventStore(options.ledger),
        client: session.client,
        accountNumber,
        confirmation: options.confirm,
        at: options.at,
      });
      console.log(JSON.stringify(result, null, 2));
      process.exitCode = result.status === "DENIED" ? 2 : 0;
    } finally {
      await closeRobinhood(session);
    }
  } else {
    usage();
    process.exitCode = 64;
  }
} catch (error) {
  console.error(`scaur: ${error.message}`);
  process.exitCode = 1;
}
