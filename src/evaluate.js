import { hashWithDomain } from "./canonical.js";
import { normalizeIntent } from "./intent.js";
import { evaluatePolicy } from "./policy.js";
import { createPermit } from "./permit.js";

export function evaluate({ policy, state, intent, at = new Date().toISOString() }) {
  const evaluatedAtMs = Date.parse(at);
  if (!Number.isFinite(evaluatedAtMs)) throw new TypeError("at must be a valid ISO timestamp");
  const evaluatedAt = new Date(evaluatedAtMs).toISOString();

  let normalizedIntent;
  let checks;
  try {
    normalizedIntent = normalizeIntent(intent);
    checks = [{
      id: "intent.valid",
      pass: true,
      observed: true,
      limit: true,
      reason: "Intent has the required bounded fields.",
    }];
    checks.push(...evaluatePolicy({ policy, state, intent: normalizedIntent, evaluatedAt }));
  } catch (error) {
    normalizedIntent = intent;
    checks = [{
      id: "intent.valid",
      pass: false,
      observed: false,
      limit: true,
      reason: error.message,
    }];
  }

  const allowed = checks.length > 1 && checks.every((check) => check.pass);
  const body = {
    schemaVersion: "scaur.decision.v1",
    evaluatedAt,
    policy: {
      id: policy?.id || null,
      version: policy?.version || null,
      hash: hashWithDomain("scaur.policy.v1", policy),
    },
    stateHash: hashWithDomain("scaur.state.v1", state),
    intentHash: hashWithDomain("scaur.intent.v1", normalizedIntent),
    decision: allowed ? "ALLOW" : "DENY",
    checks,
  };
  const decisionId = hashWithDomain("scaur.decision.v1", body);
  const receipt = { ...body, decisionId, permit: null };

  if (allowed) {
    receipt.permit = createPermit({
      intent: normalizedIntent,
      decisionId,
      policyHash: body.policy.hash,
      evaluatedAt,
      ttlSeconds: policy.permitTtlSeconds,
    });
  }

  return receipt;
}
