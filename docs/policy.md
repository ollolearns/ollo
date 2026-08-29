# Policy model

Scaur policies are explicit JSON inputs. The example policy defines:

- allowed venues;
- maximum order notional;
- maximum deviation between the limit price and reference price;
- maximum position concentration;
- maximum portfolio gross exposure;
- minimum cash after execution;
- maximum valuation age by asset class;
- minimum available liquidity by asset class;
- permit lifetime.

Every check evaluates the resulting portfolio, not just the isolated order.
For example, a buy may satisfy its order-size limit but still fail the
concentration or cash constraint.

## Numeric representation

Percentages are numbers from `0` through `100`. USD values are JSON numbers in
the reference implementation. This is acceptable for bounded paper examples,
not live settlement. Production implementations must use fixed-point integers
in the smallest supported unit and define rounding at every boundary.

## Versioning

Policies carry a schema version, human-readable identifier, and semantic
version. The complete document is hashed under the `scaur.policy.v1` domain.
Any field change therefore produces a different policy hash and different
decision identifier.

## State assumptions

The kernel trusts the supplied snapshot only as data; V0.3 does not authenticate
its origin. Production state must be signed, freshness-bounded, and tied to the
account and venue whose capital is being controlled.
