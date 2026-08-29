# Threat model

## Protected property

An untrusted portfolio proposal must not execute unless it matches an allowed,
unexpired, unconsumed permit produced from the configured policy and state.

## Trusted in V0.4

- local operating system and filesystem;
- process environment and system clock;
- policy document and state-snapshot origin;
- Node.js runtime;
- repository code and operator.

## Untrusted in V0.4

- portfolio proposals and target weights;
- attempts to alter an approved order;
- permit replay;
- missing, malformed, stale, or ineligible asset facts;
- concurrent use of one local event store.
- remote tool-list changes and malformed tool errors;
- missing, malformed, or internally inconsistent public-market research data;
- attempts to substitute market, notional, or altered venue orders.

## Enforced invariants

- denied decisions contain no permit;
- the permit intent hash must match the submitted order;
- expired or consumed permits fail closed;
- one local event store serializes permit consumption;
- every event commits to the previous event hash;
- the paper relay records consumption before fill creation.
- the live relay reviews before consumption and places only after consumption;
- the exact Robinhood order arguments are part of the permit-bound intent;
- live placement requires a deliberate operator arming phrase.

## Out of scope

Host compromise, OAuth-store theft, state forgery, ledger rollback, distributed
races, venue compromise, automatic reconciliation, and legal compliance are out
of scope. These are deployment requirements, not problems a local hash chain
can solve.
