import { hashWithDomain } from "./canonical.js";
import { RobinhoodMcpAdapter } from "./robinhood.js";
import { robinhoodToolData } from "./robinhood-setup.js";

const RESEARCH_TOOLS = [
  "get_equity_quotes",
  "get_equity_fundamentals",
  "get_equity_technical_indicators",
  "get_earnings_results",
];

function normalizeSymbol(value) {
  const symbol = String(value || "").trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9.-]{0,14}$/u.test(symbol)) {
    throw new TypeError(`Invalid equity symbol: ${value}`);
  }
  return symbol;
}

function finiteNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`Robinhood returned an invalid ${label}`);
  return number;
}

function optionalNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function percentage(numerator, denominator) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return null;
  }
  return (numerator / denominator) * 100;
}

function latestQuote(bundle, symbol) {
  const quote = bundle?.quote;
  if (!quote || (quote.symbol && quote.symbol !== symbol)) {
    throw new Error(`Robinhood did not quote ${symbol}`);
  }
  const candidates = [
    {
      session: "regular",
      priceUsd: optionalNumber(quote.last_trade_price),
      observedAt: quote.venue_last_trade_time,
    },
    {
      session: "extended",
      priceUsd: optionalNumber(quote.last_non_reg_trade_price),
      observedAt: quote.venue_last_non_reg_trade_time,
    },
  ].map((candidate) => ({
    ...candidate,
    observedAtMs: Date.parse(candidate.observedAt),
  })).filter((candidate) => (
    Number.isFinite(candidate.priceUsd)
      && candidate.priceUsd > 0
      && Number.isFinite(candidate.observedAtMs)
  ));
  if (candidates.length === 0) throw new Error(`Robinhood returned no usable quote for ${symbol}`);
  candidates.sort((left, right) => right.observedAtMs - left.observedAtMs);
  return candidates[0];
}

function normalizedEarnings(rows) {
  return rows.map((row) => ({
    year: optionalNumber(row?.year),
    quarter: optionalNumber(row?.quarter),
    reportDate: row?.report?.date || null,
    verified: row?.report?.verified === true,
    actualEpsUsd: optionalNumber(row?.eps?.actual),
    estimatedEpsUsd: optionalNumber(row?.eps?.estimate),
  })).sort((left, right) => {
    const leftDate = Date.parse(left.reportDate);
    const rightDate = Date.parse(right.reportDate);
    if (Number.isFinite(leftDate) && Number.isFinite(rightDate)) return leftDate - rightDate;
    return ((left.year || 0) * 10 + (left.quarter || 0))
      - ((right.year || 0) * 10 + (right.quarter || 0));
  });
}

function latestReportedEarnings(rows) {
  const reported = rows.filter((row) => (
    Number.isFinite(row.actualEpsUsd) && Number.isFinite(row.estimatedEpsUsd)
  ));
  const latest = reported.at(-1) || null;
  const beats = reported.filter((row) => row.actualEpsUsd > row.estimatedEpsUsd).length;
  return {
    reportedQuarters: reported.length,
    beats,
    beatRatePct: percentage(beats, reported.length),
    latest: latest ? {
      ...latest,
      surprisePct: percentage(
        latest.actualEpsUsd - latest.estimatedEpsUsd,
        Math.abs(latest.estimatedEpsUsd),
      ),
    } : null,
  };
}

function nextEarnings(rows, requestedAt) {
  const requestedAtMs = Date.parse(requestedAt);
  return rows.find((row) => {
    const reportAtMs = Date.parse(row.reportDate);
    return row.actualEpsUsd === null
      && row.verified
      && Number.isFinite(reportAtMs)
      && reportAtMs >= requestedAtMs;
  }) || rows.find((row) => row.actualEpsUsd === null && row.verified) || null;
}

