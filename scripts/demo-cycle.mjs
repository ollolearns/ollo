import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  JsonlEventStore,
  runPaperCycle,
} from "../src/index.js";

async function fixture(name) {
  const url = new URL(`../examples/${name}.json`, import.meta.url);
  return JSON.parse(await readFile(url, "utf8"));
}

const directory = await mkdtemp(join(tmpdir(), "scaur-demo-"));

try {
  const [policy, state, targetDocument] = await Promise.all([
    fixture("policy"),
    fixture("state"),
    fixture("targets"),
  ]);
  const store = new JsonlEventStore(join(directory, "events.jsonl"));
  const result = await runPaperCycle({
    policy,
    state,
    targets: targetDocument.weights,
    accountId: "paper-fund-01",
    store,
    at: "2026-07-20T12:00:00.000Z",
    minTradeNotionalUsd: targetDocument.minTradeNotionalUsd,
  });
  const chain = await store.verifyChain();

  console.log(JSON.stringify({
    cycleId: result.cycleId,
    plannedOrders: result.plannedOrders,
    allowedOrders: result.allowedOrders,
    deniedOrders: result.deniedOrders,
    fills: result.fills.map(({ fillId, assetId, side, quantity, priceUsd }) => ({
      fillId,
      assetId,
      side,
      quantity,
      priceUsd,
    })),
    finalCashUsd: result.finalState.cashUsd,
    eventChain: chain,
  }, null, 2));
} finally {
  await rm(directory, { recursive: true, force: true });
}
