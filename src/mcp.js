import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { hashWithDomain } from "./canonical.js";
import { evaluate } from "./evaluate.js";
import {
  LIVE_CONFIRMATION,
  ROBINHOOD_AGENTIC_ACCOUNT,
  executeRobinhoodOrder,
} from "./live.js";
import { LiveSessionBudget, consumedLiveStateHashes } from "./live-session.js";
import { executePaperOrder, runPaperCycle } from "./paper.js";
import { compareEquities, researchEquity } from "./research.js";
import { closeRobinhood, connectRobinhood } from "./robinhood.js";
import { JsonFileStateStore, readJsonFile } from "./state-store.js";
import { JsonlEventStore } from "./store.js";

const VERSION = "0.7.0";
export const LIVE_MCP_ACTIVATION = "LIVE_ROBINHOOD_MCP";

function nonEmpty(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${label} must be a non-empty string`);
  }
  return value;
}

function positiveNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new TypeError(`${label} must be a positive number`);
  }
  return number;
}

function positiveInteger(value, label) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) {
    throw new TypeError(`${label} must be a positive integer`);
  }
  return number;
}

function response(value) {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
    structuredContent: value,
  };
}

function createSerializer() {
  let tail = Promise.resolve();
  return (operation) => {
    const result = tail.then(operation, operation);
    tail = result.catch(() => undefined);
    return result;
  };
}

function orderIntent(args, accountId) {
  return {
    id: args.intentId?.trim() || `mcp-${randomUUID()}`,
    accountId,
    assetId: args.assetId.trim(),
    side: args.side,
    quantity: args.quantity,
    limitPriceUsd: args.limitPriceUsd,
    venue: "paper",
  };
}

function remoteDecimal(value, label, decimals = 6) {
  const text = value.toFixed(decimals).replace(/\.?0+$/u, "");
  if (Number(text) !== value) {
    throw new TypeError(`${label} supports at most ${decimals} decimal places`);
  }
  return text;
}

function liveOrderIntent(args, accountNumber) {
  return {
    id: args.intentId?.trim() || `mcp-live-${randomUUID()}`,
    accountId: ROBINHOOD_AGENTIC_ACCOUNT,
    assetId: args.assetId.trim().toUpperCase(),
    side: args.side,
    quantity: args.quantity,
    limitPriceUsd: args.limitPriceUsd,
    venue: "robinhood-mcp",
    venueOrder: {
      tool: "place_equity_order",
      arguments: {
        account_number: accountNumber,
        side: args.side.toLowerCase(),
        symbol: args.assetId.trim().toUpperCase(),
        type: "limit",
        quantity: remoteDecimal(args.quantity, "quantity"),
        limit_price: remoteDecimal(args.limitPriceUsd, "limitPriceUsd"),
        time_in_force: args.timeInForce,
        market_hours: "regular_hours",
      },
    },
  };
}

function normalizeLiveConfig(value, accountId) {
  if (!value?.enabled) return { enabled: false };
  if (accountId !== ROBINHOOD_AGENTIC_ACCOUNT) {
    throw new TypeError(
      `Live MCP routing requires accountId ${ROBINHOOD_AGENTIC_ACCOUNT}`,
    );
  }
  const shared = {
    enabled: true,
    researchOnly: value.researchOnly === true,
    oauthStorePath: nonEmpty(value.oauthStorePath, "live.oauthStorePath"),
    callbackPort: value.callbackPort,
    connectRobinhood: value.connectRobinhood || connectRobinhood,
    closeRobinhood: value.closeRobinhood || closeRobinhood,
  };
  if (shared.researchOnly) return shared;
  const maxOrderNotionalUsd = positiveNumber(
    value.maxOrderNotionalUsd,
    "live.maxOrderNotionalUsd",
  );
  const maxSessionNotionalUsd = positiveNumber(
    value.maxSessionNotionalUsd,
    "live.maxSessionNotionalUsd",
  );
  if (maxSessionNotionalUsd < maxOrderNotionalUsd) {
    throw new TypeError("live.maxSessionNotionalUsd cannot be below the per-order ceiling");
  }
  return {
    ...shared,
    accountNumber: nonEmpty(value.accountNumber, "live.accountNumber"),
    maxOrderNotionalUsd,
    maxSessionNotionalUsd,
    maxOrders: positiveInteger(value.maxOrders, "live.maxOrders"),
  };
}

function assetSummary(state) {
  return Object.entries(state.assets || {})
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([assetId, asset]) => ({
      assetId,
      assetClass: asset.assetClass || null,
      eligible: asset.eligible === true,
      priceUsd: asset.priceUsd ?? null,
      valuedAt: asset.valuedAt || null,
      availableLiquidityUsd: asset.availableLiquidityUsd ?? null,
      venues: Array.isArray(asset.venues)
        ? asset.venues
        : (asset.venue ? [asset.venue] : []),
    }));
}

export function createScaurMcpServer({
  policyPath,
  statePath,
  ledgerPath,
  accountId,
  minTradeNotionalUsd = 100,
  now = () => new Date().toISOString(),
  live,
}) {
  nonEmpty(policyPath, "policyPath");
  nonEmpty(statePath, "statePath");
  nonEmpty(ledgerPath, "ledgerPath");
  nonEmpty(accountId, "accountId");
  const minimumTrade = positiveNumber(minTradeNotionalUsd, "minTradeNotionalUsd");
  const stateStore = new JsonFileStateStore(statePath);
  const eventStore = new JsonlEventStore(ledgerPath);
  const serialize = createSerializer();
  const liveConfig = normalizeLiveConfig(live, accountId);
  const liveOrdersEnabled = liveConfig.enabled && !liveConfig.researchOnly;
  const serverMode = liveOrdersEnabled ? "live" : (liveConfig.enabled ? "research" : "paper");
  const liveBudget = liveOrdersEnabled ? new LiveSessionBudget(liveConfig) : null;

  async function inputs() {
    const [policy, state] = await Promise.all([
      readJsonFile(policyPath, "Policy file"),
      stateStore.read(),
    ]);
    if (state.accountId !== accountId) {
      throw new Error(
        `Configured account ${accountId} does not match state account ${state.accountId || "<missing>"}`,
      );
    }
    return { policy, state };
  }

  const server = new McpServer(
    { name: "scaur", version: VERSION },
    {
      instructions: (serverMode === "live" ? [
        "Scaur is an operator-armed live portfolio policy boundary that can move real money.",
        "Use scaur_status before proposing an order.",
        "scaur_research_equity reads public Robinhood market data and never places an order.",
        "scaur_compare_equities compares 2 to 5 public equities without reading the account.",
        "scaur_live_order can move real money in the configured Robinhood Agentic account.",
        "Paper mutation tools are disabled while live routing is armed.",
        "Brokerage credentials remain operator-owned and are never returned to the caller.",
      ] : serverMode === "research" ? [
        "Scaur is connected to Robinhood in read-only equity research mode.",
        "scaur_research_equity reads public market data and never places an order.",
        "scaur_compare_equities compares 2 to 5 public equities without reading the account.",
        "No paper or live order tool is registered in this mode.",
        "Brokerage credentials remain operator-owned and are never returned to the caller.",
      ] : [
        "Scaur is a paper-mode portfolio policy and execution boundary.",
        "Use scaur_status before proposing an order.",
        "scaur_check_order records a decision but never fills an order.",
        "scaur_paper_order and scaur_rebalance update only the configured local paper state.",
        "This server exposes no live Robinhood routing tool and no brokerage credentials.",
      ]).join(" "),
    },
  );

  server.registerTool("scaur_status", {
    title: "Scaur status",
    description: "Read the configured portfolio, eligible asset facts, policy identity, ledger health, and live capacity when armed.",
    inputSchema: {},
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  }, async () => serialize(async () => {
    const { policy, state } = await inputs();
    const chain = await eventStore.verifyChain();
    const stateHash = hashWithDomain("scaur.state.v1", state);
    const liveStateReady = liveOrdersEnabled
      ? !consumedLiveStateHashes(await eventStore.readAll()).has(stateHash)
      : null;
    return response({
      schemaVersion: "scaur.mcp-status.v1",
      mode: serverMode,
      accountId,
      policy: {
        id: policy.id || null,
        version: policy.version || null,
        hash: hashWithDomain("scaur.policy.v1", policy),
      },
      state: {
        snapshotId: state.snapshotId || null,
        hash: stateHash,
        capturedAt: state.capturedAt || null,
        portfolioValueUsd: state.portfolioValueUsd ?? null,
        cashUsd: state.cashUsd ?? null,
        positions: state.positions || [],
        assets: assetSummary(state),
      },
      ledger: chain,
      capabilities: {
        policyChecks: true,
        paperOrders: serverMode === "paper",
        paperRebalances: serverMode === "paper",
        equityResearch: liveConfig.enabled,
        equityComparison: liveConfig.enabled,
        liveOrders: liveOrdersEnabled,
      },
      live: liveOrdersEnabled ? {
        armed: true,
        accountId: ROBINHOOD_AGENTIC_ACCOUNT,
        orderType: "limit",
        assetClass: "equity",
        requiresFreshStateAfterEachConsumedPermit: true,
        stateReadyForLive: liveStateReady,
        session: liveBudget.snapshot(),
      } : {
        armed: false,
        researchOnly: serverMode === "research",
      },
    });
  }));

  if (!liveConfig.enabled) {
    const orderSchema = {
      assetId: z.string().trim().min(1).max(128).describe("Asset identifier from scaur_status."),
      side: z.enum(["BUY", "SELL"]),
      quantity: z.number().finite().positive(),
      limitPriceUsd: z.number().finite().positive(),
      intentId: z.string().trim().min(1).max(160).optional()
        .describe("Optional caller correlation ID. Scaur generates one when omitted."),
    };

    server.registerTool("scaur_check_order", {
      title: "Check a paper order",
      description: "Evaluate an exact order against the configured policy and current paper state. Records an audit receipt but never fills the order.",
      inputSchema: orderSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    }, async (args) => serialize(async () => {
      const { policy, state } = await inputs();
      const evaluatedAt = now();
      const intent = orderIntent(args, accountId);
      const receipt = evaluate({ policy, state, intent, at: evaluatedAt });
      await eventStore.append("decision.recorded", {
        source: "mcp",
        execution: "NOT_EXECUTED",
        receipt,
      }, evaluatedAt);
      return response({
        schemaVersion: "scaur.mcp-check.v1",
        status: receipt.decision === "ALLOW" ? "ALLOWED" : "DENIED",
        execution: "NOT_EXECUTED",
        receipt,
      });
    }));

    server.registerTool("scaur_paper_order", {
      title: "Execute a paper order",
      description: "Evaluate one exact order, consume its single-use permit when allowed, record a paper fill, and persist the resulting local paper state.",
      inputSchema: orderSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    }, async (args) => serialize(async () => {
      const { policy, state } = await inputs();
      const result = await executePaperOrder({
        policy,
        state,
        intent: orderIntent(args, accountId),
        store: eventStore,
        at: now(),
      });
      if (result.status === "FILLED") await stateStore.write(result.finalState);
      return response(result);
    }));

    server.registerTool("scaur_rebalance", {
      title: "Run a paper rebalance",
      description: "Turn target portfolio weights into minimal paper orders, policy-check every order, fill only allowed orders, and persist the resulting paper state.",
      inputSchema: {
        targets: z.record(
          z.string().trim().min(1).max(128),
          z.number().finite().min(0).max(1),
        ).describe("Asset IDs mapped to target portfolio weights from 0 to 1."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    }, async ({ targets }) => serialize(async () => {
      const { policy, state } = await inputs();
      const result = await runPaperCycle({
        policy,
        state,
        targets,
        accountId,
        store: eventStore,
        at: now(),
        minTradeNotionalUsd: minimumTrade,
      });
      if (result.fills.length > 0) await stateStore.write(result.finalState);
      return response(result);
    }));
  }

  server.registerTool("scaur_recent_events", {
    title: "Read Scaur audit events",
    description: "Read the newest records from the configured hash-chained Scaur audit ledger.",
    inputSchema: {
      limit: z.number().int().min(1).max(200).default(25),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  }, async ({ limit }) => serialize(async () => {
    const verification = await eventStore.verifyChain();
    if (!verification.valid) {
      throw new Error(`Audit ledger failed verification: ${verification.reason}`);
    }
    const events = await eventStore.readAll();
    return response({
      schemaVersion: "scaur.mcp-events.v1",
      ledger: verification,
      events: events.slice(-limit),
    });
  }));

  if (liveConfig.enabled) {
    server.registerTool("scaur_research_equity", {
      title: "Research a public equity",
      description: "Read Robinhood quotes, fundamentals, RSI, and earnings for one equity. Returns timestamped, hash-addressed evidence and never places an order.",
      inputSchema: {
        symbol: z.string().trim().min(1).max(15)
          .regex(/^[A-Za-z][A-Za-z0-9.-]*$/u)
          .describe("Public equity ticker to research, such as AAPL."),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    }, async ({ symbol }) => serialize(async () => {
      let session;
      try {
        session = await liveConfig.connectRobinhood({
          oauthStorePath: liveConfig.oauthStorePath,
          callbackPort: liveConfig.callbackPort,
          interactive: false,
        });
        return response(await researchEquity({
          client: session.client,
          symbol,
          at: now(),
        }));
      } finally {
        await liveConfig.closeRobinhood(session);
      }
    }));

    server.registerTool("scaur_compare_equities", {
      title: "Compare public equities",
      description: "Research and compare 2 to 5 public equities in one call. Returns complete per-symbol evidence, a compact comparison, and a combined evidence hash. Never reads the account or places an order.",
      inputSchema: {
        symbols: z.array(
          z.string().trim().min(1).max(15)
            .regex(/^[A-Za-z][A-Za-z0-9.-]*$/u),
        ).min(2).max(5)
          .describe("Two to five public equity tickers to compare, such as AAPL, MSFT, and GOOGL."),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    }, async ({ symbols }) => serialize(async () => {
      let session;
      try {
        session = await liveConfig.connectRobinhood({
          oauthStorePath: liveConfig.oauthStorePath,
          callbackPort: liveConfig.callbackPort,
          interactive: false,
        });
        return response(await compareEquities({
          client: session.client,
          symbols,
          at: now(),
        }));
      } finally {
        await liveConfig.closeRobinhood(session);
      }
    }));

  }

  if (liveOrdersEnabled) {
    server.registerTool("scaur_live_order", {
      title: "Submit a live Robinhood equity order",
      description: "DANGER: moves real money. Evaluates one exact equity limit order, calls Robinhood review, consumes the permit, and submits to the configured Agentic account.",
      inputSchema: {
        assetId: z.string().trim().min(1).max(16)
          .regex(/^[A-Za-z][A-Za-z0-9.-]*$/u)
          .describe("Tradable equity ticker present in the operator-supplied state."),
        side: z.enum(["BUY", "SELL"]),
        quantity: z.number().finite().positive(),
        limitPriceUsd: z.number().finite().positive(),
        timeInForce: z.literal("gfd").default("gfd"),
        intentId: z.string().trim().min(1).max(160).optional(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    }, async (args) => serialize(async () => {
      const { policy, state } = await inputs();
      const evaluatedAt = now();
      const intent = liveOrderIntent(args, liveConfig.accountNumber);
      const stateHash = hashWithDomain("scaur.state.v1", state);
      const notionalUsd = intent.quantity * intent.limitPriceUsd;
      const verification = await eventStore.verifyChain();
      if (!verification.valid) {
        throw new Error(`Audit ledger failed verification: ${verification.reason}`);
      }
      const eventsBefore = await eventStore.readAll();
      const limits = liveBudget.evaluate({
        notionalUsd,
        stateHash,
        assetClass: state.assets?.[intent.assetId]?.assetClass,
        consumedStateHashes: consumedLiveStateHashes(eventsBefore),
      });

      if (limits.some((limit) => !limit.pass)) {
        const denial = {
          schemaVersion: "scaur.live-mcp-denial.v1",
          status: "DENIED",
          stage: "SCAUR_LIVE_LIMITS",
          evaluatedAt,
          stateHash,
          intentHash: hashWithDomain("scaur.intent.v1", intent),
          checks: limits,
          session: liveBudget.snapshot(),
        };
        await eventStore.append("live.limit_denied", denial, evaluatedAt);
        return response(denial);
      }

      let session;
      try {
        const result = await executeRobinhoodOrder({
          policy,
          state,
          intent,
          store: eventStore,
          accountNumber: liveConfig.accountNumber,
          clientFactory: async () => {
            session = await liveConfig.connectRobinhood({
              oauthStorePath: liveConfig.oauthStorePath,
              callbackPort: liveConfig.callbackPort,
              interactive: false,
            });
            return session.client;
          },
          confirmation: LIVE_CONFIRMATION,
          at: evaluatedAt,
        });
        if (result.status === "SUBMITTED") {
          liveBudget.reserve(notionalUsd);
        }
        return response({ ...result, liveSession: liveBudget.snapshot() });
      } catch (error) {
        const newEvents = (await eventStore.readAll()).slice(eventsBefore.length);
        if (newEvents.some((event) => event.type === "permit.consumed")) {
          liveBudget.reserve(notionalUsd);
        }
        throw error;
      } finally {
        await liveConfig.closeRobinhood(session);
      }
    }));
  }

  return server;
}
