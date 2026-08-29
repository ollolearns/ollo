function check(id, pass, observed, limit, reason) {
  return { id, pass: Boolean(pass), observed, limit, reason };
}

export function consumedLiveStateHashes(events) {
  const stateByPermit = new Map();
  const consumed = new Set();

  for (const event of events || []) {
    const receipt = event.type === "decision.recorded" ? event.payload?.receipt : null;
    if (
      event.payload?.executionMode === "live"
      && receipt?.permit?.permitId
      && receipt?.stateHash
    ) {
      stateByPermit.set(receipt.permit.permitId, receipt.stateHash);
    }
    if (event.type === "permit.consumed" && event.payload?.venue === "robinhood-mcp") {
      consumed.add(event.payload.permitId);
    }
  }

  return new Set(
    [...consumed]
      .map((permitId) => stateByPermit.get(permitId))
      .filter(Boolean),
  );
}

export class LiveSessionBudget {
  constructor({ maxOrderNotionalUsd, maxSessionNotionalUsd, maxOrders }) {
    this.maxOrderNotionalUsd = maxOrderNotionalUsd;
    this.maxSessionNotionalUsd = maxSessionNotionalUsd;
    this.maxOrders = maxOrders;
    this.reservedNotionalUsd = 0;
    this.reservedOrders = 0;
  }

  evaluate({
    notionalUsd,
    stateHash,
    assetClass,
    consumedStateHashes = new Set(),
  }) {
    const projectedNotional = this.reservedNotionalUsd + notionalUsd;
    const projectedOrders = this.reservedOrders + 1;
    const stateUnused = !consumedStateHashes.has(stateHash);
    return [
      check(
        "live.order_notional",
        notionalUsd <= this.maxOrderNotionalUsd,
        notionalUsd,
        this.maxOrderNotionalUsd,
        notionalUsd <= this.maxOrderNotionalUsd
          ? "Order is within the operator's live ceiling."
          : "Order exceeds the operator's live ceiling.",
      ),
      check(
        "live.session_notional",
        projectedNotional <= this.maxSessionNotionalUsd,
        projectedNotional,
        this.maxSessionNotionalUsd,
        projectedNotional <= this.maxSessionNotionalUsd
          ? "Projected session notional is within the operator's ceiling."
          : "Projected session notional exceeds the operator's ceiling.",
      ),
      check(
        "live.session_orders",
        projectedOrders <= this.maxOrders,
        projectedOrders,
        this.maxOrders,
        projectedOrders <= this.maxOrders
          ? "Projected live order count is within the operator's ceiling."
          : "Projected live order count exceeds the operator's ceiling.",
      ),
      check(
        "live.state_unused",
        stateUnused,
        stateHash,
        "fresh state hash required after each consumed live permit",
        stateUnused
          ? "This state snapshot has not authorized a consumed live permit."
          : "This state snapshot was already used for a live attempt; reconcile and refresh it.",
      ),
      check(
        "live.asset_class",
        assetClass === "equity",
        assetClass || null,
        "equity",
        assetClass === "equity"
          ? "The operator-supplied state classifies this symbol as an equity."
          : "Live MCP v0.6 accepts equities only.",
      ),
    ];
  }

  reserve(notionalUsd) {
    this.reservedNotionalUsd += notionalUsd;
    this.reservedOrders += 1;
    return this.snapshot();
  }

  snapshot() {
    return {
      maxOrderNotionalUsd: this.maxOrderNotionalUsd,
      maxSessionNotionalUsd: this.maxSessionNotionalUsd,
      maxOrders: this.maxOrders,
      reservedNotionalUsd: this.reservedNotionalUsd,
      reservedOrders: this.reservedOrders,
      remainingSessionNotionalUsd: Math.max(
        0,
        this.maxSessionNotionalUsd - this.reservedNotionalUsd,
      ),
      remainingOrders: Math.max(0, this.maxOrders - this.reservedOrders),
      resetsOnServerRestart: true,
    };
  }
}
