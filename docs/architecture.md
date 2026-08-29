# Architecture

Scaur separates portfolio intelligence from capital authority. The codebase
contains small components with explicit inputs and outputs.

## 1. Rebalance planner

`buildRebalanceIntents` converts target weights and the current portfolio into
minimal order intents. It validates target weights, uses prices supplied in the
state snapshot, ignores trades below the configured notional floor, and orders
sells before buys.

The planner has no execution authority. Its output is untrusted input to the
kernel.

## 2. Policy kernel

`evaluate` receives:

- one versioned policy document;
- one portfolio and asset-state snapshot;
- one normalized order intent;
- one explicit evaluation timestamp.

It performs no network calls. Every rule returns a stable identifier, observed
value, configured limit, pass/fail result, and reason. Missing facts fail
closed.

## 3. Decision receipt

The kernel emits a `scaur.decision.v1` receipt containing the complete check
vector and domain-separated hashes of the policy, state, and intent. A denied
receipt never contains a permit.

## 4. Permit boundary

Allowed decisions receive a `scaur.permit.v1` capability. The permit is bound
to the normalized intent hash, account, venue, policy, decision, issue time,
and expiry. Changing any execution field invalidates it.

## 5. Durable event store

`JsonlEventStore` serializes writes with an exclusive filesystem lock and
appends canonical JSON events. Each event includes its sequence, the previous
event hash, and its own domain-separated hash.

`DurablePermitLedger` checks the event history and appends `permit.consumed`
inside the same lock. A replay, expired permit, mismatched order, or busy ledger
fails closed.

This locking model is single-host only. Production needs an ACID datastore with
cross-host serialization.

## 6. Paper relay

`runPaperCycle` evaluates each planned order against the latest paper state,
records the decision, consumes its permit, creates a paper fill, and updates
cash and positions. A cycle produces a final state hash and a complete event
timeline.

The paper relay deliberately has no network adapter or credential.

## 7. Robinhood MCP transport

`connectRobinhood` uses the official MCP TypeScript client over Streamable HTTP.
Robinhood OAuth performs dynamic client registration, PKCE authorization, token
refresh, and connection to the dedicated Trading MCP endpoint. The local OAuth
provider stores client registration and token material in an operator-selected,
gitignored file. Portfolio-research code never receives this provider directly.

`RobinhoodMcpAdapter` discovers the remote tool list at runtime. The live relay
requires `review_equity_order` and `place_equity_order`; the read-only research
path requires quote, fundamentals, technical-indicator, and earnings tools.
Missing tools fail before Scaur presents a result as complete.

`researchEquity` normalizes those public-market responses into one timestamped
evidence object and adds a domain-separated evidence hash. It receives an
authenticated MCP client but never receives the OAuth provider, Agentic account
number, or an order route.

## 8. Guarded live relay

`executeRobinhoodOrder` handles one quantity-based equity limit order. It
requires a literal operator arming phrase, a clean event chain, the fixed
logical account `robinhood-agentic`, and venue `robinhood-mcp`. It rejects
market orders, notional shortcuts, unknown remote fields, and any mismatch
between the normalized intent and the remote symbol, side, quantity, or limit.

The remote order arguments are part of the normalized intent hash, so changing
time-in-force or any other permitted remote field also invalidates the permit.
The same argument object is sent to Robinhood review and placement.

## 9. Agent-facing live boundary

`createScaurMcpServer` exposes `scaur_research_equity` and
`scaur_compare_equities` in authenticated read-only research mode and in live
mode. Research mode does not register any
order tool. The relay appears as `scaur_live_order` only when the operator
starts a separate live process with the exact `LIVE_ROBINHOOD_MCP` activation
value, an existing OAuth store, and explicit ceilings for per-order notional,
session notional, and order count.

The research schema includes only a symbol. The order schema includes only the
symbol, side, quantity, limit price, time-in-force, and optional intent ID.
Account, venue, order type, policy, state, ledger, OAuth material, clock,
Agentic account number, and ceilings remain server-owned. Live mode does
not register paper mutation tools. Robinhood connection is lazy: a policy or
session denial happens before OAuth material is loaded or a network connection
is opened.

Robinhood's required Agentic account number is bound into the exact remote
argument hash. Known account fields and occurrences of the configured number
are redacted before remote review and placement results are stored or returned
to the calling agent.

`LiveSessionBudget` enforces the operator ceilings in memory. A separate
ledger-derived gate rejects any state hash associated with a consumed live
permit. Session ceilings reset on process restart; the consumed-state gate
survives because it is reconstructed from the verified event chain.

## Failure ordering

The system records permit consumption before producing a fill. If the process
crashes between those steps, the permit remains spent. Recovery must reconcile
the event log before issuing a replacement. This favors duplicate-execution
prevention over automatic retry.

The live relay follows the same ordering. It records the Robinhood review,
consumes the permit, and only then invokes placement. A failed or ambiguous
placement leaves the permit spent and records `order.failed`; recovery must
inspect Robinhood order history and supply a fresh state snapshot before issuing
a new intent.
