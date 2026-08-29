import { readFile, writeFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import process from "node:process";

const FIELD_DEFINITIONS = [
  {
    key: "maxOrderNotionalUsd",
    flag: "max-order-notional",
    label: "Maximum USD per order",
    kind: "positive",
  },
  {
    key: "maxSessionNotionalUsd",
    flag: "max-session-notional",
    label: "Maximum USD per live session",
    kind: "positive",
  },
  {
    key: "maxOrders",
    flag: "max-orders",
    label: "Maximum orders per live session",
    kind: "positiveInteger",
  },
  {
    key: "maxLimitPriceDeviationPct",
    flag: "max-limit-price-deviation-pct",
    label: "Maximum limit-price deviation (%)",
    kind: "nonNegative",
  },
  {
    key: "maxPositionPct",
    flag: "max-position-pct",
    label: "Maximum position weight (%)",
    kind: "percentage",
  },
  {
    key: "maxGrossExposurePct",
    flag: "max-gross-exposure-pct",
    label: "Maximum gross exposure (%)",
    kind: "percentage",
  },
  {
    key: "minCashPct",
    flag: "min-cash-pct",
    label: "Minimum cash reserve (%)",
    kind: "percentageIncludingZero",
  },
  {
    key: "maxValuationAgeSeconds",
    flag: "max-quote-age-seconds",
    label: "Maximum quote age (seconds)",
    kind: "nonNegativeInteger",
  },
  {
    key: "minAvailableLiquidityUsd",
    flag: "min-available-liquidity",
    label: "Minimum available liquidity (USD)",
    kind: "nonNegative",
  },
  {
    key: "permitTtlSeconds",
    flag: "permit-ttl-seconds",
    label: "Execution permit lifetime (seconds)",
    kind: "positiveInteger",
  },
];

function finiteNumber(value, label) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new TypeError(`${label} must be a finite number`);
  return parsed;
}

function parseValue(value, definition) {
  const parsed = finiteNumber(value, definition.label);
  if (definition.kind === "positive" && parsed <= 0) {
    throw new TypeError(`${definition.label} must be greater than zero`);
  }
  if (definition.kind === "positiveInteger" && (!Number.isSafeInteger(parsed) || parsed <= 0)) {
    throw new TypeError(`${definition.label} must be a positive integer`);
  }
  if (definition.kind === "nonNegative" && parsed < 0) {
    throw new TypeError(`${definition.label} cannot be negative`);
  }
  if (definition.kind === "nonNegativeInteger" && (!Number.isSafeInteger(parsed) || parsed < 0)) {
    throw new TypeError(`${definition.label} must be a non-negative integer`);
  }
  if (definition.kind === "percentage" && (parsed <= 0 || parsed > 100)) {
    throw new TypeError(`${definition.label} must be above zero and at most 100`);
  }
  if (definition.kind === "percentageIncludingZero" && (parsed < 0 || parsed > 100)) {
    throw new TypeError(`${definition.label} must be between zero and 100`);
  }
  return parsed;
}

function policyPathFromConfig(config, configPath) {
  if (typeof config.policy !== "string" || config.policy.trim() === "") {
    throw new Error("Scaur live config is missing its policy path");
  }
  return isAbsolute(config.policy)
    ? config.policy
    : resolve(process.cwd(), config.policy || resolve(configPath, "..", "live-policy.json"));
}

function currentValues(policy, config) {
  const policyOrderCap = Number(policy.maxOrderNotionalUsd);
  const liveOrderCap = Number(config["live-max-order-notional"]);
  return {
    maxOrderNotionalUsd: Number.isFinite(policyOrderCap) && Number.isFinite(liveOrderCap)
      ? Math.min(policyOrderCap, liveOrderCap)
      : policy.maxOrderNotionalUsd ?? config["live-max-order-notional"],
    maxSessionNotionalUsd: config["live-max-session-notional"],
    maxOrders: config["live-max-orders"],
    maxLimitPriceDeviationPct: policy.maxLimitPriceDeviationPct,
    maxPositionPct: policy.maxPositionPct,
    maxGrossExposurePct: policy.maxGrossExposurePct,
    minCashPct: policy.minCashPct,
    maxValuationAgeSeconds: policy.maxValuationAgeSeconds?.equity,
    minAvailableLiquidityUsd: policy.minAvailableLiquidityUsd?.equity,
    permitTtlSeconds: policy.permitTtlSeconds,
  };
}

