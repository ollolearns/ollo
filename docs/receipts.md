# Receipts, permits, and events

Scaur produces three distinct proof objects. They are not interchangeable.

## Decision receipt

A `scaur.decision.v1` receipt records:

- evaluation time;
- policy identifier, version, and hash;
- state and intent hashes;
- every policy check and its reason;
- the final `ALLOW` or `DENY` result;
- the decision identifier;
- a permit only when every check passes.

The decision identifier is a domain-separated SHA-256 hash of the receipt body
before the identifier and permit are attached.

## Execution permit

A `scaur.permit.v1` object binds authority to:

- the exact normalized intent hash;
- account and venue;
- policy and decision;
- issue and expiry times.

Permits are currently content-addressed but unsigned. The reference relay
therefore treats them as local protocol objects, not portable credentials.

## Event chain

A `scaur.event.v1` record contains its sequence, event type, timestamp,
payload, previous event hash, and event hash. `verifyChain` detects edits,
deletions that break sequence continuity, and reordered events.

The JSONL log demonstrates evidence structure; it does not prevent a malicious
host from rolling the entire file back. Production requires externally
anchored checkpoints or a datastore with independent retention.

## Hash domains

Policies, states, intents, decisions, permits, events, rebalance intents, paper
cycles, paper states, and fills each use a distinct protocol domain. This
prevents a hash calculated for one object class from being interpreted as a
different proof type.
