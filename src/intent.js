import { canonicalize } from "./canonical.js";

const REQUIRED_STRINGS = ["id", "accountId", "assetId", "venue"];

function normalizeVenueOrder(value) {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("venueOrder must be an object when supplied");
  }
  return JSON.parse(canonicalize(value));
}

export function normalizeIntent(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("Intent must be an object");
  }

  for (const field of REQUIRED_STRINGS) {
    if (typeof input[field] !== "string" || input[field].trim() === "") {
      throw new TypeError(`${field} must be a non-empty string`);
    }
  }

  const side = String(input.side || "").toUpperCase();
  if (side !== "BUY" && side !== "SELL") {
    throw new TypeError("side must be BUY or SELL");
  }

  const quantity = Number(input.quantity);
  const limitPriceUsd = Number(input.limitPriceUsd);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new TypeError("quantity must be a positive finite number");
  }
  if (!Number.isFinite(limitPriceUsd) || limitPriceUsd <= 0) {
    throw new TypeError("limitPriceUsd must be a positive finite number");
  }

  const normalized = {
    id: input.id.trim(),
    accountId: input.accountId.trim(),
    assetId: input.assetId.trim(),
    side,
    quantity,
    limitPriceUsd,
    venue: input.venue.trim(),
  };
  const venueOrder = normalizeVenueOrder(input.venueOrder);
  if (venueOrder !== undefined) normalized.venueOrder = venueOrder;
  return Object.freeze(normalized);
}
