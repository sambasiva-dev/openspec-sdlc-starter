## Why

<!-- The problem or opportunity, in 1-2 sentences. Why now? -->

## What Changes

<!-- New capabilities, modifications, removals. Mark breaking changes **BREAKING**. -->

## Capabilities

### New Capabilities
<!-- Each creates specs/<capability-path>/spec.md. Kebab-case new path segments. -->
- `<capability-path>`: <what this capability covers>

### Modified Capabilities
<!-- Existing capabilities whose REQUIREMENTS change. Use the exact path under openspec/specs/.
     Leave empty if none. A change with no capabilities must set skip_specs: true in
     .openspec.yaml, or openspec validate rejects it. Never invent a requirement to pass validation. -->
- `<existing-capability-path>`: <which requirement changes>

## Impact

<!-- Affected code, interfaces, dependencies, systems -->

## Artifact Plan

<!-- Which post-apply artifacts this change produces. Keep all four rows and the Review Depth
     line verbatim -- downstream agents grep them. Decision is exactly one word: Include or
     Exclude. Reason is one line naming the risk trigger hit, or why none applies. Exclude means
     NO file is written at all, so that line is the entire record of the decision.
     final-code-review is not listed: it always runs, at the depth set below. -->

| Artifact | Decision | Reason |
| :-- | :-- | :-- |
| e2e-test | Include | |
| performance-test | Include | |
| business-specification | Include | |
| system-architecture | Include | |

**Review Depth:** standard

<!-- focused   = diff-scope audit only (hunk-to-task, plan conformance, cited validation exists)
     standard  = full production-readiness review
     escalated = full review on the escalated (Opus) reviewer -->
