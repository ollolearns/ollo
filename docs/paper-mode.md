# Paper-mode contract

Paper mode exercises the authorization path without contacting a venue.

## Inputs

- a versioned policy;
- a portfolio and asset-state snapshot;
- target weights;
- an account identifier;
- an explicit evaluation time;
- a durable event-store path.

## Execution semantics

The planner computes target-value deltas using state-snapshot prices. Sells are
evaluated before buys. Each order is evaluated against the latest paper state.
Allowed permits are consumed before a fill is created. Fills occur completely
at the supplied limit price with no fees or partial execution.

Those fill assumptions are intentionally simple and must not be interpreted as
performance, liquidity, or executable market prices.

## Output

A cycle returns planned, allowed, and denied counts; paper fill receipts; a
final state snapshot; and a final state hash. The event log also records cycle
start and completion, every decision, every permit consumption, and every fill.

## Non-goals

Paper mode does not model slippage, queue position, settlement failure,
corporate actions, transfer restrictions, tax, fees, custody, or legal
eligibility beyond facts supplied in the snapshot.