function normalizeRequest(at, lookbackDays) {
  const requestedAtMs = Date.parse(at);
  if (!Number.isFinite(requestedAtMs)) throw new TypeError("at must be a valid timestamp");
  if (!Number.isSafeInteger(lookbackDays) || lookbackDays < 30 || lookbackDays > 365) {
    throw new TypeError("lookbackDays must be an integer from 30 to 365");
  }
  return {
    requestedAtMs,
    requestedAt: new Date(requestedAtMs).toISOString(),
  };
}

async function researchAdapter(client) {
  const adapter = new RobinhoodMcpAdapter(client);
  for (const name of RESEARCH_TOOLS) await adapter.requireTool(name);
  return adapter;
}

async function researchEquityWithAdapter({
  adapter,
  symbol,
  requestedAt,
  requestedAtMs,
  lookbackDays,
}) {
  const startTime = new Date(requestedAtMs - lookbackDays * 86_400_000).toISOString();

  const [quoteResult, fundamentalsResult, rsiResult, earningsResult] = await Promise.all([
    adapter.call("get_equity_quotes", { symbols: [symbol] }),
    adapter.call("get_equity_fundamentals", {
      symbols: [symbol],
      bounds: "regular",
    }),
    adapter.call("get_equity_technical_indicators", {
      symbol,
      type: "rsi",
      interval: "day",
      start_time: startTime,
      end_time: requestedAt,
      bounds: "regular",
      adjustment_type: "split",
      output: "latest",
      period: 14,
    }),
    adapter.call("get_earnings_results", { symbol }),
  ]);

  const quoteData = robinhoodToolData(quoteResult, "get_equity_quotes");
  const fundamentalsData = robinhoodToolData(
    fundamentalsResult,
    "get_equity_fundamentals",
  );
  const indicatorData = robinhoodToolData(
    rsiResult,
    "get_equity_technical_indicators",
  );
  const earningsData = robinhoodToolData(earningsResult, "get_earnings_results");
  const quoteBundle = (quoteData.results || []).find(
    (row) => row?.quote?.symbol === symbol,
  ) || quoteData.results?.[0];
  const quote = latestQuote(quoteBundle, symbol);
  const quoteFields = quoteBundle.quote;
  const fundamentals = (fundamentalsData.results || []).find(
    (row) => !row?.symbol || row.symbol === symbol,
  );
  if (!fundamentals) throw new Error(`Robinhood returned no fundamentals for ${symbol}`);
  const rsiSeries = indicatorData.indicators?.[0]?.series || [];
  const rsiValue = optionalNumber(rsiSeries.at(-1)?.value ?? rsiSeries[0]?.value);
  if (!Number.isFinite(rsiValue)) throw new Error(`Robinhood returned no RSI value for ${symbol}`);

  const priorCloseUsd = finiteNumber(
    quoteFields.adjusted_previous_close,
    `${symbol} adjusted previous close`,
  );
  const low52WeekUsd = optionalNumber(fundamentals.low_52_weeks);
  const high52WeekUsd = optionalNumber(fundamentals.high_52_weeks);
  const volume = optionalNumber(fundamentals.volume);
  const averageVolume2Weeks = optionalNumber(fundamentals.average_volume_2_weeks);
  const earnings = normalizedEarnings(
    Array.isArray(earningsData.results) ? earningsData.results : [],
  );
  const reportedEarnings = latestReportedEarnings(earnings);

  const evidence = {
    schemaVersion: "scaur.equity-research.v1",
    status: "COMPLETE",
    symbol,
    requestedAt,
    observedAt: new Date(quote.observedAtMs).toISOString(),
    source: {
      provider: "robinhood-trading-mcp",
      publicMarketDataOnly: true,
      tools: RESEARCH_TOOLS,
    },
    market: {
      session: quote.session,
      priceUsd: quote.priceUsd,
      priorCloseUsd,
      dayChangePct: percentage(quote.priceUsd - priorCloseUsd, priorCloseUsd),
    },
    range52Week: {
      lowUsd: low52WeekUsd,
      highUsd: high52WeekUsd,
      positionPct: Number.isFinite(low52WeekUsd)
        && Number.isFinite(high52WeekUsd)
        && high52WeekUsd > low52WeekUsd
        ? percentage(quote.priceUsd - low52WeekUsd, high52WeekUsd - low52WeekUsd)
        : null,
    },
    valuation: {
      peRatio: optionalNumber(fundamentals.pe_ratio),
      pbRatio: optionalNumber(fundamentals.pb_ratio),
      dividendYieldPct: optionalNumber(fundamentals.dividend_yield),
    },
    liquidity: {
      volume,
      averageVolume2Weeks,
      relativeVolume: Number.isFinite(volume)
        && Number.isFinite(averageVolume2Weeks)
        && averageVolume2Weeks > 0
        ? volume / averageVolume2Weeks
        : null,
    },
    momentum: {
      indicator: "RSI",
      period: 14,
      interval: "day",
      lookbackDays,
      value: rsiValue,
      band: rsiValue >= 70 ? "ABOVE_70" : (rsiValue <= 30 ? "BELOW_30" : "BETWEEN_30_70"),
    },
    earnings: {
      ...reportedEarnings,
      nextVerified: nextEarnings(earnings, requestedAt),
    },
  };
  return {
    ...evidence,
    evidenceHash: hashWithDomain("scaur.equity-research.v1", evidence),
  };
}

