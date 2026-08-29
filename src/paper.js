import { hashWithDomain } from "./canonical.js";
import { evaluate } from "./evaluate.js";
import { DurablePermitLedger } from "./permit.js";
import { applyPaperFill, buildRebalanceIntents } from "./portfolio.js";

function paperFill(permit, intent, at) {
  const body = {
    schemaVersion: "scaur.paper-fill.v1",
    permitId: permit.permitId,
    intentHash: permit.intentHash,
    accountId: intent.accountId,
    assetId: intent.assetId,
    side: intent.side,
    quantity: intent.quantity,
    priceUsd: intent.limitPriceUsd,
    venue: "paper",
    filledAt: new Date(at).toISOString(),
  };
  return { ...body, fillId: hashWithDomain("scaur.paper-fill.v1", body) };
}

export async function executePaperOrder({
  policy,
  state,
  intent,
  store,
  at = new Date().toISOString(),
  cycleId,
}) {
  if (!store || typeof store.append !== "function") {
    throw new TypeError("A durable event store is required for paper orders");
  }
  if (intent?.venue !== "paper") {
    throw new TypeError("The reference relay supports only the paper venue");
  }

  const evaluatedAt = new Date(at).toISOString();
  const receipt = evaluate({ policy, state, intent, at: evaluatedAt });
  const eventContext = cycleId ? { cycleId } : {};
  await store.append("decision.recorded", { ...eventContext, receipt }, evaluatedAt);

  if (receipt.decision !== "ALLOW") {
    return {
      schemaVersion: "scaur.paper-order.v1",
      status: "DENIED",
      evaluatedAt,
      receipt,
      fill: null,
      finalStateHash: hashWithDomain("scaur.state.v1", state),
      finalState: structuredClone(state),
    };
  }

  const consumption = await new DurablePermitLedger(store).consume(
    receipt.permit,
    intent,
    evaluatedAt,
  );
  if (!consumption.valid) {
    throw new Error(`Permit consumption failed closed: ${consumption.reason}`);
  }

  const fill = paperFill(receipt.permit, intent, evaluatedAt);
  const finalState = applyPaperFill(state, fill);
  await store.append("fill.recorded", { ...eventContext, fill }, evaluatedAt);
  return {
    schemaVersion: "scaur.paper-order.v1",
    status: "FILLED",
    evaluatedAt,
    receipt,
    fill,
    finalStateHash: hashWithDomain("scaur.state.v1", finalState),
    finalState,
  };
}

export async function runPaperCycle({
  policy,
  state,
  targets,
  accountId,
  store,
  at = new Date().toISOString(),
  venue = "paper",
  minTradeNotionalUsd = 100,
}) {
  if (!store || typeof store.append !== "function") {
    throw new TypeError("A durable event store is required for paper cycles");
  }
  if (venue !== "paper") throw new TypeError("The reference relay supports only the paper venue");

  const evaluatedAt = new Date(at).toISOString();
  const cycleBody = {
    policyHash: hashWithDomain("scaur.policy.v1", policy),
    startingStateHash: hashWithDomain("scaur.state.v1", state),
    targetsHash: hashWithDomain("scaur.targets.v1", targets),
    accountId,
    venue,
    evaluatedAt,
  };
  const cycleId = hashWithDomain("scaur.paper-cycle.v1", cycleBody);
  const intents = buildRebalanceIntents({
    state,
    targets,
    accountId,
    venue,
    minTradeNotionalUsd,
  });
  await store.append("cycle.started", { cycleId, intents: intents.length, ...cycleBody }, evaluatedAt);

  const decisions = [];
  const fills = [];
  let workingState = structuredClone(state);

  for (const intent of intents) {
    const orderResult = await executePaperOrder({
      policy,
      state: workingState,
      intent,
      store,
      at: evaluatedAt,
      cycleId,
    });
    decisions.push(orderResult.receipt);
    workingState = orderResult.finalState;
    if (orderResult.fill) fills.push(orderResult.fill);
  }

  const result = {
    schemaVersion: "scaur.paper-cycle.v1",
    cycleId,
    evaluatedAt,
    plannedOrders: intents.length,
    allowedOrders: decisions.filter((receipt) => receipt.decision === "ALLOW").length,
    deniedOrders: decisions.filter((receipt) => receipt.decision === "DENY").length,
    fills,
    finalStateHash: hashWithDomain("scaur.state.v1", workingState),
    finalState: workingState,
  };
  await store.append("cycle.completed", {
    cycleId,
    plannedOrders: result.plannedOrders,
    allowedOrders: result.allowedOrders,
    deniedOrders: result.deniedOrders,
    fills: fills.length,
    finalStateHash: result.finalStateHash,
  }, evaluatedAt);
  return result;
}
