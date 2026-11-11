# End-to-End Test Plan

## 1. Journeys
<!-- One Given/When/Then story per journey. Each maps 1:1 to a named test in the e2e suite. -->

### Journey: <name>
- **GIVEN** <starting state>
- **WHEN** <action against the deployed instance>
- **THEN** <asserted status, headers, and body shape>
- **Test:** `<e2e dir>/<capability>.<ext>` :: `<test name>`

## 2. Environment
- **Target:** read from `BASE_URL` (or project equivalent). No hardcoded host, port, or token.
- **Seed data:** <what is created, and how it is torn down>
- **Secrets:** sourced from the environment

## 3. Exit Criteria
<!-- What must pass for this artifact to be considered satisfied. -->

