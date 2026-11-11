# Production Readiness Review

## 1. Summary
- **Scope reviewed:** <diff range / files>
- **Review Depth:** <focused | standard | escalated>
- **Verdict:** PASSED / ATTENTION REQUIRED / REJECTED

## 2. Findings
<!-- Each finding needs a file:line anchor and a concrete failure scenario. A finding with no
     reproducible consequence is noise -- drop it. A MUST violation in the project standards or
     constitution is automatically CRITICAL. -->

| # | Severity | File:line | Finding | Failure scenario |
| :-- | :-- | :-- | :-- | :-- |
| 1 | CRITICAL / MAJOR / MINOR | | | |

## 3. Verification Performed
<!-- Verified, not assumed. State the evidence for each. -->

- [ ] Every changed hunk maps to a task in `tasks.md`
- [ ] Every spec scenario has a test that actually asserts it
- [ ] Unit suite run: PASS / FAIL — <evidence>
- [ ] E2E suite run: PASS / FAIL / EXCLUDED — <evidence>
- [ ] Performance thresholds: PASS / FAIL / EXCLUDED / DEFERRED — <evidence>
- [ ] Every exclusion's cited validation genuinely exists
- [ ] Living product and architecture ledgers match what the code now does
- [ ] Project standards file honoured

## 4. Artifact Plan Conformance
<!-- The plan was declared before the diff existed, so check it against the diff. "Written"
     comes from your dependency list, not from opening files. -->

| Artifact | Declared | Written | Diff evidence | Verdict |
| :-- | :-- | :-- | :-- | :-- |
| e2e-test | Include/Exclude | yes/no | <hunk confirming or refuting the reason> | OK / WRONGLY EXCLUDED / NOT EXECUTED |
| performance-test | | | | |
| business-specification | | | | |
| system-architecture | | | | |

## 5. Escalation
<!-- Record which reviewer binding ran this review. If depth is escalated (declared, or raised
     because the diff hit a high-risk trigger the proposal missed) and this is NOT the escalated
     reviewer, record a blocking finding: the review must be re-run on the escalated reviewer
     before archive. The escalated reviewer writes "None -- this is the escalated review". -->
