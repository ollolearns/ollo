import process from "node:process";
import {
  closeRobinhood,
  connectRobinhood,
  researchEquity,
} from "../src/index.js";

function option(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function money(value) {
  return Number.isFinite(value) ? `$${value.toFixed(2)}` : "n/a";
}

function percent(value) {
  return Number.isFinite(value) ? `${value >= 0 ? "+" : ""}${value.toFixed(2)}%` : "n/a";
}

function decimal(value, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : "n/a";
}

function row(label, value) {
  console.log(`${label.padEnd(18)}${value}`);
}

const symbol = String(option("symbol", "AAPL")).trim().toUpperCase();
const oauthStorePath = option("oauth-store", ".scaur/robinhood-oauth.json");
const session = await connectRobinhood({
  oauthStorePath,
  onAuthorizationUrl: (url) => {
    console.error("Authorization required:");
    console.error(url.toString());
  },
});

try {
  const result = await researchEquity({ client: session.client, symbol });
  console.log(`SCAUR RESEARCH / ${result.symbol}`);
  row("source", "robinhood-trading MCP");
  row("observed", result.observedAt);
  console.log();
  row("price", `${money(result.market.priceUsd)} | prior ${money(result.market.priorCloseUsd)} | ${percent(result.market.dayChangePct)}`);
  row("52-week range", `${money(result.range52Week.lowUsd)} - ${money(result.range52Week.highUsd)} | ${percent(result.range52Week.positionPct)} through range`);
  row("valuation", `P/E ${decimal(result.valuation.peRatio)} | P/B ${decimal(result.valuation.pbRatio)} | yield ${percent(result.valuation.dividendYieldPct)}`);
  row("relative volume", `${decimal(result.liquidity.relativeVolume)}x 2-week average`);
  row("momentum", `RSI(14) ${decimal(result.momentum.value)} | ${result.momentum.band}`);
  if (result.earnings.latest) {
    const latest = result.earnings.latest;
    row("latest EPS", `${latest.year} Q${latest.quarter} ${money(latest.actualEpsUsd)} vs ${money(latest.estimatedEpsUsd)} | ${percent(latest.surprisePct)}`);
  }
  row("earnings record", `${result.earnings.beats}/${result.earnings.reportedQuarters} reported quarters beat estimates`);
  if (result.earnings.nextVerified) {
    row("next earnings", `${result.earnings.nextVerified.reportDate} | verified`);
  }
  console.log();
  row("status", "RESEARCH COMPLETE / NO ORDER PROPOSED");
  row("evidence hash", result.evidenceHash);
} finally {
  await closeRobinhood(session);
}
