function result(id, pass, observed, limit, reason) {
  return { id, pass: Boolean(pass), observed, limit, reason };
}

function number(value, fallback = Number.NaN) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function evaluatePolicy({ policy, state, intent, evaluatedAt }) {
  const checks = [];
  const asset = state?.assets?.[intent.assetId];
  const positions = Array.isArray(state?.positions) ? state.positions : [];
  const portfolioValue = number(state?.portfolioValueUsd);
  const cash = number(state?.cashUsd);
  const notional = intent.quantity * intent.limitPriceUsd;

  checks.push(result(
    "portfolio.value_valid",
    Number.isFinite(portfolioValue) && portfolioValue > 0,
    Number.isFinite(portfolioValue) ? portfolioValue : null,
    "> 0",
    portfolioValue > 0 ? "Portfolio value is valid." : "Portfolio value is missing or non-positive.",
  ));

  checks.push(result(
    "portfolio.cash_valid",
    Number.isFinite(cash) && cash >= 0,
    Number.isFinite(cash) ? cash : null,
    ">= 0",
    cash >= 0 ? "Cash balance is valid." : "Cash balance is missing or negative.",
  ));

  checks.push(result(
    "asset.known",
    Boolean(asset),
    asset ? intent.assetId : null,
    "asset must exist in the signed state snapshot",
    asset ? "Asset facts found." : "Asset facts are missing.",
  ));

  if (!asset) return checks;

  const assetClass = asset.assetClass;
  const maxAge = number(policy?.maxValuationAgeSeconds?.[assetClass]);
  const valuedAtMs = Date.parse(asset.valuedAt);
  const evaluatedAtMs = Date.parse(evaluatedAt);
  const ageSeconds = (evaluatedAtMs - valuedAtMs) / 1000;
  const venueAllowed = Array.isArray(policy?.allowedVenues)
    && policy.allowedVenues.includes(intent.venue);

  checks.push(result(
    "venue.allowed",
    venueAllowed,
    intent.venue,
    policy?.allowedVenues || [],
    venueAllowed ? "Venue is permitted." : "Venue is not permitted by policy.",
  ));

  const assetVenues = Array.isArray(asset.venues)
    ? asset.venues
    : (typeof asset.venue === "string" ? [asset.venue] : []);
  const assetVenueSupported = assetVenues.includes(intent.venue);
  checks.push(result(
    "venue.asset_supported",
    assetVenueSupported,
    intent.venue,
    assetVenues,
    assetVenueSupported ? "Asset state confirms venue support." : "Asset state does not confirm this venue.",
  ));

  checks.push(result(
    "asset.eligible",
    asset.eligible === true,
    asset.eligible === true,
    true,
    asset.eligible === true ? "Asset is eligible for this account snapshot." : "Asset is not eligible.",
  ));

  const classSupported = Number.isFinite(maxAge);
  checks.push(result(
    "asset.class_supported",
    classSupported,
    assetClass || null,
    Object.keys(policy?.maxValuationAgeSeconds || {}),
    classSupported ? "Asset class has a freshness policy." : "Asset class has no freshness policy.",
  ));

  const fresh = classSupported
    && Number.isFinite(ageSeconds)
    && ageSeconds >= 0
    && ageSeconds <= maxAge;
  checks.push(result(
    "valuation.fresh",
    fresh,
    Number.isFinite(ageSeconds) ? ageSeconds : null,
    Number.isFinite(maxAge) ? maxAge : null,
    fresh ? "Valuation is within the allowed age." : "Valuation is missing, future-dated, or stale.",
  ));

  const referencePrice = number(asset.priceUsd);
  const maxPriceDeviationPct = number(policy?.maxLimitPriceDeviationPct);
  const priceDeviationPct = referencePrice > 0
    ? (Math.abs(intent.limitPriceUsd - referencePrice) / referencePrice) * 100
    : Number.NaN;
  const priceBoundPass = Number.isFinite(priceDeviationPct)
    && Number.isFinite(maxPriceDeviationPct)
    && priceDeviationPct <= maxPriceDeviationPct;
  checks.push(result(
    "price.limit_deviation",
    priceBoundPass,
    Number.isFinite(priceDeviationPct) ? priceDeviationPct : null,
    Number.isFinite(maxPriceDeviationPct) ? maxPriceDeviationPct : null,
    priceBoundPass ? "Limit price is within the reference-price band." : "Limit price is missing a reference or exceeds the allowed deviation.",
  ));

  const maxOrder = number(policy?.maxOrderNotionalUsd);
  checks.push(result(
    "order.notional",
    Number.isFinite(maxOrder) && notional <= maxOrder,
    notional,
    Number.isFinite(maxOrder) ? maxOrder : null,
    notional <= maxOrder ? "Order is within the notional ceiling." : "Order exceeds the notional ceiling.",
  ));

  const availableLiquidity = number(asset.availableLiquidityUsd, 0);
  const classFloor = number(policy?.minAvailableLiquidityUsd?.[assetClass]);
  const requiredLiquidity = Number.isFinite(classFloor)
    ? Math.max(notional, classFloor)
    : Number.POSITIVE_INFINITY;
  const liquidityPass = Number.isFinite(requiredLiquidity)
    && availableLiquidity >= requiredLiquidity;
  checks.push(result(
    "liquidity.available",
    liquidityPass,
    availableLiquidity,
    Number.isFinite(requiredLiquidity) ? requiredLiquidity : null,
    liquidityPass ? "Available liquidity clears the order and class floor." : "Available liquidity is insufficient or unconfigured.",
  ));

  const currentByAsset = new Map(
    positions.map((position) => [position.assetId, number(position.marketValueUsd, 0)]),
  );
  const currentPosition = currentByAsset.get(intent.assetId) || 0;
  const signedNotional = intent.side === "BUY" ? notional : -notional;
  const postPosition = currentPosition + signedNotional;
  const inventoryPass = intent.side === "BUY" || postPosition >= 0;
  checks.push(result(
    "inventory.sufficient",
    inventoryPass,
    currentPosition,
    intent.side === "SELL" ? notional : 0,
    inventoryPass ? "Position inventory is sufficient." : "Sell exceeds current inventory.",
  ));

  const maxPositionPct = number(policy?.maxPositionPct);
  const postPositionPct = portfolioValue > 0 ? (Math.max(0, postPosition) / portfolioValue) * 100 : Number.NaN;
  const positionPass = Number.isFinite(postPositionPct)
    && Number.isFinite(maxPositionPct)
    && postPositionPct <= maxPositionPct;
  checks.push(result(
    "position.max",
    positionPass,
    Number.isFinite(postPositionPct) ? postPositionPct : null,
    Number.isFinite(maxPositionPct) ? maxPositionPct : null,
    positionPass ? "Resulting position is within the concentration limit." : "Resulting position exceeds the concentration limit.",
  ));

  currentByAsset.set(intent.assetId, postPosition);
  const postGross = [...currentByAsset.values()].reduce((sum, value) => sum + Math.abs(value), 0);
  const postGrossPct = portfolioValue > 0 ? (postGross / portfolioValue) * 100 : Number.NaN;
  const maxGrossPct = number(policy?.maxGrossExposurePct);
  const grossPass = Number.isFinite(postGrossPct)
    && Number.isFinite(maxGrossPct)
    && postGrossPct <= maxGrossPct;
  checks.push(result(
    "portfolio.gross_exposure",
    grossPass,
    Number.isFinite(postGrossPct) ? postGrossPct : null,
    Number.isFinite(maxGrossPct) ? maxGrossPct : null,
    grossPass ? "Resulting gross exposure is within policy." : "Resulting gross exposure exceeds policy.",
  ));

  const postCash = cash - signedNotional;
  const postCashPct = portfolioValue > 0 ? (postCash / portfolioValue) * 100 : Number.NaN;
  const minCashPct = number(policy?.minCashPct);
  const cashPass = Number.isFinite(postCashPct)
    && Number.isFinite(minCashPct)
    && postCashPct >= minCashPct;
  checks.push(result(
    "portfolio.min_cash",
    cashPass,
    Number.isFinite(postCashPct) ? postCashPct : null,
    Number.isFinite(minCashPct) ? minCashPct : null,
    cashPass ? "Resulting cash remains above the floor." : "Resulting cash falls below the floor.",
  ));

  return checks;
}