export async function researchEquity({
  client,
  symbol,
  at = new Date().toISOString(),
  lookbackDays = 90,
}) {
  const normalizedSymbol = normalizeSymbol(symbol);
  const request = normalizeRequest(at, lookbackDays);
  const adapter = await researchAdapter(client);
  return researchEquityWithAdapter({
    adapter,
    symbol: normalizedSymbol,
    ...request,
    lookbackDays,
  });
}

export async function compareEquities({
  client,
  symbols,
  at = new Date().toISOString(),
  lookbackDays = 90,
}) {
  if (!Array.isArray(symbols) || symbols.length < 2 || symbols.length > 5) {
    throw new TypeError("symbols must contain from 2 to 5 equity tickers");
  }
  const normalizedSymbols = [...new Set(symbols.map(normalizeSymbol))];
  if (normalizedSymbols.length < 2) {
    throw new TypeError("symbols must contain at least 2 unique equity tickers");
  }
  const request = normalizeRequest(at, lookbackDays);
  const adapter = await researchAdapter(client);
  const items = [];
  for (const symbol of normalizedSymbols) {
    items.push(await researchEquityWithAdapter({
      adapter,
      symbol,
      ...request,
      lookbackDays,
    }));
  }

  const evidence = {
    schemaVersion: "scaur.equity-comparison.v1",
    status: "COMPLETE",
    requestedAt: request.requestedAt,
    symbols: normalizedSymbols,
    source: {
      provider: "robinhood-trading-mcp",
      publicMarketDataOnly: true,
      accountDataRead: false,
      orderToolsCalled: false,
    },
    comparison: items.map((item) => ({
      symbol: item.symbol,
      observedAt: item.observedAt,
      priceUsd: item.market.priceUsd,
      dayChangePct: item.market.dayChangePct,
      range52WeekPositionPct: item.range52Week.positionPct,
      peRatio: item.valuation.peRatio,
      dividendYieldPct: item.valuation.dividendYieldPct,
      relativeVolume: item.liquidity.relativeVolume,
      rsi14: item.momentum.value,
      rsiBand: item.momentum.band,
      earningsBeatRatePct: item.earnings.beatRatePct,
      nextVerifiedEarningsDate: item.earnings.nextVerified?.reportDate || null,
      evidenceHash: item.evidenceHash,
    })),
    items,
  };
  return {
    ...evidence,
    evidenceHash: hashWithDomain("scaur.equity-comparison.v1", evidence),
  };
}
