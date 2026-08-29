import { createHash } from "node:crypto";

function normalize(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Non-finite numbers are not valid inputs");
    return value;
  }

  if (Array.isArray(value)) return value.map(normalize);

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .filter((key) => value[key] !== undefined)
        .map((key) => [key, normalize(value[key])]),
    );
  }

  throw new TypeError(`Unsupported input type: ${typeof value}`);
}

export function canonicalize(value) {
  return JSON.stringify(normalize(value));
}

export function hash(value) {
  return createHash("sha256").update(canonicalize(value)).digest("hex");
}

export function hashWithDomain(domain, value) {
  if (typeof domain !== "string" || domain.trim() === "") {
    throw new TypeError("Hash domain must be a non-empty string");
  }
  return createHash("sha256")
    .update(domain)
    .update("\0")
    .update(canonicalize(value))
    .digest("hex");
}
