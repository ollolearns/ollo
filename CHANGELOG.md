# Changelog

All notable changes to Scaur are documented here. The project uses semantic
versioning while the protocol remains experimental.

## [Unreleased]

### Planned

- signed, freshness-bounded state inputs;
- durable multi-host permit consumption and reconciliation;
- isolated credential relay and operational monitoring.

## [0.7.0] - 2026-08-29

### Added

- deterministic policy evaluation and content-addressed decision receipts;
- short-lived permits bound to an exact order;
- durable, hash-chained JSONL event storage and replay protection;
- paper orders, target-weight rebalances, and persistent paper state;
- read-only public-equity research and multi-equity comparison tools;
- a local stdio MCP server for research, paper, and explicitly armed live modes;
- an experimental Robinhood equity limit-order relay with operator-selected
  account, policy, state, credentials, and session ceilings;
- boundary-focused tests, protocol documentation, security policy, repository
  templates, and continuous integration.

### Security

- live mode excludes authority-bearing configuration from agent-callable tool
  schemas;
- exact remote order arguments are bound into a single-use permit;
- paper mutation tools are unavailable while live mode is armed;
- OAuth material and local account state are ignored by source control.

[Unreleased]: ../../compare/v0.7.0...HEAD
[0.7.0]: ../../releases/tag/v0.7.0
