# Robinhood MCP relay

Scaur 0.7 includes an experimental live relay for Robinhood's official Trading
MCP. It connects to `https://agent.robinhood.com/mcp/trading` over Streamable
HTTP and authenticates through Robinhood OAuth. Scaur never asks for or stores
the user's Robinhood password.

This adapter can place a real equity order. It is disabled unless the operator
invokes the live command with the exact confirmation phrase documented below.
It is not approved for unattended or material capital.

Robinhood documents the current product and tool surface in its
[Agentic Trading overview](https://robinhood.com/us/en/support/articles/agentic-trading-overview/)
and [Trading with your agent](https://robinhood.com/us/en/support/articles/trading-with-your-agent/)
pages. Scaur is independent and is not affiliated with Robinhood.

## Execution order

One invocation handles one order:

```text
policy + state + exact venue arguments
                  |
                  v
          deterministic evaluation
                  |
             ALLOW permit
                  |
        review_equity_order (no trade)
                  |
         consume permit atomically
                  |
         place_equity_order (live)
                  |
          hash-chained submission
```

The review happens before permit consumption. The live placement happens only
after consumption. If placement fails or the process crashes after consumption,
the permit remains spent and the operator must reconcile Robinhood order history
before attempting a replacement.

## One-command setup

Robinhood requires a primary individual account in good standing and creates a
separate Agentic account during OAuth onboarding. Run setup on a desktop:

```bash
npm run setup:robinhood -- \
  --robinhood-account-number YOUR_AGENTIC_ACCOUNT_NUMBER \
  --symbols AAPL,MSFT
```

The command prints a Robinhood authorization URL when needed and waits on a
loopback callback. It then validates the operator-supplied account and remote
tool surface; reads the portfolio, equity positions, quotes, and account-level
tradability; and creates a conservative policy, a fresh state snapshot, a
persistent ledger, and a private live-server config. It never calls an order
review or placement tool.

The remote quote schema does not provide displayed depth. Generated state marks
liquidity as `configured_order_cap`, bounded by the operator's maximum order
notional. That field is an execution budget, not measured market liquidity.
Setup fails closed when unsupported non-equity holdings would make the local
portfolio snapshot incomplete.

OAuth client registration, access tokens, refresh tokens, the PKCE verifier,
and transient OAuth state are stored in the selected JSON file with owner-only
mode where the operating system honors POSIX file permissions. `.scaur/` is
gitignored. Treat this file as a live brokerage credential: do not commit,
upload, paste, or share it. Revoke the connection from Robinhood if the host or
file may be compromised.

`.scaur/live-config.json` also contains the Agentic account number and is
sensitive local configuration. It is gitignored, but not encrypted.

Discover the current server-owned schemas after connecting:

```bash
node src/cli.js robinhood-tools \
  --oauth-store .scaur/robinhood-oauth.json
```

Scaur checks every required research and order tool at runtime instead of
assuming the server's tool list is permanent.

## Read-only equity research

The authenticated MCP server exposes `scaur_research_equity` and
`scaur_compare_equities` alongside the guarded order route. The first accepts
one public-equity symbol; the second accepts 2–5 symbols. Both call Robinhood's
quote, fundamentals, technical-indicator, and earnings tools. Scaur normalizes
the result into a timestamped evidence object and commits to that object with a
domain-separated SHA-256 hash.

The research call does not receive the Agentic account number, read account
holdings, review an order, or place an order. Its output is evidence for the
calling agent to interpret, not a trade recommendation or permission to trade.

## Live intent

The live relay intentionally supports a narrow first slice:

- dedicated logical account ID `robinhood-agentic`;
- venue `robinhood-mcp`;
- long equity limit orders only;
- quantity-based orders only;
- no market orders and no notional `amount` shortcut;
- the same exact arguments sent to review and placement.

Example intent shape:

```json
{
  "id": "operator-generated-unique-id",
  "accountId": "robinhood-agentic",
  "assetId": "AAPL",
  "side": "BUY",
  "quantity": 1,
  "limitPriceUsd": 100,
  "venue": "robinhood-mcp",
  "venueOrder": {
    "tool": "place_equity_order",
    "arguments": {
      "account_number": "YOUR-AGENTIC-ACCOUNT-NUMBER",
      "side": "buy",
      "symbol": "AAPL",
      "type": "limit",
      "quantity": "1",
      "limit_price": "100",
      "time_in_force": "gfd",
      "market_hours": "regular_hours"
    }
  }
}
```

Always compare the argument enums against `robinhood-tools`; Robinhood owns the
remote schema and may change it. Scaur rejects extra order fields. The
operator-supplied account number, symbol, side, quantity, order type, limit
price, time-in-force, and market-hours mode are validated before the policy is
evaluated. The entire `venueOrder` object is then included in the intent hash
and exact-order permit.

The policy must allow `robinhood-mcp`, and the state asset record must independently
confirm that venue. State freshness, price deviation, order notional, liquidity,
inventory, concentration, gross exposure, and minimum cash checks still run.

## Submit one live order

Review every input file first. This command can move real money:

```bash
node src/cli.js live-order \
  --policy ./policy.json \
  --state ./state.json \
  --intent ./intent.json \
  --ledger .scaur/live-events.jsonl \
  --robinhood-account-number "$SCAUR_ROBINHOOD_ACCOUNT_NUMBER" \
  --oauth-store .scaur/robinhood-oauth.json \
  --confirm LIVE_ROBINHOOD_ORDER
```

The CLI exits `2` on a policy denial and `1` on authorization, review,
consumption, transport, or placement failure. A successful response means the
order was submitted to Robinhood, not necessarily filled. Confirm final status
in Robinhood activity and reconcile the local ledger with venue order history.

## Expose bounded live orders to an agent

After setup, edit or review Scaur's portfolio rules directly in the terminal:

```bash
npm run configure
```

Press Enter to retain a current value. The editor synchronizes the policy with
the hard per-order, per-session, and order-count ceilings. Restart the server
after any edit.

For research without an order tool, start the read-only server:

```bash
npm run mcp:research
```

It exposes `scaur_status`, `scaur_research_equity`,
`scaur_compare_equities`, and `scaur_recent_events`. It does not register paper
mutation or live order tools.

After reviewing the configuration, expose the same review, permit, and placement
path as a local MCP tool:

```bash
npm run mcp:live
```

The connected agent receives the read-only `scaur_research_equity` and
`scaur_compare_equities` tools plus the guarded `scaur_live_order` tool, but
cannot choose the account, venue,
credentials, policy, state, ledger, clock, order type, or ceilings.
The operator supplies the dedicated Agentic account number outside the tool
schema; Scaur binds it into the request hash and redacts it from returned and
stored remote results.
Paper mutation tools are disabled for that process. Denied calls do not connect
to Robinhood.

After a permit is consumed, the state snapshot is marked used even if placement
fails or its result is ambiguous. Reconcile Robinhood activity and provide a
fresh state file before another attempt. The notional and count ceilings reset
on server restart; the consumed-state gate persists in the event ledger.

After reconciling Robinhood activity, refresh only the broker-derived state.
This preserves the policy, config, and audit ledger:

```bash
npm run refresh:robinhood
```

See [the MCP server guide](mcp-server.md) for the complete tool contract and
client configuration.

## Remaining production boundary

This adapter makes the integration real; it does not make the whole system
production-safe. Version 0.7 still trusts local policy and state files, a local
host, the system clock, and a single-host JSONL lock. Setup constructs state
from authenticated Robinhood reads, but it does not sign or independently
attest that local snapshot. Scaur does not yet use an ACID multi-host permit
store, isolate tokens in an OS keychain or separate relay service, reconcile
orders automatically, or provide a kill-switch daemon and operational alerts.

Use a separately funded Agentic account with a deliberately small balance.
Independent security and legal review remain requirements before unattended or
material use.
