# Scaur MCP server

Scaur runs as a local stdio MCP server in one of three modes. Paper mode is the
default. Robinhood research mode is authenticated but read-only. Live mode is a
separate, explicitly armed process that can submit real equity limit orders
through Robinhood's official Trading MCP.

The operator, not the calling agent, fixes the policy, state, ledger, account,
clock, OAuth store, and live ceilings when the server starts. No mode exposes
arbitrary file access or a tool for changing policy.

## Paper-mode tools

| Tool | Effect |
| --- | --- |
| `scaur_status` | Reads the policy identity, paper portfolio, asset facts, and ledger health. |
| `scaur_check_order` | Records an allow or deny receipt for one exact order without filling it. |
| `scaur_paper_order` | Checks, consumes, records a paper fill, and persists paper state. |
| `scaur_rebalance` | Converts target weights into paper orders and applies the same permit path. |
| `scaur_recent_events` | Reads records from the verified hash-chained ledger. |

The calling agent supplies an asset, side, quantity, limit price, optional
correlation ID, or target weights. Scaur injects the configured paper account
and venue and uses its own current time.

## Prepare paper mode

Never point the server at `examples/state.json` directly because paper tools
persist state. Copy it into the ignored `.scaur` directory and refresh its
valuations before use.

```powershell
New-Item -ItemType Directory -Force .scaur
Copy-Item examples/state.json .scaur/paper-state.json
node src/mcp-server.js `
  --policy examples/policy.json `
  --state .scaur/paper-state.json `
  --ledger .scaur/mcp-events.jsonl `
  --account paper-fund-01
```

## Robinhood research-mode tools

| Tool | Effect |
| --- | --- |
| `scaur_status` | Reports read-only research mode and supplied portfolio facts. |
| `scaur_research_equity` | Reads public Robinhood quotes, fundamentals, RSI, and earnings. |
| `scaur_compare_equities` | Compares 2–5 equities with complete evidence and a combined hash. |
| `scaur_recent_events` | Reads records from the verified hash-chained ledger. |

After Robinhood setup, start this mode with:

```powershell
npm run mcp:research
```

Neither paper mutation nor live order tools are registered. The research tools
accept only public symbols and never receive the Agentic account number.

## Live-mode tools

| Tool | Effect |
| --- | --- |
| `scaur_status` | Reads policy, supplied portfolio facts, ledger health, and remaining session capacity. |
| `scaur_research_equity` | Reads public Robinhood quotes, fundamentals, RSI, and earnings; never places an order. |
| `scaur_compare_equities` | Compares 2–5 equities using only public market data. |
| `scaur_live_order` | Evaluates, reviews, consumes, and submits one bounded equity limit order. |
| `scaur_recent_events` | Reads records from the verified hash-chained ledger. |

Paper mutation tools are not registered in live mode. The research tools accept
only equity symbols. They use public market-data calls and never receive the
account number or an order route. For a live order, the agent can provide only
`ticker`, `side`, `quantity`, `limitPriceUsd`, `timeInForce: "gfd"`, and an
optional `intentId`. The server fixes:

- account `robinhood-agentic`;
- the Robinhood Agentic account number;
- venue `robinhood-mcp`;
- tool `place_equity_order`;
- order type `limit` and time-in-force `gfd`;
- policy, state, ledger, OAuth path, clock, and session ceilings.

The live slice supports quantity-based long equity limit orders only. It does
not support options, crypto, tokenized private assets, market orders, notional
shortcuts, or short selling.

## Research an equity

After authenticated setup, a connected agent can call:

```json
{
  "name": "scaur_research_equity",
  "arguments": { "symbol": "AAPL" }
}
```

Scaur calls `get_equity_quotes`, `get_equity_fundamentals`,
`get_equity_technical_indicators` for a 14-day RSI, and
`get_earnings_results`. The response includes normalized price context,
52-week range, valuation, relative volume, RSI, earnings history, the next
verified earnings date when available, source timestamps, and an evidence hash.
It is market evidence, not a recommendation. No review or placement tool is
called.

To compare several names without repeated agent round trips:

```json
{
  "name": "scaur_compare_equities",
  "arguments": { "symbols": ["AAPL", "MSFT", "GOOGL"] }
}
```

The response retains every per-symbol research object, adds a compact
side-by-side view, and hashes the combined evidence. Symbols are deduplicated
and the call is limited to five names.

## Prepare Robinhood modes

Run setup from an interactive terminal. It authenticates with Robinhood,
requires the exact operator-supplied Agentic account number, verifies that the
account is accessible to this agent, and calls only read tools. Setup does not
review or place an order.

```powershell
npm run setup:robinhood -- `
  --robinhood-account-number YOUR_AGENTIC_ACCOUNT_NUMBER `
  --symbols AAPL,MSFT
```