function normalizeChanges(values, changes = {}) {
  const next = { ...values };
  for (const definition of FIELD_DEFINITIONS) {
    const supplied = changes[definition.key];
    const value = supplied === undefined || supplied === "" ? values[definition.key] : supplied;
    next[definition.key] = parseValue(value, definition);
  }
  if (next.maxSessionNotionalUsd < next.maxOrderNotionalUsd) {
    throw new TypeError("Maximum session USD cannot be below the maximum USD per order");
  }
  return next;
}

async function writePrivateJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
}

export function mandateChangesFromOptions(options = {}) {
  return Object.fromEntries(FIELD_DEFINITIONS
    .filter((definition) => options[definition.flag] !== undefined)
    .map((definition) => [definition.key, options[definition.flag]]));
}

export async function updateMandateFiles({
  configPath = ".scaur/live-config.json",
  changes = {},
} = {}) {
  const resolvedConfigPath = resolve(configPath);
  const config = JSON.parse(await readFile(resolvedConfigPath, "utf8"));
  if (config?.schemaVersion !== "scaur.live-config.v1") {
    throw new Error("Unsupported Scaur live config schema");
  }
  if (config["live-routing"] !== "LIVE_ROBINHOOD_MCP") {
    throw new Error("Mandate editing requires a Robinhood live configuration");
  }
  const policyPath = policyPathFromConfig(config, resolvedConfigPath);
  const policy = JSON.parse(await readFile(policyPath, "utf8"));
  if (policy?.schemaVersion !== "scaur.policy.v1") {
    throw new Error("Unsupported Scaur policy schema");
  }

  const values = normalizeChanges(currentValues(policy, config), changes);
  const nextPolicy = {
    ...policy,
    maxOrderNotionalUsd: values.maxOrderNotionalUsd,
    maxLimitPriceDeviationPct: values.maxLimitPriceDeviationPct,
    maxPositionPct: values.maxPositionPct,
    maxGrossExposurePct: values.maxGrossExposurePct,
    minCashPct: values.minCashPct,
    maxValuationAgeSeconds: {
      ...(policy.maxValuationAgeSeconds || {}),
      equity: values.maxValuationAgeSeconds,
    },
    minAvailableLiquidityUsd: {
      ...(policy.minAvailableLiquidityUsd || {}),
      equity: values.minAvailableLiquidityUsd,
    },
    permitTtlSeconds: values.permitTtlSeconds,
  };
  const nextConfig = {
    ...config,
    "live-max-order-notional": values.maxOrderNotionalUsd,
    "live-max-session-notional": values.maxSessionNotionalUsd,
    "live-max-orders": values.maxOrders,
  };

  await Promise.all([
    writePrivateJson(policyPath, nextPolicy),
    writePrivateJson(resolvedConfigPath, nextConfig),
  ]);
  return {
    schemaVersion: "scaur.mandate-update.v1",
    updated: true,
    policy: policyPath,
    config: resolvedConfigPath,
    values,
    next: "Restart npm run mcp:live to apply this configuration.",
  };
}

export async function promptMandateChanges({
  configPath = ".scaur/live-config.json",
  input = process.stdin,
  output = process.stdout,
  question,
} = {}) {
  const resolvedConfigPath = resolve(configPath);
  const config = JSON.parse(await readFile(resolvedConfigPath, "utf8"));
  const policyPath = policyPathFromConfig(config, resolvedConfigPath);
  const policy = JSON.parse(await readFile(policyPath, "utf8"));
  const values = currentValues(policy, config);
  const changes = {};
  const terminal = question ? null : createInterface({ input, output });
  const ask = question || ((prompt) => terminal.question(prompt));
  output.write("\nScaur configuration\nPress Enter to keep the current value.\n\n");
  try {
    for (const definition of FIELD_DEFINITIONS) {
      const answer = await ask(
        `${definition.label} [${values[definition.key]}]: `,
      );
      if (answer.trim() !== "") changes[definition.key] = answer.trim();
    }
  } finally {
    terminal?.close();
  }
  return updateMandateFiles({ configPath: resolvedConfigPath, changes });
}
