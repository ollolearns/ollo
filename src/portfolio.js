import { hashWithDomain } from "./canonical.js";

function finiteNumber(value, label) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new TypeError(`${label} must be finite`);
  return parsed;
}

function round(value, decimals = 8) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function buildRebalanceIntents({
  state,
  targets,
  accountId,
  venue = "paper",
  minTradeNotionalUsd = 100,
}) {
  const portfolioValue = finiteNumber(state?.portfolioValueUsd, "portfolioValueUsd");
  if (portfolioValue <= 0) throw new TypeError("portfolioValueUsd must be positive");
  if (!targets || typeof targets !== "object" || Array.isArray(targets)) {
    throw new TypeError("targets must be an asset-to-weight object");
  }
  if (typeof accountId !== "string" || accountId.trim() === "") {
    throw new TypeError("accountId must be a non-empty string");
  }

  const currentValues = new Map(
    (state.positions || []).map((position) => [
      position.assetId,
      finiteNumber(position.marketValueUsd, `position ${position.assetId}`),
    ]),
  );
  const normalizedTargets = Object.entries(targets)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([assetId, rawWeight]) => {
      const weight = finiteNumber(rawWeight, `target weight ${assetId}`);
      if (weight < 0 || weight > 1) {
        throw new TypeError(`target weight ${assetId} must be between 0 and 1`);
      }
      if (!state.assets?.[assetId]) throw new TypeError(`Missing asset state for ${assetId}`);
      return [assetId, weight];
    });

  const totalWeight = normalizedTargets.reduce((sum, [, weight]) => sum + weight, 0);
  if (totalWeight > 1 + Number.EPSILON) {
    throw new TypeError("target weights cannot exceed 100% of portfolio value");
  }

  const intents = [];
  for (const [assetId, weight] of normalizedTargets) {
    const price = finiteNumber(state.assets[assetId].priceUsd, `price ${assetId}`);
    if (price <= 0) throw new TypeError(`price ${assetId} must be positive`);
    const currentValue = currentValues.get(assetId) || 0;
    const targetValue = portfolioValue * weight;
    const delta = round(targetValue - currentValue, 2);
    if (Math.abs(delta) < minTradeNotionalUsd) continue;

    const side = delta > 0 ? "BUY" : "SELL";
    const quantity = round(Math.abs(delta) / price);
    const identity = {
      accountId,
      assetId,
      side,
      quantity,
      limitPriceUsd: price,
      venue,
      targetWeight: weight,
    };
    intents.push({
      id: `rebalance-${hashWithDomain("scaur.rebalance-intent.v1", identity).slice(0, 16)}`,
      accountId,
      assetId,
      side,
      quantity,
      limitPriceUsd: price,
      venue,
    });
  }

  return intents.sort((left, right) => {
    if (left.side !== right.side) return left.side === "SELL" ? -1 : 1;
    return left.assetId.localeCompare(right.assetId);
  });
}

export function applyPaperFill(state, fill) {
  const next = structuredClone(state);
  const notional = fill.quantity * fill.priceUsd;
  const signedNotional = fill.side === "BUY" ? notional : -notional;
  const positions = new Map((next.positions || []).map((position) => [position.assetId, position]));
  const current = positions.get(fill.assetId) || {
    assetId: fill.assetId,
    assetClass: next.assets?.[fill.assetId]?.assetClass || null,
    marketValueUsd: 0,
  };
  const marketValueUsd = round(Number(current.marketValueUsd) + signedNotional, 2);

  if (marketValueUsd < -Number.EPSILON) throw new Error("Paper fill would create a short position");
  if (marketValueUsd <= Number.EPSILON) positions.delete(fill.assetId);
  else positions.set(fill.assetId, { ...current, marketValueUsd });

  next.cashUsd = round(Number(next.cashUsd) - signedNotional, 2);
  next.positions = [...positions.values()].sort((left, right) => left.assetId.localeCompare(right.assetId));
  next.snapshotId = `paper-${hashWithDomain("scaur.paper-state.v1", {
    previousSnapshotId: state.snapshotId || null,
    fillId: fill.fillId,
    cashUsd: next.cashUsd,
    positions: next.positions,
  }).slice(0, 24)}`;
  return next;
}
