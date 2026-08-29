# Security policy

## Supported versions

Scaur is pre-production software. Security fixes are applied only to the
latest commit on `main`.

## Current threat model

Version 0.7 assumes a trusted local host and untrusted portfolio proposals. The
kernel is designed to prevent a proposal from silently expanding its own
authority. It checks explicit policy and state inputs, binds permits to exact
orders, expires them, and records single-use consumption in a hash-chained
ledger.

The experimental Robinhood MCP bridge additionally assumes that the local OAuth
store, policy file, state file, event ledger, operator, and Robinhood Agentic
account are trustworthy. It binds the exact remote limit-order arguments into
the permit and never stores OAuth tokens in the event ledger.

Live MCP mode requires an exact operator activation value and explicit ceilings
for order notional, session notional, and order count. The agent cannot change
those values or select the account, venue, credentials, policy, state, ledger,
order type, or time-in-force. Paper mutation tools are unavailable while the
server is live-armed. Once a state snapshot reaches permit consumption, that
snapshot cannot authorize another live attempt; the operator must reconcile
Robinhood activity and provide fresh state.

Robinhood's Agentic account number is required as operator configuration and is
bound into the remote-argument hash. It is not exposed in the agent-callable
schema; known account identifier fields and exact account-number strings are
redacted from stored and returned remote results.

The in-memory session ceilings reset when the MCP server restarts. The
fresh-state gate is reconstructed from the event ledger and survives restarts.
Neither control makes a forged or stale local state file trustworthy.

The reference implementation does **not** defend against a compromised host,
malicious administrator, forged state snapshot, filesystem rollback, stolen
signing key, multi-host race, or compromised execution venue.

## Not approved for unattended or material capital

Version 0.7 contains explicitly armed CLI and agent-callable MCP paths capable
of placing real equity orders through Robinhood's dedicated Agentic account.
After live MCP startup, a connected agent can place orders within the configured
ceilings without a separate human confirmation for each order. Use only a small,
separately funded account while evaluating the integration. A production
deployment requires at least:

- authenticated callers and signed, freshness-bounded state snapshots;
- fixed-point monetary arithmetic and a formally versioned wire protocol;
- an ACID database with atomic permit consumption across hosts;
- independent key custody and an isolated credentialed relay;
- idempotent order submission and venue reconciliation;
- rate limits, observability, incident response, backups, and recovery drills;
- external security review and jurisdiction-specific legal review.

Do not paste Robinhood credentials, OAuth authorization codes, access tokens,
refresh tokens, account data, or `.scaur/robinhood-oauth.json` into issues,
commits, chat, logs, or support messages. Revoke Robinhood access immediately if
the OAuth store or its host may be compromised.

## Reporting a vulnerability

Use **Security → Report a vulnerability** in this repository to open a private
advisory. Include the affected revision, impact, prerequisites, and the smallest
synthetic reproduction you can provide.

Do not place exploit details, credentials, account data, or private market
information in a public issue. If private reporting is unavailable, contact a
maintainer without sending the sensitive details and request a private channel.
