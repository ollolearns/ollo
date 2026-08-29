import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { hashWithDomain } from "./canonical.js";
import { RobinhoodMcpAdapter } from "./robinhood.js";

const ACCOUNT_ID = "robinhood-agentic";
const REQUIRED_TOOLS = [
  "get_accounts",
  "get_portfolio",
  "get_equity_positions",
  "get_equity_quotes",
  "get_equity_tradability",
  "review_equity_order",
  "place_equity_order",
];

function finiteNumber(value, label) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Robinhood returned an invalid ${label}`);
  return parsed;
}

function positiveNumber(value, label) {
  const parsed = finiteNumber(value, label);
  if (parsed <= 0) throw new TypeError(`${label} must be greater than zero`);
  return parsed;
}

function positiveInteger(value, label) {
  const parsed = positiveNumber(value, label);
  if (!Number.isSafeInteger(parsed)) throw new TypeError(`${label} must be a positive integer`);
  return parsed;
}

function chunks(values, size) {
  const result = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

function parseTextContent(result) {
  for (const item of result?.content || []) {
    if (item?.type !== "text" || typeof item.text !== "string") continue;
    try {
      return JSON.parse(item.text);
    } catch {
      // Keep looking for a JSON content item.
    }
  }
  return null;
}

export function robinhoodToolData(result, name = "Robinhood tool") {
  const payload = result?.structuredContent || parseTextContent(result);
  const data = payload?.data || payload;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(`${name} did not return structured data`);
  }
  return data;
}

export function normalizeSymbols(value) {
  const values = Array.isArray(value) ? value : String(value || "").split(",");
  return [...new Set(values
    .map((symbol) => String(symbol).trim().toUpperCase())
    .filter(Boolean)
    .map((symbol) => {
      if (!/^[A-Z][A-Z0-9.-]{0,14}$/u.test(symbol)) {
        throw new TypeError(`Invalid equity symbol: ${symbol}`);
      }
      return symbol;
    }))].sort();
}

function cursorFromNext(next) {
  if (typeof next !== "string" || next.trim() === "") return null;
  try {
    return new URL(next).searchParams.get("cursor");
  } catch {
    throw new Error("Robinhood returned an invalid equity-position pagination URL");
  }
}

async function allPositions(adapter, accountNumber) {
  const positions = [];
  const seen = new Set();
  let cursor = null;
  do {
    const args = { account_number: accountNumber };
    if (cursor) args.cursor = cursor;
    const data = robinhoodToolData(
      await adapter.call("get_equity_positions", args),
      "get_equity_positions",
    );
    positions.push(...(Array.isArray(data.positions) ? data.positions.filter(Boolean) : []));
    cursor = cursorFromNext(data.next);
    if (cursor && seen.has(cursor)) throw new Error("Robinhood repeated an equity-position cursor");
    if (cursor) seen.add(cursor);
  } while (cursor);
  return positions;
}

function currentQuote(quote, symbol) {
  if (!quote || quote.symbol !== symbol) throw new Error(`Robinhood did not quote ${symbol}`);
  if (quote.has_traded !== true || quote.state !== "active") {
    throw new Error(`${symbol} does not have an active traded quote`);
  }
  const candidates = [
    [quote.last_trade_price, quote.venue_last_trade_time],
    [quote.last_non_reg_trade_price, quote.venue_last_non_reg_trade_time],
  ].map(([price, at]) => ({ price: Number(price), at, atMs: Date.parse(at) }))
    .filter((item) => Number.isFinite(item.price) && item.price > 0 && Number.isFinite(item.atMs));
  if (candidates.length === 0) throw new Error(`Robinhood did not return a usable quote for ${symbol}`);
  candidates.sort((left, right) => right.atMs - left.atMs);
  return { priceUsd: candidates[0].price, valuedAt: new Date(candidates[0].atMs).toISOString() };
}

function isTradableForAccount(item, accountType) {
  if (!item || item.tradeable !== true || item.state !== "active") return false;
  const accountEntries = Array.isArray(item.account_type_tradabilities)
    ? item.account_type_tradabilities
    : [];
  if (accountEntries.length === 0) return true;
  return accountEntries.some((entry) => (
    entry?.account_type === accountType && entry.account_type_tradability === "tradable"
  ));
}

function unsupportedHoldings(portfolio) {
  const fields = [
    "options_value",
    "futures_value",
    "event_contracts_value",
    "crypto_value",
    "mutual_funds_value",
    "fixed_income_value",
  ];
  return fields.filter((field) => Math.abs(finiteNumber(portfolio[field], field)) > 0.01);
}

function defaultPolicy({ maxOrderNotionalUsd }) {
  return {
    schemaVersion: "scaur.policy.v1",
    description: "Conservative live equity policy generated from Robinhood MCP setup",
    id: "robinhood-live-v1",
    version: "1.0.0",
    allowedVenues: ["robinhood-mcp"],
    maxOrderNotionalUsd,
    maxLimitPriceDeviationPct: 1,
    maxPositionPct: 25,
    maxGrossExposurePct: 95,
    minCashPct: 5,
    maxValuationAgeSeconds: { equity: 300 },
    minAvailableLiquidityUsd: { equity: 0 },
    permitTtlSeconds: 60,
  };
}

function liveConfig({
  accountNumber,
  directory,
  oauthStorePath,
  symbols,
  maxOrderNotionalUsd,
  maxSessionNotionalUsd,
  maxOrders,
}) {
  return {
    schemaVersion: "scaur.live-config.v1",
    policy: join(directory, "live-policy.json"),
    state: join(directory, "live-state.json"),
    ledger: join(directory, "live-events.jsonl"),
    account: ACCOUNT_ID,
    "live-routing": "LIVE_ROBINHOOD_MCP",
    "robinhood-account-number": accountNumber,
    "oauth-store": oauthStorePath,
    symbols: symbols.join(","),
    "live-max-order-notional": maxOrderNotionalUsd,
    "live-max-session-notional": maxSessionNotionalUsd,
    "live-max-orders": maxOrders,
  };
}

async function writePrivateJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
}

export async function setupRobinhood({
  client,
  accountNumber,
  symbols = [],
  directory = ".scaur",
  oauthStorePath = join(directory, "robinhood-oauth.json"),
  maxOrderNotionalUsd = 25,
  maxSessionNotionalUsd = 75,
  maxOrders = 3,
  writePolicy = true,
  writeConfig = true,
  at = new Date().toISOString(),
}) {
  if (typeof accountNumber !== "string" || accountNumber.trim() === "") {
    throw new TypeError("An operator-supplied Robinhood account number is required");
  }
  const capturedAt = new Date(at).toISOString();
  const orderCap = positiveNumber(maxOrderNotionalUsd, "maxOrderNotionalUsd");
  const sessionCap = positiveNumber(maxSessionNotionalUsd, "maxSessionNotionalUsd");
  const orderCount = positiveInteger(maxOrders, "maxOrders");
  if (sessionCap < orderCap) {
    throw new TypeError("maxSessionNotionalUsd must be at least maxOrderNotionalUsd");
  }

  const adapter = new RobinhoodMcpAdapter(client);
  for (const name of REQUIRED_TOOLS) await adapter.requireTool(name);

  const accountData = robinhoodToolData(await adapter.call("get_accounts", {}), "get_accounts");
  const account = (accountData.accounts || []).find(
    (candidate) => candidate?.account_number === accountNumber,
  );
  if (!account) throw new Error("The supplied Robinhood account was not found");
  if (account.agentic_allowed !== true) {
    throw new Error("The supplied Robinhood account is not accessible to this agent");
  }
  if (account.state !== "active" || account.deactivated || account.permanently_deactivated) {
    throw new Error("The supplied Robinhood account is not active");
  }

  const [portfolioResult, positions] = await Promise.all([
    adapter.call("get_portfolio", { account_number: accountNumber }),
    allPositions(adapter, accountNumber),
  ]);
  const portfolio = robinhoodToolData(portfolioResult, "get_portfolio");
  if (portfolio.currency !== "USD") throw new Error("Scaur live setup currently requires a USD account");
  const unsupported = unsupportedHoldings(portfolio);
  if (unsupported.length > 0) {
    throw new Error(`Unsupported non-equity holdings are present: ${unsupported.join(", ")}`);
  }

  const positionBySymbol = new Map();
  for (const position of positions) {
    const symbol = normalizeSymbols([position.symbol])[0];
    const quantity = finiteNumber(position.quantity, `${symbol} quantity`);
    if (quantity < 0 || !["long", "empty"].includes(position.type)) {
      throw new Error(`Scaur live setup does not support the ${position.type || "unknown"} ${symbol} position`);
    }
    if (quantity > 0) positionBySymbol.set(symbol, quantity);
  }
  const selectedSymbols = normalizeSymbols([...positionBySymbol.keys(), ...normalizeSymbols(symbols)]);
  if (selectedSymbols.length === 0) {
    throw new Error("No equity symbols were found; supply --symbols AAPL,MSFT (for example)");
  }

  const quoteRows = [];
  for (const batch of chunks(selectedSymbols, 20)) {
    const data = robinhoodToolData(
      await adapter.call("get_equity_quotes", { symbols: batch }),
      "get_equity_quotes",
    );
    quoteRows.push(...(data.results || []).filter(Boolean));
  }
  const tradabilityRows = [];
  for (const batch of chunks(selectedSymbols, 10)) {
    const data = robinhoodToolData(
      await adapter.call("get_equity_tradability", {
        account_number: accountNumber,
        symbols: batch,
      }),
      "get_equity_tradability",
    );
    if (Array.isArray(data.not_found) && data.not_found.length > 0) {
      throw new Error(`Robinhood could not resolve: ${data.not_found.join(", ")}`);
    }
    tradabilityRows.push(...(data.results || []).filter(Boolean));
  }

  const quoteBySymbol = new Map(quoteRows.map((row) => [row?.quote?.symbol, row?.quote]));
  const tradabilityBySymbol = new Map(tradabilityRows.map((row) => [row?.symbol, row]));
  const assets = {};
  const statePositions = [];
  for (const symbol of selectedSymbols) {
    const quote = currentQuote(quoteBySymbol.get(symbol), symbol);
    const tradability = tradabilityBySymbol.get(symbol);
    if (!tradability) throw new Error(`Robinhood did not return tradability for ${symbol}`);
    assets[symbol] = {
      assetClass: "equity",
      eligible: isTradableForAccount(tradability, account.brokerage_account_type),
      priceUsd: quote.priceUsd,
      valuedAt: quote.valuedAt,
      availableLiquidityUsd: orderCap,
      liquidityBasis: "configured_order_cap",
      venue: "robinhood-mcp",
    };
    const quantity = positionBySymbol.get(symbol) || 0;
    if (quantity > 0) {
      statePositions.push({
        assetId: symbol,
        assetClass: "equity",
        marketValueUsd: quantity * quote.priceUsd,
      });
    }
  }

  const stateBody = {
    schemaVersion: "scaur.state.v1",
    capturedAt,
    accountId: ACCOUNT_ID,
    portfolioValueUsd: positiveNumber(portfolio.total_value, "portfolio total_value"),
    cashUsd: finiteNumber(portfolio.cash, "portfolio cash"),
    positions: statePositions,
    assets,
    source: {
      venue: "robinhood-mcp",
      tools: ["get_accounts", "get_portfolio", "get_equity_positions", "get_equity_quotes", "get_equity_tradability"],
    },
  };
  const state = {
    ...stateBody,
    snapshotId: `robinhood-${hashWithDomain("scaur.robinhood-state.v1", stateBody).slice(0, 24)}`,
  };
  const assetRows = Object.values(assets);
  const stateFreshForPolicy = assetRows.every((asset) => {
    const ageSeconds = (Date.parse(capturedAt) - Date.parse(asset.valuedAt)) / 1000;
    return Number.isFinite(ageSeconds) && ageSeconds >= 0 && ageSeconds <= 300;
  });
  const allSymbolsEligible = assetRows.every((asset) => asset.eligible === true);
  const policy = defaultPolicy({ maxOrderNotionalUsd: orderCap });
  const config = liveConfig({
    accountNumber,
    directory,
    oauthStorePath,
    symbols: selectedSymbols,
    maxOrderNotionalUsd: orderCap,
    maxSessionNotionalUsd: sessionCap,
    maxOrders: orderCount,
  });

  await mkdir(directory, { recursive: true });
  const writes = [writePrivateJson(join(directory, "live-state.json"), state)];
  if (writePolicy) writes.push(writePrivateJson(join(directory, "live-policy.json"), policy));
  if (writeConfig) writes.push(writePrivateJson(join(directory, "live-config.json"), config));
  await Promise.all(writes);
  await appendFile(join(directory, "live-events.jsonl"), "", { encoding: "utf8", mode: 0o600 });

  return {
    schemaVersion: "scaur.robinhood-setup.v1",
    ready: stateFreshForPolicy && allSymbolsEligible,
    mode: "live",
    symbols: selectedSymbols,
    files: {
      policy: join(directory, "live-policy.json"),
      state: join(directory, "live-state.json"),
      ledger: join(directory, "live-events.jsonl"),
      config: join(directory, "live-config.json"),
    },
    ceilings: {
      maxOrderNotionalUsd: orderCap,
      maxSessionNotionalUsd: sessionCap,
      maxOrders: orderCount,
    },
    checks: {
      stateFreshForPolicy,
      allSymbolsEligible,
    },
    start: "npm run mcp:live",
  };
}
