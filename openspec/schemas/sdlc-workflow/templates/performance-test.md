# Performance & Load Plan

## 1. Service Level Indicators
<!-- Target what THIS code should achieve, not a platform-wide SLO. For a path with no external
     dependency, the error-rate threshold is 0.00%. Every SLI below is encoded as a tool
     threshold so a breach fails the run. -->

| SLI | Threshold | Rationale |
| :-- | :-- | :-- |
| | | |

## 2. Scenarios
| Scenario | Load | Duration | Purpose |
| :-- | :-- | :-- | :-- |
| smoke | 1 user | ~30s | sanity |
| sustained | ramped | | baseline figure |
| soak | | | leak detection |
| spike | | | burst tolerance |

## 3. Measurement Caveats
- Build configuration: <release/optimized; never a debug or dev-server run>
- Host spec:
- Load generator location: <not on the machine under test>
- Warm-up discarded via: <ramp stages or explicit discard window>
- Measured: <in-cluster | across ingress>

## 4. Baseline Results
<!-- `_pending_` until a run actually happens. NEVER record a target as an observed result. -->

| Scenario | P95 | P99 | Error rate | Build / host | Date |
| :-- | :-- | :-- | :-- | :-- | :-- |
| smoke | _pending_ | | | | |
| sustained | _pending_ | | | | |