The command reads `get_accounts`, `get_portfolio`, `get_equity_positions`,
`get_equity_quotes`, and `get_equity_tradability`. It writes the OAuth store,
policy, broker-derived state, persistent ledger, and live server configuration
under `.scaur/`. Existing equity positions are included automatically;
`--symbols` adds equities that are not currently held.

The generated policy defaults to $25 per order, a $75 session ceiling, and no
more than three orders. Quote freshness, a 1% limit-price band, concentration,
gross exposure, cash, inventory, and tradability checks remain active. Review
`.scaur/live-policy.json` before starting the server.

Edit Scaur's portfolio rules from the terminal with an interactive prompt. Press Enter to
keep any current value:

```powershell
npm run configure
```

The command updates the policy and hard live-session ceilings together. Restart
the live server after every configuration change.

Robinhood's quote tool does not expose displayed market depth. The generated
snapshot therefore sets `availableLiquidityUsd` to the smaller operator-defined
order ceiling and records `liquidityBasis: "configured_order_cap"`. This is a
fail-closed execution budget, not a claim about market liquidity. Setup also
fails when non-equity holdings would make the supported portfolio snapshot
incomplete.

Start the read-only research server from its private local config:

```powershell
npm run mcp:research
```

This process does not register `scaur_live_order`. To delegate bounded real
order authority instead, stop it and start the live server:

```powershell
npm run mcp:live
```

Environment alternatives are `SCAUR_LIVE_ROUTING`,
`SCAUR_ROBINHOOD_ACCOUNT_NUMBER`, `SCAUR_ROBINHOOD_OAUTH_STORE`,
`SCAUR_LIVE_MAX_ORDER_NOTIONAL_USD`,
`SCAUR_LIVE_MAX_SESSION_NOTIONAL_USD`, and `SCAUR_LIVE_MAX_ORDERS`, plus the
paper-mode path variables described below. Supplying any live option without
the exact activation value fails startup.

Starting this process delegates real order-submission authority to the connected
agent within the configured ceilings. Robinhood may not request a separate human
confirmation for each order. Keep the Agentic account separately funded and the
ceilings deliberately small.

The Agentic account number must be copied by the operator from the dedicated
account; Scaur never defaults it from `get_accounts`. Setup stores it only in
`.scaur/live-config.json`, which is gitignored but not encrypted. Never commit,
upload, paste, or share `.scaur/`. Scaur binds it into the exact remote argument
hash but redacts known account fields and the configured number from responses
and event bodies.

## Fresh-state and restart behavior

Scaur records the state hash used for each live decision. After a permit is
consumed, including when placement fails or its result is ambiguous, that state
cannot authorize another live attempt. Inspect Robinhood activity, reconcile the
submitted order, and replace the state file with a fresh snapshot before calling
the tool again. After reconciling Robinhood activity, refresh only the state:

```powershell
npm run refresh:robinhood
```

Order-count and notional ceilings are in-memory session controls and reset when
the server restarts. The fresh-state gate is rebuilt from the ledger and survives
restarts. Do not treat a restart as a safe way to increase authority.

A successful `scaur_live_order` response means Robinhood accepted the submission,
not that it filled. Final status must be checked in Robinhood activity.

## Connect an MCP client

Use absolute paths in the client's configuration. A paper-mode Windows example:

```json
{
  "mcpServers": {
    "scaur": {
      "command": "node",
      "args": [
        "C:\\absolute\\path\\to\\scaur\\src\\mcp-server.js",
        "--policy",
        "C:\\absolute\\path\\to\\scaur\\examples\\policy.json",
        "--state",
        "C:\\absolute\\path\\to\\scaur\\.scaur\\paper-state.json",
        "--ledger",
        "C:\\absolute\\path\\to\\scaur\\.scaur\\mcp-events.jsonl",
        "--account",
        "paper-fund-01"
      ]
    }
  }
}
```

The common paths may instead be supplied through `SCAUR_POLICY_PATH`,
`SCAUR_STATE_PATH`, `SCAUR_LEDGER_PATH`, and `SCAUR_ACCOUNT_ID`.
`SCAUR_MIN_TRADE_NOTIONAL_USD` is optional and defaults to `100`.

The process speaks MCP over stdin/stdout. A manually started terminal appears
idle after the startup message; an MCP client normally launches the process.

For the generated live config, point the client at `src/mcp-server.js` with
`--config C:\absolute\path\to\scaur\.scaur\live-config.json`. The config file
contains the private account number, while the agent-facing tool schema does not.

## Current boundary

Live MCP mode makes Scaur callable real-money infrastructure, but not
production-safe infrastructure. It still trusts local files, the host, and the
operator. Setup derives state through authenticated Robinhood reads, but the
resulting local file is not signed or independently attested. Scaur still lacks
automatic order reconciliation,
multi-host transactional permit storage, and isolated credential custody; and
has not received an independent security review. It is not approved for
unattended or material capital.
