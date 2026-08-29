import { canonicalize, hashWithDomain } from "./canonical.js";
import { evaluate } from "./evaluate.js";
import { normalizeIntent } from "./intent.js";
import { DurablePermitLedger } from "./permit.js";
import { RobinhoodMcpAdapter } from "./robinhood.js";

export const LIVE_CONFIRMATION = "LIVE_ROBINHOOD_ORDER";
export const ROBINHOOD_AGENTIC_ACCOUNT = "robinhood-agentic";

function normalizedOrderArguments(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("venueOrder.arguments must be an object");
  }
  const allowed = new Set([
    "account_number",
    "side",
    "symbol",
    "quantity",
    "type",
    "limit_price",
    "time_in_force",
    "market_hours",
  ]);
  const unexpected = Object.keys(value).filter((key) => !allowed.has(key));
  if (unexpected.length > 0) {
    throw new TypeError(`Unsupported Robinhood order arguments: ${unexpected.join(", ")}`);
  }
  return JSON.parse(canonicalize(value));
}

function redactBrokerageValue(value, accountNumber) {
  if (Array.isArray(value)) {
    return value.map((item) => redactBrokerageValue(item, accountNumber));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => {
      if (["account_number", "accountNumber", "account_id", "accountId"].includes(key)) {
        return [key, "[REDACTED]"];
      }
      return [key, redactBrokerageValue(item, accountNumber)];
    }));
  }
  if (typeof value === "string" && accountNumber) {
    return value.split(accountNumber).join("[REDACTED]");
  }
  return value;
}

function sanitizedError(error, accountNumber) {
  const message = redactBrokerageValue(String(error?.message || error), accountNumber);
  const sanitized = new Error(message);
  sanitized.name = error?.name || "Error";
  return sanitized;
}

export function validateRobinhoodIntent(input, { accountNumber } = {}) {
  const intent = normalizeIntent(input);
  if (intent.venue !== "robinhood-mcp") {
    throw new TypeError("Live Robinhood orders require venue robinhood-mcp");
  }
  if (intent.accountId !== ROBINHOOD_AGENTIC_ACCOUNT) {
    throw new TypeError(`Live Robinhood orders require accountId ${ROBINHOOD_AGENTIC_ACCOUNT}`);
  }
  if (intent.venueOrder?.tool !== "place_equity_order") {
    throw new TypeError("venueOrder.tool must be place_equity_order");
  }

  const args = normalizedOrderArguments(intent.venueOrder.arguments);
  if (typeof args.account_number !== "string" || args.account_number.trim() === "") {
    throw new TypeError("Robinhood account_number must be supplied by the operator");
  }
  if (accountNumber && args.account_number !== accountNumber) {
    throw new TypeError("Robinhood account_number does not match the operator configuration");
  }
  const side = String(args.side || "").toUpperCase();
  const symbol = String(args.symbol || "").toUpperCase();
  const orderType = String(args.type || "").toLowerCase();
  if (side !== intent.side) throw new TypeError("Robinhood side does not match the intent");
  if (symbol !== intent.assetId.toUpperCase()) {
    throw new TypeError("Robinhood symbol does not match the intent asset");
  }
  if (typeof args.quantity !== "string" || Number(args.quantity) !== intent.quantity) {
    throw new TypeError("Robinhood quantity does not match the intent");
  }
  if (orderType !== "limit") {
    throw new TypeError("Scaur live v0.6 permits limit orders only");
  }
  if (typeof args.limit_price !== "string" || Number(args.limit_price) !== intent.limitPriceUsd) {
    throw new TypeError("Robinhood limit price does not match the intent");
  }
  if (args.time_in_force !== "gfd") {
    throw new TypeError("Scaur live v0.6 requires time_in_force gfd");
  }
  if (args.market_hours !== "regular_hours") {
    throw new TypeError("Scaur live v0.6 requires regular market hours");
  }
  return { intent, args };
}

export async function executeRobinhoodOrder({
  policy,
  state,
  intent: inputIntent,
  store,
  client,
  clientFactory,
  accountNumber,
  confirmation,
  at = new Date().toISOString(),
}) {
  if (confirmation !== LIVE_CONFIRMATION) {
    throw new Error(`Live execution requires --confirm ${LIVE_CONFIRMATION}`);
  }
  if (!store || typeof store.append !== "function" || typeof store.verifyChain !== "function") {
    throw new TypeError("A verifiable durable event store is required for live orders");
  }

  const chain = await store.verifyChain();
  if (!chain.valid) throw new Error(`Event ledger failed verification: ${chain.reason}`);

  if (typeof accountNumber !== "string" || accountNumber.trim() === "") {
    throw new TypeError("An operator-supplied Robinhood account number is required");
  }
  const { intent, args } = validateRobinhoodIntent(inputIntent, { accountNumber });
  const evaluatedAt = new Date(at).toISOString();
  const receipt = evaluate({ policy, state, intent, at: evaluatedAt });
  await store.append("decision.recorded", { receipt, executionMode: "live" }, evaluatedAt);
  if (receipt.decision !== "ALLOW") {
    return {
      schemaVersion: "scaur.live-order.v1",
      status: "DENIED",
      receipt,
      review: null,
      submission: null,
    };
  }

  const resolvedClient = client || await clientFactory?.();
  const adapter = new RobinhoodMcpAdapter(resolvedClient);
  const argumentsHash = hashWithDomain("scaur.robinhood-order-arguments.v1", args);
  let rawReview;
  try {
    rawReview = await adapter.reviewEquityOrder(args);
  } catch (error) {
    throw sanitizedError(error, accountNumber);
  }
  const review = redactBrokerageValue(rawReview, accountNumber);
  const reviewHash = hashWithDomain("scaur.robinhood-review.v1", rawReview);
  await store.append("venue.reviewed", {
    permitId: receipt.permit.permitId,
    venue: intent.venue,
    tool: "review_equity_order",
    argumentsHash,
    reviewHash,
    review,
  }, evaluatedAt);

  const consumption = await new DurablePermitLedger(store).consume(
    receipt.permit,
    intent,
    evaluatedAt,
  );
  if (!consumption.valid) {
    throw new Error(`Permit consumption failed closed: ${consumption.reason}`);
  }

  let placement;
  try {
    placement = await adapter.placeEquityOrder(args);
  } catch (error) {
    const safeError = sanitizedError(error, accountNumber);
    await store.append("order.failed", {
      permitId: receipt.permit.permitId,
      venue: intent.venue,
      tool: "place_equity_order",
      argumentsHash,
      error: { name: safeError.name, message: safeError.message },
    }, evaluatedAt);
    throw safeError;
  }

  const rawPlacement = placement;
  placement = redactBrokerageValue(rawPlacement, accountNumber);
  const placementHash = hashWithDomain("scaur.robinhood-placement.v1", rawPlacement);
  const submissionBody = {
    schemaVersion: "scaur.live-submission.v1",
    permitId: receipt.permit.permitId,
    intentHash: receipt.intentHash,
    venue: intent.venue,
    tool: "place_equity_order",
    argumentsHash,
    reviewHash,
    placementHash,
    submittedAt: evaluatedAt,
  };
  const submission = {
    ...submissionBody,
    submissionId: hashWithDomain("scaur.live-submission.v1", submissionBody),
    placement,
  };
  await store.append("order.submitted", submission, evaluatedAt);

  return {
    schemaVersion: "scaur.live-order.v1",
    status: "SUBMITTED",
    receipt,
    review,
    submission,
  };
}
