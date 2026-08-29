# Scaur

[![Node.js 20.10+](https://img.shields.io/badge/node-%3E%3D20.10-417E38)](package.json)
[![License: MIT](https://img.shields.io/badge/license-MIT-2A2620)](LICENSE)

**Deterministic financial controls and guarded MCP execution for autonomous agents.**

[Documentation](docs/architecture.md) · [Security](SECURITY.md) · [X / @scaurlayer](https://x.com/scaurlayer)

Scaur is an open-source control layer for financial agents. It exposes public-equity
research, deterministic portfolio policy, paper execution, and an explicitly armed
route to Robinhood's official Trading MCP.

The central rule is simple: the model may propose an action, but it cannot choose
the account, credentials, policy, state, venue, or execution limits that authorize
the action.

> Scaur is experimental software, not a broker, fund, wallet, trading venue, or
> source of investment advice. Paper mode is the default. Live mode can submit
> real orders and is not approved for unattended or material capital.

## What is implemented

| Surface | Status | Authority |
| --- | --- | --- |
| Public-equity research | Built | Public market data only |
| Multi-equity comparison | Built | Public market data only |
| Deterministic policy evaluation | Built | Reads explicit policy and state |
| Paper orders and rebalances | Built | Local paper state only |
| Hash-chained event history | Built | Local JSONL ledger |
| Exact-order permits | Built | Short-lived and single-use |
| Robinhood equity limit orders | Experimental | Operator-armed and ceiling-bound |
| Production custody and reconciliation | Not built | — |
| Multi-host atomic state | Not built | — |
| Robinhood Chain settlement adapters | Not built | — |

Scaur produces inspectable records rather than a simulated dashboard:

- timestamped, hash-addressed research evidence;
- allow or deny receipts containing every policy check;
- short-lived permits bound to one exact order;
- a hash-chained event history for replay and audit;
- submission receipts for the guarded live route.

## Control path

```text
agent proposes an order
          │
          ▼
┌──────────────────────────┐
│          Scaur           │
│  policy + state + limits │
└──────────────────────────┘
          │
          ├── denied ──────► decision receipt / stop
          │
          └── allowed ─────► exact-order permit
                                      │
                                      ▼
                              credentialed relay
```

Changing the symbol, side, quantity, limit price, account, or route changes the
intent hash and invalidates the permit. A consumed permit cannot be reused.

## Requirements

- Node.js 20.10 or newer
- npm 10 or newer
- Robinhood OAuth only for authenticated research or the experimental live route

## Quickstart

Install from a clean checkout and run the complete test suite:

```bash
npm ci
npm test
```

Run one deterministic policy evaluation:

```bash
npm run demo
```

Run an end-to-end paper rebalance with a temporary durable ledger:

```bash
npm run demo:cycle
```

The CLI exits `0` when all evaluated orders are allowed, `2` when policy denies
an order, `64` for invalid usage, and `1` for an operational error.

## MCP modes

Scaur runs as a local stdio MCP server in three deliberately separate modes.

| Mode | Tools | Mutation |
| --- | --- | --- |
| Research | status, equity research, comparison, recent events | None |
| Paper | status, checks, paper orders, rebalances, recent events | Local paper state |
| Live | status, research, comparison, one guarded order route, recent events | Real submission within fixed ceilings |

### Research first

Complete the read-only setup described in
[the Robinhood guide](docs/robinhood-mcp.md), then start:

```bash
npm run mcp:research
```

The connected agent receives `scaur_status`, `scaur_research_equity`,
`scaur_compare_equities`, and `scaur_recent_events`. Research tools do not read
portfolio data or register an order tool.

### Local paper mode

Copy the example state into the ignored local state directory:

```bash
mkdir .scaur
cp examples/state.json .scaur/paper-state.json
```

Then start the server:

```bash
node src/mcp-server.js \
  --policy examples/policy.json \
  --state .scaur/paper-state.json \
  --ledger .scaur/mcp-events.jsonl \
  --account paper-fund-01
```

See [the MCP server guide](docs/mcp-server.md) for client configuration and the
exact tool schemas.

### Experimental live mode

Set up a dedicated Robinhood Agentic account without placing an order:

```bash
npm run setup:robinhood -- \
  --robinhood-account-number YOUR_AGENTIC_ACCOUNT_NUMBER \
  --symbols AAPL,MSFT
```

Setup verifies the authenticated tools, reads the selected account, and creates
private files under `.scaur/` with small default ceilings. Review the generated
policy and [security model](SECURITY.md) before starting live mode:

```bash
npm run mcp:live
```

This grants the connected agent bounded order-submission authority without a new
human confirmation for every call. A successful tool result means **submitted**,
not filled. Reconcile venue activity before reusing live state.

## Repository map

```text
src/evaluate.js       decision receipt assembly
src/policy.js         deterministic portfolio constraints
src/permit.js         exact-order permit lifecycle
src/store.js          hash-chained JSONL event store
src/portfolio.js      target-weight planning and state updates
src/paper.js          end-to-end paper execution
src/research.js       normalized public-equity evidence
src/live.js           guarded review, consume, and submit sequence
src/mcp.js            agent-facing MCP tools
src/mcp-server.js     stdio MCP entrypoint
src/robinhood.js      OAuth transport and venue adapter
src/cli.js            command-line interface
examples/             synthetic policy, state, target, and intent inputs
test/                 boundary, replay, persistence, and MCP tests
docs/                 protocol, operations, and security documentation
site/                 static product and architecture site
```

## Documentation

- [Architecture](docs/architecture.md)
- [MCP server](docs/mcp-server.md)
- [Policy model](docs/policy.md)
- [Receipts and permits](docs/receipts.md)
- [Paper-mode contract](docs/paper-mode.md)
- [Robinhood MCP adapter](docs/robinhood-mcp.md)
- [Threat model](docs/threat-model.md)
- [Roadmap](docs/roadmap.md)

## Development

```bash
npm ci
npm test
npm run demo
npm run demo:cycle
```

Changes to policy, permits, live routing, or serialized protocol objects must
include boundary tests and matching documentation. Read
[CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## Security

Never commit `.scaur/`, OAuth tokens, account identifiers, private market data,
or real portfolio records. Report vulnerabilities privately according to
[SECURITY.md](SECURITY.md).

## License

Released under the [MIT License](LICENSE).

Scaur is independent and is not affiliated with Robinhood.
